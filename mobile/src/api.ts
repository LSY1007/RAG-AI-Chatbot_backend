import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from './config';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('access_token');
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/api/v1/auth/login', { email, password });
    return data;
  },
  register: async (email: string, username: string, password: string) => {
    const { data } = await api.post('/api/v1/auth/register', { email, username, password });
    return data;
  },
};

export const chatApi = {
  getPersonas: async () => { const { data } = await api.get('/api/v1/chat/personas'); return data; },
  getRooms: async () => { const { data } = await api.get('/api/v1/chat/rooms'); return data; },
  createRoom: async () => { const { data } = await api.post('/api/v1/chat/rooms'); return data; },
  deleteRoom: async (id: number) => { await api.delete(`/api/v1/chat/rooms/${id}`); },
  getHistory: async (roomId: number) => { const { data } = await api.get(`/api/v1/chat/history?room_id=${roomId}`); return data; },
  updateSettings: async (roomId: number, settings: any) => {
    const { data } = await api.put(`/api/v1/chat/rooms/${roomId}/settings`, settings); return data;
  },
};

export const profileApi = {
  getMe: async () => { const { data } = await api.get('/api/v1/profile/me'); return data; },
  updateMe: async (payload: any) => { const { data } = await api.put('/api/v1/profile/me', payload); return data; },
};

export const userChatApi = {
  getFriends: async () => { const { data } = await api.get('/api/v1/user-chat/friends'); return data; },
  getRooms: async () => { const { data } = await api.get('/api/v1/user-chat/rooms'); return data; },
  createDMRoom: async (friendId: number) => { const { data } = await api.post(`/api/v1/user-chat/rooms/dm/${friendId}`); return data; },
  getMessages: async (roomId: number) => { const { data } = await api.get(`/api/v1/user-chat/rooms/${roomId}/messages`); return data; },
  markRead: async (roomId: number) => { await api.post(`/api/v1/user-chat/rooms/${roomId}/read`); },
  searchUsers: async (q: string) => { const { data } = await api.get(`/api/v1/user-chat/users/search?q=${encodeURIComponent(q)}`); return data; },
  sendFriendRequest: async (userId: number) => { const { data } = await api.post(`/api/v1/user-chat/friends/request/${userId}`); return data; },
  acceptFriendRequest: async (fid: number) => { const { data } = await api.post(`/api/v1/user-chat/friends/accept/${fid}`); return data; },
};
