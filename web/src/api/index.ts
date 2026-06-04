import api from './axios';
import type { TokenResponse } from '../types';

export const authApi = {
  register: async (email: string, username: string, password: string): Promise<TokenResponse> => { const { data } = await api.post('/api/v1/auth/register', { email, username, password }); return data; },
  login: async (email: string, password: string): Promise<TokenResponse> => { const { data } = await api.post('/api/v1/auth/login', { email, password }); return data; },
};

export const chatApi = {
  getPersonas: async () => { const { data } = await api.get('/api/v1/chat/personas'); return data; },
  createRoom: async () => { const { data } = await api.post('/api/v1/chat/rooms'); return data; },
  sendMessage: async (question: string, room_id?: number) => { const { data } = await api.post('/api/v1/chat/', { question, room_id }); return data; },
  getRooms: async () => { const { data } = await api.get('/api/v1/chat/rooms'); return data; },
  updateRoomSettings: async (room_id: number, settings: { persona_id?: string; persona_prompt?: string; web_search_enabled?: boolean; title?: string }) => {
    const { data } = await api.put(`/api/v1/chat/rooms/${room_id}/settings`, settings); return data;
  },
  deleteRoom: async (room_id: number) => { const { data } = await api.delete(`/api/v1/chat/rooms/${room_id}`); return data; },
  getHistory: async (room_id: number) => { const { data } = await api.get(`/api/v1/chat/history?room_id=${room_id}`); return data; },
  summarize: async (room_id: number) => { const { data } = await api.post(`/api/v1/chat/rooms/${room_id}/summary`); return data; },
};

export const documentApi = {
  upload: async (file: File, room_id: number) => { const formData = new FormData(); formData.append('file', file); const { data } = await api.post(`/api/v1/documents/upload?room_id=${room_id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); return data; },
  getDocuments: async (room_id: number) => { const { data } = await api.get(`/api/v1/documents/?room_id=${room_id}`); return data; },
  deleteDocument: async (document_id: number) => { const { data } = await api.delete(`/api/v1/documents/${document_id}`); return data; },
};

export const profileApi = {
  getMe: async () => { const { data } = await api.get('/api/v1/profile/me'); return data; },
  updateMe: async (payload: { status_message?: string; username?: string }) => { const { data } = await api.put('/api/v1/profile/me', payload); return data; },
  uploadImage: async (file: File) => { const formData = new FormData(); formData.append('file', file); const { data } = await api.post('/api/v1/profile/me/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); return data; },
  deleteImage: async () => { const { data } = await api.delete('/api/v1/profile/me/image'); return data; },
  getUserProfile: async (user_id: number) => { const { data } = await api.get(`/api/v1/profile/user/${user_id}`); return data; },
  getFriendsOnlineStatus: async () => { const { data } = await api.get('/api/v1/profile/online-status'); return data; },
};

export const userChatApi = {
  searchUsers: async (q: string) => { const { data } = await api.get(`/api/v1/user-chat/users/search?q=${encodeURIComponent(q)}`); return data; },
  sendFriendRequest: async (user_id: number) => { const { data } = await api.post(`/api/v1/user-chat/friends/request/${user_id}`); return data; },
  acceptFriendRequest: async (friendship_id: number) => { const { data } = await api.post(`/api/v1/user-chat/friends/accept/${friendship_id}`); return data; },
  rejectFriendRequest: async (friendship_id: number) => { const { data } = await api.post(`/api/v1/user-chat/friends/reject/${friendship_id}`); return data; },
  removeFriend: async (user_id: number) => { const { data } = await api.delete(`/api/v1/user-chat/friends/${user_id}`); return data; },
  getFriends: async () => { const { data } = await api.get('/api/v1/user-chat/friends'); return data; },
  getFriendRequests: async () => { const { data } = await api.get('/api/v1/user-chat/friends/requests'); return data; },
  createDMRoom: async (friend_id: number) => { const { data } = await api.post(`/api/v1/user-chat/rooms/dm/${friend_id}`); return data; },
  createRoom: async (name: string, description?: string, invite_user_ids: number[] = []) => { const { data } = await api.post('/api/v1/user-chat/rooms', { name, description, invite_user_ids }); return data; },
  getRooms: async () => { const { data } = await api.get('/api/v1/user-chat/rooms'); return data; },
  inviteToRoom: async (room_id: number, user_id: number) => { const { data } = await api.post(`/api/v1/user-chat/rooms/${room_id}/invite?user_id=${user_id}`); return data; },
  leaveRoom: async (room_id: number) => { const { data } = await api.delete(`/api/v1/user-chat/rooms/${room_id}/leave`); return data; },
  getMessages: async (room_id: number) => { const { data } = await api.get(`/api/v1/user-chat/rooms/${room_id}/messages`); return data; },
  getRoomMembers: async (room_id: number) => { const { data } = await api.get(`/api/v1/user-chat/rooms/${room_id}/members`); return data; },
  markRoomRead: async (room_id: number) => { await api.post(`/api/v1/user-chat/rooms/${room_id}/read`); },
  editMessage: async (room_id: number, message_id: number, content: string) => { const { data } = await api.put(`/api/v1/user-chat/rooms/${room_id}/messages/${message_id}`, { content }); return data; },
  deleteMessage: async (room_id: number, message_id: number) => { const { data } = await api.delete(`/api/v1/user-chat/rooms/${room_id}/messages/${message_id}`); return data; },
  toggleReaction: async (room_id: number, message_id: number, emoji: string) => { const { data } = await api.post(`/api/v1/user-chat/rooms/${room_id}/messages/${message_id}/reactions?emoji=${encodeURIComponent(emoji)}`); return data; },
  uploadFile: async (room_id: number, file: File) => { const formData = new FormData(); formData.append('file', file); const { data } = await api.post(`/api/v1/user-chat/rooms/${room_id}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); return data; },
  getDownloadUrl: (file_id: number, token: string) => `http://localhost:8000/api/v1/user-chat/files/${file_id}/download?token=${token}`,
};
