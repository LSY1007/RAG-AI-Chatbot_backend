import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { userChatApi } from '../../src/api';
import { useAuthStore } from '../../src/authStore';
import { API_BASE } from '../../src/config';

interface Room { id: number; name: string; unread_count?: number; last_message?: any; }
interface Msg { id: number; user_id: number; username: string; content: string; message_type: string; created_at: string; is_deleted?: boolean; }

export default function ChatScreen() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => { loadRooms(); }, []);

  const loadRooms = async () => {
    try { setRooms(await userChatApi.getRooms()); } catch {}
  };

  const joinRoom = async (room: Room) => {
    setCurrentRoom(room);
    try {
      const msgs = await userChatApi.getMessages(room.id);
      setMessages(msgs);
      await userChatApi.markRead(room.id);
    } catch {}
    connectWs(room.id);
  };

  const connectWs = async (roomId: number) => {
    ws?.close();
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return;
    const socket = new WebSocket(`${API_BASE.replace('http', 'ws')}/api/v1/user-chat/ws/${roomId}?token=${token}`);
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onmessage = (e) => {
      try {
        const p = JSON.parse(e.data);
        if (p.type === 'message') {
          setMessages(prev => [...prev, p.data]);
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        } else if (p.type === 'message_deleted') {
          setMessages(prev => prev.map(m => m.id === p.data.id ? { ...m, is_deleted: true, content: '삭제된 메시지입니다.' } : m));
        }
      } catch {}
    };
    setWs(socket);
  };

  const sendMessage = () => {
    if (!input.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'message', content: input.trim() }));
    setInput('');
  };

  const leaveRoom = () => {
    ws?.close(); setWs(null);
    setCurrentRoom(null); setMessages([]);
    loadRooms();
  };

  // ─── 채팅방 목록 ────────────────────────────────
  if (!currentRoom) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>메시지</Text>
        </View>
        {rooms.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
            <Text style={s.emptyTitle}>채팅방이 없습니다</Text>
            <Text style={s.emptySub}>웹에서 친구를 추가하고{'\n'}채팅방을 만들어보세요</Text>
          </View>
        ) : (
          <FlatList data={rooms} keyExtractor={r => String(r.id)}
            onRefresh={loadRooms} refreshing={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.roomItem} onPress={() => joinRoom(item)}>
                <View style={s.roomAvatar}>
                  <Text style={s.roomAvatarTxt}>{item.name[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.roomName, (item.unread_count || 0) > 0 && s.roomNameBold]}>{item.name}</Text>
                  {item.last_message && (
                    <Text style={s.lastMsg} numberOfLines={1}>
                      {item.last_message.username}: {item.last_message.content}
                    </Text>
                  )}
                </View>
                {(item.unread_count || 0) > 0 && (
                  <View style={s.badge}><Text style={s.badgeTxt}>{item.unread_count}</Text></View>
                )}
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
        <TouchableOpacity onPress={leaveRoom} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.chatTitle}>{currentRoom.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <View style={[s.connDot, connected ? s.connGreen : s.connGray]} />
            <Text style={s.connTxt}>{connected ? '연결됨' : '연결 중...'}</Text>
          </View>
        </View>
      </View>

      <FlatList ref={flatRef} data={messages} keyExtractor={(m, i) => `${m.id}-${i}`}
        style={{ flex: 1, backgroundColor: '#f9fafb' }}
        contentContainerStyle={{ padding: 14 }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const isMe = item.user_id === user?.id;
          if ((item.message_type as string) === 'system') {
            return (
              <View style={s.sysMsgWrap}>
                <Text style={s.sysMsgTxt}>{item.content}</Text>
              </View>
            );
          }
          return (
            <View style={[s.msgRow, isMe ? s.msgMe : s.msgOther]}>
              {!isMe && (
                <View style={s.msgAvatar}>
                  <Text style={s.msgAvatarTxt}>{item.username[0].toUpperCase()}</Text>
                </View>
              )}
              <View style={{ maxWidth: '75%' }}>
                {!isMe && <Text style={s.msgUser}>{item.username}</Text>}
                <View style={[s.msgBubble, isMe ? s.bubbleMe : s.bubbleOther, item.is_deleted && s.bubbleDel]}>
                  <Text style={[s.msgTxt, isMe ? s.txtMe : s.txtOther, item.is_deleted && s.txtDel]}>
                    {item.is_deleted ? '🗑 삭제된 메시지입니다.' : item.content}
                  </Text>
                </View>
                <Text style={[s.msgTime, isMe && { textAlign: 'right' }]}>
                  {new Date(item.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={s.inputRow}>
        <TextInput style={s.input} value={input} onChangeText={setInput}
          placeholder="메시지 입력..." placeholderTextColor="#9ca3af" multiline maxLength={1000} />
        <TouchableOpacity style={[s.sendBtn, !input.trim() && s.sendOff]} onPress={sendMessage} disabled={!input.trim()}>
          <Ionicons name="send" size={17} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  roomItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f9fafb', gap: 12 },
  roomAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  roomAvatarTxt: { fontSize: 18, fontWeight: '700', color: '#2563eb' },
  roomName: { fontSize: 15, fontWeight: '500', color: '#374151' },
  roomNameBold: { fontWeight: '700', color: '#111827' },
  lastMsg: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  badge: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  chatTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  connDot: { width: 6, height: 6, borderRadius: 3 },
  connGreen: { backgroundColor: '#10b981' },
  connGray: { backgroundColor: '#9ca3af' },
  connTxt: { fontSize: 11, color: '#9ca3af' },
  sysMsgWrap: { alignSelf: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginVertical: 8 },
  sysMsgTxt: { fontSize: 12, color: '#6b7280' },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgMe: { justifyContent: 'flex-end' },
  msgOther: { justifyContent: 'flex-start' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 },
  msgAvatarTxt: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
  msgUser: { fontSize: 11, color: '#9ca3af', marginBottom: 3, marginLeft: 2 },
  msgBubble: { padding: 10, borderRadius: 16 },
  bubbleMe: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderBottomLeftRadius: 4 },
  bubbleDel: { backgroundColor: '#f9fafb', borderStyle: 'dashed' },
  msgTxt: { fontSize: 15, lineHeight: 22 },
  txtMe: { color: '#fff' },
  txtOther: { color: '#111827' },
  txtDel: { color: '#9ca3af', fontStyle: 'italic' },
  msgTime: { fontSize: 11, color: '#9ca3af', marginTop: 3 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 8 },
  input: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827', maxHeight: 100 },
  sendBtn: { width: 42, height: 42, backgroundColor: '#2563eb', borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: '#93c5fd' },
});
