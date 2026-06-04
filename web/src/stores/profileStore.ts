import { create } from 'zustand';
import type { UserProfile } from '../types';
import { profileApi } from '../api';

interface ProfileState {
  myProfile: UserProfile | null;
  friendsStatus: Record<number, { is_online: boolean; status_message: string; profile_image: string | null }>;
  fetchMyProfile: () => Promise<void>;
  updateProfile: (payload: { status_message?: string; username?: string }) => Promise<void>;
  uploadImage: (file: File) => Promise<void>;
  deleteImage: () => Promise<void>;
  updateFriendStatus: (userId: number, data: { is_online?: boolean; status_message?: string; profile_image?: string | null }) => void;
  fetchFriendsStatus: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  myProfile: null,
  friendsStatus: {},

  fetchMyProfile: async () => {
    try {
      const profile = await profileApi.getMe();
      set({ myProfile: profile });
    } catch {}
  },

  updateProfile: async (payload) => {
    const updated = await profileApi.updateMe(payload);
    set({ myProfile: updated });
  },

  uploadImage: async (file) => {
    const result = await profileApi.uploadImage(file);
    set((s) => ({
      myProfile: s.myProfile ? { ...s.myProfile, profile_image: result.profile_image } : null
    }));
  },

  deleteImage: async () => {
    await profileApi.deleteImage();
    set((s) => ({
      myProfile: s.myProfile ? { ...s.myProfile, profile_image: null } : null
    }));
  },

  updateFriendStatus: (userId, data) => {
    set((s) => ({
      friendsStatus: {
        ...s.friendsStatus,
        [userId]: { ...s.friendsStatus[userId], ...data }
      }
    }));
  },

  fetchFriendsStatus: async () => {
    try {
      const list = await profileApi.getFriendsOnlineStatus();
      const map: ProfileState['friendsStatus'] = {};
      list.forEach((f: any) => {
        map[f.id] = { is_online: f.is_online, status_message: f.status_message, profile_image: f.profile_image };
      });
      set({ friendsStatus: map });
    } catch {}
  },
}));
