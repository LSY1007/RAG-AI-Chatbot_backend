import { create } from 'zustand';
import type { ChatRoom, ChatMessage, Document } from '../types';
import { chatApi, documentApi } from '../api';

interface ChatState {
  rooms: ChatRoom[];
  currentRoomId: number | null;
  messages: ChatMessage[];
  documents: Document[];
  personas: any[];
  isLoading: boolean;
  isSending: boolean;
  isStreaming: boolean;
  isUploading: boolean;
  isSummarizing: boolean;
  streamingContent: string;
  fetchRooms: () => Promise<void>;
  fetchPersonas: () => Promise<void>;
  selectRoom: (roomId: number) => Promise<void>;
  sendMessage: (question: string) => Promise<void>;
  newChat: () => Promise<void>;
  deleteRoom: (roomId: number) => Promise<void>;
  updateRoomSettings: (roomId: number, settings: any) => Promise<ChatRoom>;
  summarizeRoom: (roomId: number) => Promise<string>;
  fetchDocuments: (roomId: number) => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  deleteDocument: (documentId: number) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  currentRoomId: null,
  messages: [],
  documents: [],
  personas: [],
  isLoading: false,
  isSending: false,
  isStreaming: false,
  isUploading: false,
  isSummarizing: false,
  streamingContent: '',

  fetchPersonas: async () => {
    try { set({ personas: await chatApi.getPersonas() }); } catch {}
  },

  fetchRooms: async () => {
    try { set({ rooms: await chatApi.getRooms() }); } catch {}
  },

  selectRoom: async (roomId) => {
    set({ isLoading: true, currentRoomId: roomId, documents: [], streamingContent: '' });
    try {
      const [messages, documents] = await Promise.all([
        chatApi.getHistory(roomId),
        documentApi.getDocuments(roomId),
      ]);
      set({ messages, documents, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  sendMessage: async (question) => {
    const { currentRoomId } = get();
    const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: question };
    set(s => ({ messages: [...s.messages, userMsg], isSending: true, isStreaming: false, streamingContent: '' }));

    const token = sessionStorage.getItem('access_token');
    if (!token) { set({ isSending: false }); return; }

    try {
      const response = await fetch('http://localhost:8000/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, room_id: currentRoomId || undefined }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      set({ isSending: false, isStreaming: true, streamingContent: '' });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'room_id') {
              if (!currentRoomId) set({ currentRoomId: data.room_id });
            } else if (data.type === 'chunk') {
              fullContent += data.content;
              set({ streamingContent: fullContent });
            } else if (data.type === 'done') {
              const aiMsg: ChatMessage = {
                id: Date.now() + 1, role: 'assistant', content: fullContent,
                sources: data.sources || [], web_sources: data.web_sources || [],
              };
              set(s => ({ messages: [...s.messages, aiMsg], isStreaming: false, streamingContent: '' }));
              get().fetchRooms();
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch {}
        }
      }
    } catch {
      const errMsg: ChatMessage = { id: Date.now() + 1, role: 'assistant', content: '⚠️ 오류가 발생했습니다. 서버 연결을 확인해주세요.' };
      set(s => ({ messages: [...s.messages, errMsg], isSending: false, isStreaming: false, streamingContent: '' }));
    }
  },

  // 새 채팅: 방 생성 + messages 초기화 → ChatWindow에서 messages가 없으면 welcome 화면 표시
  newChat: async () => {
    try {
      const room = await chatApi.createRoom();
      set(s => ({ rooms: [room, ...s.rooms], currentRoomId: room.id, messages: [], documents: [], streamingContent: '' }));
    } catch {
      set({ currentRoomId: null, messages: [], documents: [], streamingContent: '' });
    }
  },

  deleteRoom: async (roomId) => {
    try {
      await chatApi.deleteRoom(roomId);
      set(s => ({
        rooms: s.rooms.filter(r => r.id !== roomId),
        currentRoomId: s.currentRoomId === roomId ? null : s.currentRoomId,
        messages: s.currentRoomId === roomId ? [] : s.messages,
        documents: s.currentRoomId === roomId ? [] : s.documents,
        streamingContent: s.currentRoomId === roomId ? '' : s.streamingContent,
      }));
    } catch {}
  },

  updateRoomSettings: async (roomId, settings) => {
    const updated = await chatApi.updateRoomSettings(roomId, settings);
    set(s => ({ rooms: s.rooms.map(r => r.id === roomId ? updated : r) }));
    return updated;
  },

  summarizeRoom: async (roomId) => {
    set({ isSummarizing: true });
    try { const r = await chatApi.summarize(roomId); set({ isSummarizing: false }); return r.summary; }
    catch (e: any) { set({ isSummarizing: false }); throw e; }
  },

  fetchDocuments: async (roomId) => {
    try { set({ documents: await documentApi.getDocuments(roomId) }); } catch {}
  },

  uploadDocument: async (file) => {
    const { currentRoomId } = get();
    if (!currentRoomId) throw new Error('채팅방을 먼저 선택해주세요.');
    set({ isUploading: true });
    try { await documentApi.upload(file, currentRoomId); await get().fetchDocuments(currentRoomId); set({ isUploading: false }); }
    catch (e: any) { set({ isUploading: false }); throw new Error(e.response?.data?.detail || '업로드 실패'); }
  },

  deleteDocument: async (documentId) => {
    try { await documentApi.deleteDocument(documentId); set(s => ({ documents: s.documents.filter(d => d.id !== documentId) })); } catch {}
  },
}));
