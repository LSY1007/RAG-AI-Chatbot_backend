import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/authStore';
import { profileApi } from '../../src/api';
import { API_BASE } from '../../src/config';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

interface Profile { id: number; email: string; username: string; status_message: string; profile_image: string | null; }

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const p = await profileApi.getMe(); setProfile(p); setStatusMsg(p.status_message || ''); } catch {}
  };

  const saveStatus = async () => {
    setIsSaving(true);
    try { await profileApi.updateMe({ status_message: statusMsg }); await load(); setEditing(false); }
    catch { Alert.alert('오류', '저장에 실패했습니다.'); }
    finally { setIsSaving(false); }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: result.assets[0].uri, name: 'profile.jpg', type: 'image/jpeg' } as any);
      const token = await SecureStore.getItemAsync('access_token');
      const res = await fetch(`${API_BASE}/api/v1/profile/me/image`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }, body: formData });
      if (!res.ok) throw new Error();
      await load();
    } catch { Alert.alert('오류', '업로드에 실패했습니다.'); }
    finally { setIsUploading(false); }
  };

  const handleLogout = () => Alert.alert('로그아웃', '정말 로그아웃 할까요?', [
    { text: '취소', style: 'cancel' },
    { text: '로그아웃', style: 'destructive', onPress: logout },
  ]);

  const imgUrl = profile?.profile_image ? `${API_BASE}${profile.profile_image}` : null;
  const initial = (profile?.username || user?.username || '?')[0].toUpperCase();

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* 헤더 */}
      <View style={s.profileHeader}>
        <TouchableOpacity onPress={pickImage} disabled={isUploading} style={s.avatarWrap}>
          {isUploading
            ? <View style={s.avatar}><ActivityIndicator color="#2563eb" /></View>
            : imgUrl
              ? <Image source={{ uri: imgUrl }} style={s.avatar} />
              : <View style={s.avatar}><Text style={s.avatarTxt}>{initial}</Text></View>}
          <View style={s.cameraBadge}><Ionicons name="camera" size={13} color="#fff" /></View>
        </TouchableOpacity>
        <Text style={s.username}>{profile?.username || user?.username}</Text>
        <Text style={s.email}>{profile?.email || user?.email}</Text>
        {user?.is_admin && (
          <View style={s.adminBadge}><Text style={s.adminTxt}>🛡 관리자</Text></View>
        )}
      </View>

      {/* 상태 메시지 */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>상태 메시지</Text>
        {editing ? (
          <View style={s.editBox}>
            <TextInput style={s.statusInput} value={statusMsg} onChangeText={setStatusMsg}
              placeholder="상태 메시지를 입력하세요" placeholderTextColor="#9ca3af" maxLength={100} multiline />
            <Text style={s.charCount}>{statusMsg.length}/100</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditing(false); setStatusMsg(profile?.status_message || ''); }}>
                <Text style={s.cancelTxt}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={saveStatus} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveTxt}>저장</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.statusDisplay} onPress={() => setEditing(true)}>
            <Text style={[s.statusTxt, !profile?.status_message && s.statusPlaceholder]}>
              {profile?.status_message || '상태 메시지를 입력해보세요 ✏️'}
            </Text>
            <Ionicons name="pencil-outline" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* 메뉴 */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>설정</Text>
        <View style={s.menuCard}>
          {[
            { icon: 'person-outline' as const, label: '계정 정보', color: '#2563eb' },
            { icon: 'notifications-outline' as const, label: '알림 설정', color: '#7c3aed' },
            { icon: 'shield-outline' as const, label: '개인정보 보호', color: '#059669' },
          ].map((item, idx) => (
            <TouchableOpacity key={item.label} style={[s.menuItem, idx < 2 && s.menuBorder]}>
              <View style={[s.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 로그아웃 */}
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={s.logoutTxt}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.version}>RAG AI Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  profileHeader: { backgroundColor: '#fff', alignItems: 'center', paddingTop: 32, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#e5e7eb' },
  avatarTxt: { fontSize: 34, fontWeight: '700', color: '#2563eb' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, backgroundColor: '#2563eb', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  username: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6b7280' },
  adminBadge: { marginTop: 8, backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#fde68a' },
  adminTxt: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  editBox: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  statusInput: { fontSize: 15, color: '#111827', minHeight: 60, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#f3f4f6', borderRadius: 8, alignItems: 'center' },
  cancelTxt: { fontSize: 14, color: '#374151', fontWeight: '500' },
  saveBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#2563eb', borderRadius: 8, alignItems: 'center' },
  saveTxt: { fontSize: 14, color: '#fff', fontWeight: '600' },
  statusDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 },
  statusTxt: { flex: 1, fontSize: 15, color: '#374151' },
  statusPlaceholder: { color: '#9ca3af', fontStyle: 'italic' },
  menuCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  menuIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 8, borderWidth: 1, borderColor: '#fee2e2' },
  logoutTxt: { fontSize: 15, color: '#ef4444', fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 12, color: '#d1d5db', marginTop: 24 },
});
