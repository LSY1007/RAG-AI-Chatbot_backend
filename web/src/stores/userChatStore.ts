import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserChatRoom, UserMessage, Reaction } from '../types';
import { userChatApi } from '../api';

interface TypingUser { user_id: number; username: string; }

interface UserChatState {
  rooms: UserChatRoom[];
  currentRoom: UserChatRoom | null;
  messages: UserMessage[];
  isConnected: boolean;
  onlineCount: number;
  isUploading: boolean;
  ws: WebSocket | null;
  unreadCounts: Record<number, number>;
  typingUsers: TypingUser[];          // 타이핑 중인 유저들
  fetchRooms: () => Promise<void>;
  createRoom: (name: string, description?: string) => Promise<void>;
  joinRoom: (room: UserChatRoom) => Promise<void>;
  leaveRoom: () => Promise<void>;
  connectWs: (roomId: number, token: string) => void;
  disconnectWs: () => void;
  sendMessage: (content: string, replyToId?: number) => void;
  sendTyping: () => void;
  sendStopTyping: () => void;
  uploadFile: (file: File) => Promise<void>;
  addMessage: (msg: UserMessage) => void;
  clearUnread: (roomId: number) => void;
  updateMessageReadStatus: (messageIds: number[]) => void;
  editMessageLocal: (messageId: number, content: string, editedAt: string) => void;
  deleteMessageLocal: (messageId: number) => void;
  updateReactions: (messageId: number, reactions: Reaction[], userId: number, emoji: string, action: string) => void;
}

