import { create } from 'zustand';
import type { FriendRequest } from '../types';

interface NotificationState {
  ws: WebSocket | null;
  friendRequests: FriendRequest[];
  roomUnreads: Record<number, number>;
  toasts: { id: number; message: string; type: 'info' | 'success' | 'warning' }[];
  onNewMessage?: (roomId: number, unreadCount: number) => void;
  connectNotifications: (token: string) => void;
  disconnectNotifications: () => void;
  addFriendRequest: (req: FriendRequest) => void;
  removeFriendRequest: (friendshipId: number) => void;
  setRoomUnread: (roomId: number, count: number) => void;
  addToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
  removeToast: (id: number) => void;
  setNewMessageCallback: (cb: (roomId: number, unreadCount: number) => void) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  ws: null,
  friendRequests: [],
  roomUnreads: {},
  toasts: [],
  onNewMessage: undefined,

  connectNotifications: (token) => {
    const { ws } = get();
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    if (ws) { try { ws.close(); } catch {} }

    const socket = new WebSocket(`ws://localhost:8000/api/v1/user-chat/notifications?token=${token}`);
    let pingInterval: ReturnType<typeof setInterval> | null = null;

    socket.onopen = () => {
      pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        } else {
          if (pingInterval) clearInterval(pingInterval);
        }
      }, 25000);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'friend_request') {
          const req: FriendRequest = {
            friendship_id: payload.data.friendship_id,
            id: payload.data.from_user_id,
            username: payload.data.from_username,
            email: payload.data.from_email,
          };
          set((s) => ({ friendRequests: [...s.friendRequests, req] }));
          get().addToast(`👋 ${payload.data.from_username}님이 친구 요청을 보냈습니다.`, 'info');

        } else if (payload.type === 'friend_accepted') {
          get().addToast(`✅ ${payload.data.username}님이 친구 요청을 수락했습니다.`, 'success');

        } else if (payload.type === 'friend_rejected') {
          get().addToast(`${payload.data.username}님이 친구 요청을 거절했습니다.`, 'warning');

        } else if (payload.type === 'new_message') {
          const { room_id, room_name, sender, content, unread_count } = payload.data;
          set((s) => ({ roomUnreads: { ...s.roomUnreads, [room_id]: unread_count } }));
          const cb = get().onNewMessage;
          if (cb) cb(room_id, unread_count);
          get().addToast(`💬 ${room_name}\n${sender}: ${content}`, 'info');

        } else if (payload.type === 'room_unread_update') {
          set((s) => ({ roomUnreads: { ...s.roomUnreads, [payload.data.room_id]: payload.data.unread_count } }));
          const cb = get().onNewMessage;
          if (cb) cb(payload.data.room_id, payload.data.unread_count);

        } else if (payload.type === 'profile_update') {
          // 친구의 프로필 변경 → profileStore 업데이트
          const { user_id, username, profile_image, status_message } = payload.data;
          // 동적 import 대신 직접 업데이트
          import('../stores/profileStore').then(({ useProfileStore }) => {
            useProfileStore.getState().updateFriendStatus(user_id, {
              is_online: useProfileStore.getState().friendsStatus[user_id]?.is_online,
              status_message,
              profile_image,
            });
          });
        }
      } catch {}
    };

    socket.onclose = () => {
      if (pingInterval) clearInterval(pingInterval);
      set({ ws: null });
    };
    socket.onerror = () => {
      if (pingInterval) clearInterval(pingInterval);
      set({ ws: null });
    };

    set({ ws: socket });
  },

  disconnectNotifications: () => {
    const { ws } = get();
    if (ws) { try { ws.close(); } catch {} set({ ws: null }); }
  },

  setNewMessageCallback: (cb) => set({ onNewMessage: cb }),
  addFriendRequest: (req) => set((s) => ({ friendRequests: [...s.friendRequests, req] })),
  removeFriendRequest: (friendshipId) => set((s) => ({ friendRequests: s.friendRequests.filter((r) => r.friendship_id !== friendshipId) })),
  setRoomUnread: (roomId, count) => set((s) => ({ roomUnreads: { ...s.roomUnreads, [roomId]: count } })),

  addToast: (message, type = 'info') => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 5000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
