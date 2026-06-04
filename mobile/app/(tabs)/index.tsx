import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { chatApi } from '../../src/api';
import { API_BASE } from '../../src/config';
import Markdown from 'react-native-markdown-display';

interface Message { id: number; role: 'user' | 'assistant'; content: string; }
interface Room { id: number; title: string; persona_id: string; web_search_enabled: boolean; }

export default function AIChatScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => { loadRooms(); }, []);

  const loadRooms = async () => {
    try { setRooms(await chatApi.getRooms()); } catch {}
  };

  const selectRoom = async (room: Room) => {
    setCurrentRoom(room);
    try { setMessages(await chatApi.getHistory(room.id)); } catch {}
  };

  const createNewRoom = async () => {
    try {
      const room = await chatApi.createRoom();
      setRooms(p => [room, ...p]);
      setCurrentRoom(room);
      setMessages([]);
    } catch {}
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const question = input.trim();
    setInput('');
    setMessages(p => [...p, { id: Date.now(), role: 'user', content: question }]);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const token = await SecureStore.getItemAsync('access_token');
      const res = await fetch(`${API_BASE}/api/v1/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, room_id: currentRoom?.id }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '', full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === 'room_id' && !currentRoom) {
              setCurrentRoom({ id: d.room_id, title: question.slice(0, 30), persona_id: 'default', web_search_enabled: false });
            } else if (d.type === 'chunk') {
              full += d.content;
              setStreamingContent(full);
            } else if (d.type === 'done') {
              setMessages(p => [...p, { id: Date.now() + 1, role: 'assistant', content: full }]);
              setStreamingContent('');
              setIsStreaming(false);
              loadRooms();
            }
          } catch {}
        }
      }
    } catch {
      setMessages(p => [...p, { id: Date.now() + 1, role: 'assistant', content: '⚠️ 오류가 발생했습니다.' }]);
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const PERSONA_ICON: Record<string, string> = { interviewer: '👔', english_tutor: '🗣️', code_reviewer: '💻', writer: '✍️', debate: '⚖️', custom: '⚙️', default: '✨' };

  // ─── 채팅방 목록 ────────────────────────────────
  if (!currentRoom) {
    return (
      <View style={s.container}>
        <View style={s.listHeader}>
          <Text style={s.listTitle}>AI 채팅</Text>
          <TouchableOpacity style={s.newBtn} onPress={createNewRoom}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.newBtnText}>새 채팅</Text>
          </TouchableOpacity>
        </View>
        {rooms.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>✨</Text>
            <Text style={s.emptyTitle}>AI 채팅을 시작하세요</Text>
            <Text style={s.emptySub}>새 채팅 버튼을 눌러 시작하세요</Text>
            <TouchableOpacity style={[s.newBtn, { marginTop: 20 }]} onPress={createNewRoom}>
              <Text style={s.newBtnText}>새 채팅 시작</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList data={rooms} keyExtractor={r => String(r.id)}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.roomItem} onPress={() => selectRoom(item)}>
                <View style={s.roomIcon}><Text style={{ fontSize: 22 }}>{PERSONA_ICON[item.persona_id] || '✨'}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.roomTitle} numberOfLines={1}>{item.title}</Text>
                  {item.web_search_enabled && <Text style={s.roomBadge}>🌐 웹 검색 활성</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  // ─── 채팅 화면 ───────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.chatHeader}>
        <TouchableOpacity onPress={() => { setCurrentRoom(null); setMessages([]); }} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={s.chatTitle} numberOfLines={1}>{currentRoom.title || '새 채팅'}</Text>
        {currentRoom.web_search_enabled && <Text style={{ fontSize: 14 }}>🌐</Text>}
      </View>

      <FlatList ref={flatListRef} data={messages} keyExtractor={(m, i) => `${m.id}-${i}`}
        style={{ flex: 1, backgroundColor: '#f9fafb' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[s.msgRow, item.role === 'user' ? s.msgRowMe : s.msgRowAI]}>
            {item.role === 'assistant' && <View style={s.aiAvatar}><Text>✨</Text></View>}
            <View style={[s.bubble, item.role === 'user' ? s.bubbleMe : s.bubbleAI]}>
              {item.role === 'assistant'
                ? <Markdown style={mdStyle}>{item.content}</Markdown>
                : <Text style={s.msgTextMe}>{item.content}</Text>}
            </View>
          </View>
        )}
        ListFooterComponent={
          isStreaming ? (
            <View style={s.msgRow}>
              <View style={s.aiAvatar}><Text>✨</Text></View>
              <View style={[s.bubble, s.bubbleAI]}>
                {streamingContent
                  ? <Markdown style={mdStyle}>{streamingContent + '▋'}</Markdown>
                  : <View style={{ flexDirection: 'row', gap: 4, padding: 4 }}>
                      {[0, 1, 2].map(i => <View key={i} style={s.dot} />)}
                    </View>}
              </View>
            </View>
          ) : null
        }
      />

      <View style={s.inputRow}>
        <TextInput style={s.textInput} value={input} onChangeText={setInput}
          placeholder="메시지 입력..." placeholderTextColor="#9ca3af"
          multiline maxLength={2000} editable={!isStreaming} />
        <TouchableOpacity style={[s.sendBtn, (!input.trim() || isStreaming) && s.sendBtnOff]} onPress={sendMessage} disabled={!input.trim() || isStreaming}>
          {isStreaming
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={17} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  listTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  newBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, gap: 4 },
  newBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  roomItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 3, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', gap: 12 },
  roomIcon: { width: 42, height: 42, backgroundColor: '#eff6ff', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roomTitle: { fontSize: 15, fontWeight: '500', color: '#111827' },
  roomBadge: { fontSize: 11, color: '#10b981', marginTop: 2 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  chatTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  msgRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  aiAvatar: { width: 32, height: 32, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 },
  bubble: { maxWidth: '78%', padding: 12, borderRadius: 18 },
  bubbleMe: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderBottomLeftRadius: 4 },
  msgTextMe: { color: '#fff', fontSize: 15, lineHeight: 22 },
  dot: { width: 7, height: 7, backgroundColor: '#9ca3af', borderRadius: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 8 },
  textInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827', maxHeight: 100 },
  sendBtn: { width: 42, height: 42, backgroundColor: '#2563eb', borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#93c5fd' },
});

const mdStyle: any = {
  body: { color: '#374151', fontSize: 15, lineHeight: 23 },
  code_inline: { backgroundColor: '#f3f4f6', color: '#111827', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, paddingHorizontal: 4, borderRadius: 4 },
  fence: { backgroundColor: '#1f2937', borderRadius: 8, padding: 12, marginVertical: 8 },
  code_block: { color: '#e5e7eb', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 },
  strong: { fontWeight: '700' },
  heading1: { fontSize: 20, fontWeight: '700', color: '#111827' },
  heading2: { fontSize: 17, fontWeight: '600', color: '#111827' },
};
