import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../src/authStore';

export default function LoginScreen() {
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '' });

  const handleSubmit = async () => {
    if (isRegister) {
      await register(form.email, form.username, form.password);
    } else {
      await login(form.email, form.password);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* 로고 */}
        <View style={s.logo}>
          <View style={s.logoIcon}><Text style={{ fontSize: 28 }}>✨</Text></View>
          <Text style={s.title}>RAG AI Assistant</Text>
          <Text style={s.subtitle}>문서 기반 AI 채팅 + 실시간 메시지</Text>
        </View>

        {/* 탭 */}
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, !isRegister && s.tabActive]} onPress={() => { setIsRegister(false); clearError(); }}>
            <Text style={[s.tabText, !isRegister && s.tabTextActive]}>로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, isRegister && s.tabActive]} onPress={() => { setIsRegister(true); clearError(); }}>
            <Text style={[s.tabText, isRegister && s.tabTextActive]}>회원가입</Text>
          </TouchableOpacity>
        </View>

        {/* 폼 */}
        <View style={s.card}>
          <Text style={s.label}>이메일</Text>
          <TextInput style={s.input} value={form.email} onChangeText={v => { setForm(p => ({ ...p, email: v })); clearError(); }}
            placeholder="example@email.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9ca3af" />

          {isRegister && <>
            <Text style={s.label}>사용자명</Text>
            <TextInput style={s.input} value={form.username} onChangeText={v => { setForm(p => ({ ...p, username: v })); clearError(); }}
              placeholder="사용자명" autoCapitalize="none" placeholderTextColor="#9ca3af" />
          </>}

          <Text style={s.label}>비밀번호</Text>
          <TextInput style={s.input} value={form.password} onChangeText={v => { setForm(p => ({ ...p, password: v })); clearError(); }}
            placeholder="••••••••" secureTextEntry placeholderTextColor="#9ca3af" />

          {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

          <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>{isRegister ? '계정 만들기' : '로그인'}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { alignItems: 'center', marginBottom: 32 },
  logoIcon: { width: 68, height: 68, backgroundColor: '#2563eb', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginTop: 12, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#dc2626', fontSize: 13 },
  btn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