export const useUserChatStore = create<UserChatState>()(
  persist(
    (set, get) => ({
      rooms: [], currentRoom: null, messages: [],
      isConnected: false, onlineCount: 0, isUploading: false,
      ws: null, unreadCounts: {}, typingUsers: [],

      fetchRooms: async () => {
        try {
          const rooms = await userChatApi.getRooms();
          const unreadCounts: Record<number, number> = {};
          rooms.forEach((r: any) => { unreadCounts[r.id] = r.unread_count || 0; });
          set({ rooms, unreadCounts });
        } catch {}
      },

      createRoom: async (name, description) => {
        await userChatApi.createRoom(name, description);
        await get().fetchRooms();
      },

      joinRoom: async (room) => {
        const { currentRoom, ws } = get();
        if (currentRoom?.id === room.id && ws?.readyState === WebSocket.OPEN) { get().clearUnread(room.id); return; }
        try { await userChatApi.joinRoom(room.id); } catch {}
        const messages = await userChatApi.getMessages(room.id);
        set({ currentRoom: room, messages, typingUsers: [] });
        get().clearUnread(room.id);
        try { await userChatApi.markRoomRead(room.id); } catch {}
        await get().fetchRooms();
      },

      leaveRoom: async () => {
        const { currentRoom, ws } = get();
        if (ws) { try { ws.close(); } catch {} }
        if (currentRoom) { try { await userChatApi.leaveRoom(currentRoom.id); } catch {} }
        set({ currentRoom: null, messages: [], isConnected: false, ws: null, onlineCount: 0, typingUsers: [] });
        await get().fetchRooms();
      },

      connectWs: (roomId, token) => {
        const { ws } = get();
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
        if (ws) { try { ws.close(); } catch {} }

        const socket = new WebSocket(`ws://localhost:8000/api/v1/user-chat/ws/${roomId}?token=${token}`);
        let pingInterval: ReturnType<typeof setInterval> | null = null;

        socket.onopen = () => {
          set({ isConnected: true });
          pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' }));
            else if (pingInterval) clearInterval(pingInterval);
          }, 25000);
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const { type, data } = payload;

            if (type === 'message') {
              // 메시지 받으면 해당 유저 타이핑 상태 해제
              set(s => ({ messages: [...s.messages, data], typingUsers: s.typingUsers.filter(u => u.user_id !== data.user_id) }));
            } else if (type === 'system') {
              set(s => ({ messages: [...s.messages, { id: Date.now(), user_id: 0, username: 'system', content: data.content, message_type: 'system' as any, created_at: new Date().toISOString() }] }));
              if (data.online_count !== undefined) set({ onlineCount: data.online_count });
            } else if (type === 'messages_read') {
              get().updateMessageReadStatus(data.message_ids);
            } else if (type === 'message_edited') {
              get().editMessageLocal(data.id, data.content, data.edited_at);
            } else if (type === 'message_deleted') {
              get().deleteMessageLocal(data.id);
            } else if (type === 'reaction_updated') {
              get().updateReactions(data.message_id, data.reactions, data.user_id, data.emoji, data.action);
            } else if (type === 'typing') {
              set(s => {
                const already = s.typingUsers.some(u => u.user_id === data.user_id);
                if (already) return s;
                return { typingUsers: [...s.typingUsers, { user_id: data.user_id, username: data.username }] };
              });
              // 3초 후 자동 제거
              setTimeout(() => {
                set(s => ({ typingUsers: s.typingUsers.filter(u => u.user_id !== data.user_id) }));
              }, 3000);
            } else if (type === 'stop_typing') {
              set(s => ({ typingUsers: s.typingUsers.filter(u => u.user_id !== data.user_id) }));
            }
          } catch {}
        };

        socket.onclose = (e) => {
          if (pingInterval) clearInterval(pingInterval);
          set({ isConnected: false });
          if (e.code !== 1000 && e.code !== 4001 && e.code !== 4003) {
            const t = sessionStorage.getItem('access_token');
            if (t) setTimeout(() => { const { currentRoom } = useUserChatStore.getState(); if (currentRoom?.id === roomId) useUserChatStore.getState().connectWs(roomId, t); }, 3000);
          }
        };
        socket.onerror = () => { if (pingInterval) clearInterval(pingInterval); set({ isConnected: false }); };
        set({ ws: socket });
      },

      disconnectWs: () => { const { ws } = get(); if (ws) { try { ws.close(); } catch {} set({ ws: null, isConnected: false }); } },

      sendMessage: (content, replyToId) => {
        const { ws } = get();
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: 'message', content, reply_to_id: replyToId || null }));
      },

      sendTyping: () => {
        const { ws } = get();
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: 'typing' }));
      },

      sendStopTyping: () => {
        const { ws } = get();
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: 'stop_typing' }));
      },

      uploadFile: async (file) => {
        const { currentRoom } = get();
        if (!currentRoom) return;
        if (file.size > 10 * 1024 * 1024) throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
        set({ isUploading: true });
        try { await userChatApi.uploadFile(currentRoom.id, file); set({ isUploading: false }); }
        catch (err: any) { set({ isUploading: false }); throw new Error(err.response?.data?.detail || '업로드 실패'); }
      },

      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

      clearUnread: (roomId) => set((s) => ({
        unreadCounts: { ...s.unreadCounts, [roomId]: 0 },
        rooms: s.rooms.map(r => r.id === roomId ? { ...r, unread_count: 0 } : r),
      })),

      updateMessageReadStatus: (messageIds) => set((s) => ({
        messages: s.messages.map(msg => {
          if (!messageIds.includes(msg.id)) return msg;
          const newReadCount = (msg.read_count || 0) + 1;
          return { ...msg, read_count: newReadCount, is_read: newReadCount >= (msg.readers_needed || 1) };
        }),
      })),

      editMessageLocal: (messageId, content, editedAt) => set((s) => ({
        messages: s.messages.map(msg => msg.id === messageId ? { ...msg, content, edited_at: editedAt } : msg),
      })),

      deleteMessageLocal: (messageId) => set((s) => ({
        messages: s.messages.map(msg => msg.id === messageId ? { ...msg, is_deleted: true, content: '삭제된 메시지입니다.' } : msg),
      })),

      updateReactions: (messageId, reactions, userId, emoji, action) => set((s) => ({
        messages: s.messages.map(msg => {
          if (msg.id !== messageId) return msg;
          const myReactions = msg.my_reactions || [];
          const newMyReactions = action === 'added' ? [...new Set([...myReactions, emoji])] : myReactions.filter(e => e !== emoji);
          return { ...msg, reactions, my_reactions: newMyReactions };
        }),
      })),
    }),
    {
      name: 'user-chat-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ unreadCounts: state.unreadCounts }),
    }
  )
);
