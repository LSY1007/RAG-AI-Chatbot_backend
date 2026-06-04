import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUserChatStore } from '../stores/userChatStore';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { userChatApi } from '../api';
import Avatar from '../components/profile/Avatar';
import type { UserChatRoom, FriendUser, FriendRequest, RoomMember, UserMessage } from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👀'];

// ─── 이미지 미리보기 모달 ─────────────────────────
const ImageModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="relative max-w-4xl max-h-full">
      <img src={src} alt="미리보기" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
      <button onClick={onClose} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-600 hover:text-gray-900 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  </div>
);

// ─── 메시지 검색 패널 ─────────────────────────────
const SearchPanel: React.FC<{
  messages: UserMessage[];
  onClose: () => void;
  onJumpTo: (id: number) => void;
}> = ({ messages, onClose, onJumpTo }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = query.trim()
    ? messages.filter(m => !m.is_deleted && m.message_type === 'text' && m.content.toLowerCase().includes(query.toLowerCase()))
    : [];

  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="메시지 검색..." className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none" />
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <p className="text-sm text-gray-400">검색 결과가 없습니다</p>
          </div>
        )}
        {!query && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-gray-400">검색어를 입력하세요</p>
          </div>
        )}
        {results.map(msg => (
          <button key={msg.id} onClick={() => onJumpTo(msg.id)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Avatar username={msg.username} profileImage={msg.profile_image} size="xs" />
              <span className="text-xs font-medium text-gray-700">{msg.username}</span>
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(msg.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{highlight(msg.content)}</p>
          </button>
        ))}
        {results.length > 0 && (
          <p className="text-xs text-gray-400 text-center py-3">{results.length}개 검색됨</p>
        )}
      </div>
    </div>
  );
};

// ─── 이모지 피커 ─────────────────────────────────
const EmojiPicker: React.FC<{ onSelect: (e: string) => void; myReactions: string[] }> = ({ onSelect, myReactions }) => (
  <div className="absolute bottom-9 right-0 bg-white border border-gray-200 rounded-xl p-1.5 flex gap-0.5 shadow-lg z-20">
    {EMOJI_LIST.map(e => (
      <button key={e} onClick={() => onSelect(e)}
        className={`w-8 h-8 text-base rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center ${myReactions.includes(e) ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}>
        {e}
      </button>
    ))}
  </div>
);

// ─── 메시지 버블 ─────────────────────────────────
const MessageItem: React.FC<{
  msg: UserMessage; isMe: boolean; token: string; currentRoomId: number;
  onReply: (msg: UserMessage) => void; onEdit: (msg: UserMessage) => void;
  editingId: number | null; editingContent: string;
  onEditChange: (v: string) => void; onEditSubmit: () => void; onEditCancel: () => void;
  highlighted: boolean; msgRef?: (el: HTMLDivElement | null) => void;
  onImageClick: (src: string) => void;
}> = ({ msg, isMe, token, currentRoomId, onReply, onEdit, editingId, editingContent, onEditChange, onEditSubmit, onEditCancel, highlighted, msgRef, onImageClick }) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showActions, setShowActions] = useState(false);

  if ((msg.message_type as string) === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    );
  }

  const isImage = msg.message_type === 'file' && msg.file && IMAGE_TYPES.includes(msg.file.file_type.toLowerCase());
  const imageUrl = isImage && msg.file ? `http://localhost:8000/api/v1/user-chat/files/${msg.file.id}/download?token=${token}` : null;

  const handleDelete = async () => {
    if (!confirm('메시지를 삭제할까요?')) return;
    try { await userChatApi.deleteMessage(currentRoomId, msg.id); } catch {}
  };

  const handleReaction = async (emoji: string) => {
    setShowEmoji(false);
    try { await userChatApi.toggleReaction(currentRoomId, msg.id, emoji); } catch {}
  };

  const isEditing = editingId === msg.id;

  return (
    <div ref={msgRef}
      className={`group flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${highlighted ? 'bg-yellow-50 -mx-4 px-4 rounded-lg' : ''} transition-colors`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false); }}>

      <Avatar username={msg.username} profileImage={msg.profile_image} size="sm" className="mt-1 flex-shrink-0" />

      <div className={`max-w-[68%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs font-medium text-gray-500">{msg.username}</span>
          <span className="text-xs text-gray-400">
            {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.edited_at && !msg.is_deleted && <span className="text-xs text-gray-400">(수정됨)</span>}
        </div>

        {/* 답장 인용 */}
        {msg.reply_to && !msg.is_deleted && (
          <div className={`text-xs px-3 py-1.5 rounded-lg border-l-2 border-blue-400 bg-blue-50 max-w-full`}>
            <span className="font-medium text-blue-600">{msg.reply_to.username}</span>
            <p className="text-gray-500 truncate">{msg.reply_to.content}</p>
          </div>
        )}

        {/* 본문 */}
        {isEditing ? (
          <div className="flex flex-col gap-2 w-full min-w-[200px]">
            <textarea value={editingContent} onChange={e => onEditChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSubmit(); } if (e.key === 'Escape') onEditCancel(); }}
              className="input-field resize-none min-h-[60px] text-sm" />
            <div className="flex gap-2 justify-end">
              <button onClick={onEditCancel} className="btn-secondary text-xs py-1.5 px-3">취소</button>
              <button onClick={onEditSubmit} className="btn-primary text-xs py-1.5 px-3">저장</button>
            </div>
          </div>
        ) : msg.is_deleted ? (
          <div className="px-4 py-2.5 rounded-2xl text-sm italic text-gray-400 border border-dashed border-gray-200 bg-gray-50">
            🗑 삭제된 메시지입니다.
          </div>
        ) : isImage && imageUrl ? (
          <div className={`rounded-2xl overflow-hidden border border-gray-200 cursor-pointer ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`} onClick={() => onImageClick(imageUrl)}>
            <img src={imageUrl} alt={msg.file?.filename} className="max-w-[260px] max-h-[200px] object-cover hover:opacity-95 transition-opacity" />
          </div>
        ) : msg.message_type === 'file' && msg.file ? (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${isMe ? 'bg-blue-50 border-blue-200 rounded-tr-sm' : 'bg-gray-50 border-gray-200 rounded-tl-sm'}`}>
            <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{msg.file.filename}</p>
              <p className="text-xs text-gray-400">{msg.file.file_size}</p>
            </div>
            <a href={userChatApi.getDownloadUrl(msg.file.id, token)} download={msg.file.filename}
              className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 shadow-sm">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </a>
          </div>
        ) : (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'}`}>
            {msg.content}
          </div>
        )}

        {/* 리액션 */}
        {(msg.reactions || []).length > 0 && !msg.is_deleted && (
          <div className="flex flex-wrap gap-1">
            {(msg.reactions || []).map(r => (
              <button key={r.emoji} onClick={() => handleReaction(r.emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${(msg.my_reactions || []).includes(r.emoji) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <span>{r.emoji}</span><span className="font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* 읽음 표시 */}
        {isMe && (msg.readers_needed || 0) > 0 && !msg.is_deleted && (
          <span className={`text-xs ${msg.is_read ? 'text-blue-500' : 'text-gray-400'}`}>
            {msg.is_read ? '읽음' : '안읽음'}
          </span>
        )}
      </div>

      {/* 액션 버튼 */}
      {showActions && !msg.is_deleted && !isEditing && (
        <div className={`flex items-center gap-0.5 self-center relative ${isMe ? 'order-first mr-1' : 'ml-1'}`}>
          <button onClick={() => onReply(msg)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all" title="답장">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          </button>
          <div className="relative">
            <button onClick={() => setShowEmoji(p => !p)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all text-sm" title="리액션">
              😊
            </button>
            {showEmoji && <EmojiPicker onSelect={handleReaction} myReactions={msg.my_reactions || []} />}
          </div>
          {isMe && msg.message_type === 'text' && (
            <button onClick={() => onEdit(msg)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all" title="수정">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
          )}
          {isMe && (
            <button onClick={handleDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" title="삭제">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── 타이핑 인디케이터 ────────────────────────────
const TypingIndicator: React.FC<{ users: { username: string }[] }> = ({ users }) => {
  if (users.length === 0) return null;
  const label = users.length === 1 ? `${users[0].username}이 입력 중...` : `${users.map(u => u.username).join(', ')}이 입력 중...`;
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="flex gap-1 items-center">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
};

// ─── 친구 관리 패널 ──────────────────────────────
const FriendPanel: React.FC<{ onClose: () => void; onStartChat: (room: UserChatRoom) => void }> = ({ onClose, onStartChat }) => {
  const [tab, setTab] = useState<'friends' | 'search' | 'requests'>('friends');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [dbRequests, setDbRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState<number | null>(null);
  const { friendRequests: realtimeRequests, removeFriendRequest, addToast } = useNotificationStore();
  const allRequests = [...dbRequests, ...realtimeRequests.filter(r => !dbRequests.some(d => d.friendship_id === r.friendship_id))];

  const loadFriends = async () => { const [f, r] = await Promise.all([userChatApi.getFriends(), userChatApi.getFriendRequests()]); setFriends(f); setDbRequests(r); };
  useEffect(() => { loadFriends(); }, []);

  const handleStartChat = async (fid: number) => {
    setStartingChat(fid);
    try { const room = await userChatApi.createDMRoom(fid); onStartChat(room); onClose(); }
    catch (e: any) { addToast(`❌ ${e.response?.data?.detail || '오류'}`, 'warning'); }
    finally { setStartingChat(null); }
  };
  const handleSearch = async () => { if (!searchQuery.trim()) return; setLoading(true); try { setSearchResults(await userChatApi.searchUsers(searchQuery)); } finally { setLoading(false); } };
  const handleSendRequest = async (uid: number) => { try { await userChatApi.sendFriendRequest(uid); addToast('✅ 친구 요청을 보냈습니다.', 'success'); handleSearch(); } catch (e: any) { addToast(`❌ ${e.response?.data?.detail}`, 'warning'); } };
  const handleAccept = async (fid: number) => { try { await userChatApi.acceptFriendRequest(fid); addToast('✅ 친구가 되었습니다!', 'success'); removeFriendRequest(fid); loadFriends(); } catch (e: any) { addToast(`❌ ${e.response?.data?.detail}`, 'warning'); } };
  const handleReject = async (fid: number) => { try { await userChatApi.rejectFriendRequest(fid); removeFriendRequest(fid); setDbRequests(p => p.filter(r => r.friendship_id !== fid)); } catch {} };
  const handleRemoveFriend = async (uid: number) => { try { await userChatApi.removeFriend(uid); loadFriends(); } catch {} };

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">친구 관리</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex border-b border-gray-100">
        {(['friends', 'search', 'requests'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 text-xs font-medium transition-all relative ${tab === t ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'friends' ? `친구 ${friends.length}` : t === 'search' ? '검색' : '요청'}
            {t === 'requests' && allRequests.length > 0 && <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{allRequests.length}</span>}
            {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {tab === 'friends' && (friends.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">친구가 없습니다</p> :
          friends.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <Avatar username={f.username} profileImage={f.profile_image} size="md" showOnlineBadge isOnline={f.is_online} />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">{f.username}</p><p className="text-xs text-gray-400 truncate">{f.status_message || f.email}</p></div>
              <div className="flex gap-1">
                <button onClick={() => handleStartChat(f.id)} disabled={startingChat === f.id} className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                  {startingChat === f.id ? <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                </button>
                <button onClick={() => handleRemoveFriend(f.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6h12a6 6 0 00-6-6zM21 12h-6" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
        {tab === 'search' && (<>
          <div className="flex gap-2 mb-2">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="이름 또는 이메일" className="input-field text-sm flex-1 py-2" />
            <button onClick={handleSearch} disabled={loading} className="btn-primary text-xs px-3 py-2">{loading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '검색'}</button>
          </div>
          {searchResults.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <Avatar username={u.username} profileImage={u.profile_image} size="md" />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">{u.username}</p><p className="text-xs text-gray-400 truncate">{u.email}</p></div>
              {u.friend_status === 'friends' ? <button onClick={() => handleStartChat(u.id)} className="btn-primary text-xs px-2 py-1.5">채팅</button>
                : u.friend_status === 'sent' ? <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">요청중</span>
                : u.friend_status === 'received' ? <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">받은요청</span>
                : <button onClick={() => handleSendRequest(u.id)} className="btn-primary text-xs px-2 py-1.5 whitespace-nowrap">+ 추가</button>}
            </div>
          ))}
        </>)}
        {tab === 'requests' && (allRequests.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">받은 요청이 없습니다</p> :
          allRequests.map(r => (
            <div key={r.friendship_id} className="p-3 bg-gray-50 rounded-xl space-y-2.5">
              <div className="flex items-center gap-3"><Avatar username={r.username} profileImage={r.profile_image} size="md" /><p className="text-sm font-medium text-gray-800 flex-1">{r.username}</p></div>
              <div className="flex gap-2">
                <button onClick={() => handleAccept(r.friendship_id)} className="flex-1 btn-primary text-xs py-1.5 justify-center">수락</button>
                <button onClick={() => handleReject(r.friendship_id)} className="flex-1 btn-secondary text-xs py-1.5 justify-center">거절</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── 채팅방 목록 사이드바 ────────────────────────
const RoomSidebar: React.FC<{ onSelect: (room: UserChatRoom) => void; currentRoomId?: number; isActiveTab: boolean }> = ({ onSelect, currentRoomId, isActiveTab }) => {
  const { rooms, fetchRooms, unreadCounts } = useUserChatStore();
  const { friendRequests: realtimeRequests, roomUnreads, setNewMessageCallback } = useNotificationStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [dbRequestCount, setDbRequestCount] = useState(0);
  const fetchedRef = useRef(false);

  const loadData = useCallback(async () => {
    await fetchRooms();
    try { const reqs = await userChatApi.getFriendRequests(); setDbRequestCount(reqs.length); } catch {}
  }, [fetchRooms]);

  useEffect(() => { if (!fetchedRef.current) { fetchedRef.current = true; loadData(); } }, []);
  useEffect(() => { if (isActiveTab) loadData(); }, [isActiveTab]);
  useEffect(() => { setNewMessageCallback(() => { fetchRooms(); }); return () => { setNewMessageCallback(() => {}); }; }, [fetchRooms]);

  const getUnread = (roomId: number) => { const n = roomUnreads[roomId]; return n !== undefined ? n : (unreadCounts[roomId] || 0); };
  const totalUnread = rooms.reduce((s, r) => s + getUnread(r.id), 0);
  const totalFriendRequests = Math.max(dbRequestCount, realtimeRequests.length);

  return (
    <>
      <div className="w-64 border-r border-gray-200 flex flex-col bg-white h-full">
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-800">메시지</h2>
            {totalUnread > 0 && <span className="badge bg-red-100 text-red-600">{totalUnread > 99 ? '99+' : totalUnread}</span>}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowFriends(!showFriends)}
              className={`relative w-7 h-7 flex items-center justify-center rounded-lg transition-all ${showFriends ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {totalFriendRequests > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">{totalFriendRequests}</span>}
            </button>
            <button onClick={() => setShowCreate(true)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {rooms.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">채팅방이 없습니다</p>
              <p className="text-gray-400 text-xs mt-1">친구와 채팅을 시작해보세요</p>
            </div>
          ) : rooms.map(room => {
            const unread = getUnread(room.id);
            const isActive = currentRoomId === room.id;
            return (
              <div key={room.id} onClick={() => onSelect(room)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <p className={`text-sm truncate flex-1 ${unread > 0 ? 'font-semibold text-gray-900' : isActive ? 'font-medium text-blue-700' : 'font-medium text-gray-700'}`}>{room.name}</p>
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    {unread > 0 && <span className="badge bg-red-500 text-white text-xs min-w-[18px] text-center">{unread > 99 ? '99+' : unread}</span>}
                    {room.online_count > 0 && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                  </div>
                </div>
                {room.last_message && (
                  <p className={`text-xs truncate ${unread > 0 ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                    {room.last_message.username}: {room.last_message.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showFriends && <FriendPanel onClose={() => { setShowFriends(false); loadData(); }} onStartChat={async (room) => { await fetchRooms(); onSelect(room); setShowFriends(false); }} />}
      {showCreate && (
        <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={() => fetchRooms()} />
      )}
    </>
  );
};

// ─── 방 만들기 모달 ──────────────────────────────
const CreateRoomModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => { userChatApi.getFriends().then(setFriends).catch(() => {}); }, []);
  const handleCreate = async () => {
    if (!name.trim()) return; setLoading(true);
    try { await userChatApi.createRoom(name.trim(), undefined, selected); onCreated(); onClose(); } catch {} finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">새 채팅방 만들기</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div><label className="text-xs font-medium text-gray-500 block mb-1.5">채팅방 이름 *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="채팅방 이름" className="input-field" /></div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">친구 초대</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {friends.map(f => (
                <label key={f.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all ${selected.includes(f.id) ? 'bg-blue-50 border-blue-200' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selected.includes(f.id)} onChange={() => setSelected(p => p.includes(f.id) ? p.filter(x => x !== f.id) : [...p, f.id])} className="hidden" />
                  <Avatar username={f.username} profileImage={f.profile_image} size="sm" />
                  <p className="text-sm text-gray-700 flex-1">{f.username}</p>
                  {selected.includes(f.id) && <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">취소</button>
          <button onClick={handleCreate} disabled={!name.trim() || loading} className="btn-primary flex-1 justify-center">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '만들기'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── 채팅 창 ─────────────────────────────────────
const ChatArea: React.FC<{ isActiveTab: boolean }> = ({ isActiveTab }) => {
  const { currentRoom, messages, isConnected, onlineCount, sendMessage, sendTyping, sendStopTyping, uploadFile, isUploading, leaveRoom, connectWs, clearUnread, fetchRooms, typingUsers } = useUserChatStore();
  const { token, user } = useAuthStore();
  const { setRoomUnread } = useNotificationStore();
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<UserMessage | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMsgCount = useRef(messages.length);

  useEffect(() => { if (currentRoom && token) connectWs(currentRoom.id, token); }, [currentRoom?.id]);
  useEffect(() => {
    if (isActiveTab && currentRoom) { clearUnread(currentRoom.id); setRoomUnread(currentRoom.id, 0); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); userChatApi.markRoomRead(currentRoom.id).catch(() => {}); }
  }, [isActiveTab, currentRoom?.id]);
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      if (isActiveTab && currentRoom) { clearUnread(currentRoom.id); setRoomUnread(currentRoom.id, 0); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }
      fetchRooms();
    }
    prevMsgCount.current = messages.length;
  }, [messages.length]);

  const handleInput = (value: string) => {
    setInput(value);
    if (value.trim()) {
      sendTyping();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => sendStopTyping(), 2500);
    } else {
      sendStopTyping();
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim(), replyTo?.id);
    setInput(''); setReplyTo(null);
    sendStopTyping();
    if (typingTimer.current) clearTimeout(typingTimer.current);
  };

  const handleJumpToMessage = (id: number) => {
    setShowSearch(false);
    setHighlightedId(id);
    msgRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightedId(null), 2500);
  };

  const showToastMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const handleFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) { showToastMsg('❌ 파일 크기는 10MB를 초과할 수 없습니다.'); return; }
    try { await uploadFile(file); } catch (e: any) { showToastMsg(`❌ ${e.message}`); }
  };
  const loadMembers = async () => { if (!currentRoom) return; try { setMembers(await userChatApi.getRoomMembers(currentRoom.id)); } catch {} };
  const handleEditSubmit = async () => {
    if (!currentRoom || !editingId || !editingContent.trim()) return;
    try { await userChatApi.editMessage(currentRoom.id, editingId, editingContent.trim()); setEditingId(null); setEditingContent(''); }
    catch (e: any) { showToastMsg(`❌ ${e.response?.data?.detail || '수정 실패'}`); }
  };
  const handleInvite = async (uid: number) => {
    if (!currentRoom) return;
    try { const res = await userChatApi.inviteToRoom(currentRoom.id, uid); showToastMsg(`✅ ${res.message}`); loadMembers(); }
    catch (e: any) { showToastMsg(`❌ ${e.response?.data?.detail}`); }
  };

  if (!currentRoom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 bg-gray-50">
        <div className="w-16 h-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-sm">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        </div>
        <div className="text-center">
          <h3 className="text-gray-700 font-medium mb-1">채팅방을 선택해주세요</h3>
          <p className="text-gray-400 text-sm">왼쪽 목록에서 채팅방을 선택하거나<br />친구와 새 대화를 시작하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* 헤더 */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-5 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-sm font-semibold text-gray-800">{currentRoom.name}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{onlineCount}명 접속중</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSearch(!showSearch)}
            className={`btn-ghost text-sm ${showSearch ? 'bg-blue-50 text-blue-600' : ''}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            검색
          </button>
          <button onClick={() => { setShowMembers(!showMembers); setShowInvite(false); if (!showMembers) loadMembers(); }}
            className={`btn-ghost text-sm ${showMembers ? 'bg-blue-50 text-blue-600' : ''}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </button>
          <button onClick={() => { setShowInvite(!showInvite); setShowMembers(false); if (!showInvite) userChatApi.getFriends().then(setFriends).catch(() => {}); }}
            className={`btn-ghost text-sm ${showInvite ? 'bg-blue-50 text-blue-600' : ''}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          </button>
          <button onClick={leaveRoom} className="btn-secondary text-xs py-1.5 px-2.5 text-red-500 border-red-200 hover:bg-red-50">
            나가기
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
          {messages.length === 0 && <div className="flex flex-col items-center justify-center h-full"><p className="text-gray-400 text-sm">첫 메시지를 보내보세요!</p></div>}
          {messages.map((msg, idx) => (
            <MessageItem
              key={`${msg.id}-${idx}`}
              msg={msg}
              isMe={msg.user_id === user?.id}
              token={token || ''}
              currentRoomId={currentRoom.id}
              onReply={setReplyTo}
              onEdit={(m) => { setEditingId(m.id); setEditingContent(m.content); }}
              editingId={editingId}
              editingContent={editingContent}
              onEditChange={setEditingContent}
              onEditSubmit={handleEditSubmit}
              onEditCancel={() => { setEditingId(null); setEditingContent(''); }}
              highlighted={highlightedId === msg.id}
              msgRef={el => { msgRefs.current[msg.id] = el; }}
              onImageClick={setPreviewImage}
            />
          ))}
          <TypingIndicator users={typingUsers} />
          <div ref={bottomRef} />
        </div>

        {/* 멤버 패널 */}
        {showMembers && (
          <div className="w-52 border-l border-gray-200 p-4 space-y-3 bg-white overflow-y-auto flex-shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">멤버 {members.length}명</p>
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2.5">
                <Avatar username={m.username} profileImage={m.profile_image} size="sm" showOnlineBadge isOnline={m.is_online} />
                <div className="flex-1 min-w-0"><p className="text-sm text-gray-700 truncate font-medium">{m.username}</p>{m.status_message && <p className="text-xs text-gray-400 truncate">{m.status_message}</p>}</div>
              </div>
            ))}
          </div>
        )}

        {/* 초대 패널 */}
        {showInvite && (
          <div className="w-52 border-l border-gray-200 p-4 space-y-2 bg-white overflow-y-auto flex-shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">친구 초대</p>
            {friends.map(f => (
              <div key={f.id} className="flex items-center gap-2">
                <Avatar username={f.username} profileImage={f.profile_image} size="sm" />
                <p className="text-sm text-gray-700 flex-1 truncate">{f.username}</p>
                <button onClick={() => handleInvite(f.id)} className="btn-primary text-xs py-1 px-2">초대</button>
              </div>
            ))}
          </div>
        )}

        {/* 검색 패널 */}
        {showSearch && (
          <SearchPanel messages={messages} onClose={() => setShowSearch(false)} onJumpTo={handleJumpToMessage} />
        )}
      </div>

      {/* 입력창 */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        {replyTo && (
          <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-blue-50 rounded-lg border-l-2 border-blue-500">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-600">{replyTo.username}에게 답장</p>
              <p className="text-xs text-gray-500 truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); e.target.value = ''; } }} />
        <div className="flex gap-2 items-end bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
          <button onClick={() => fileRef.current?.click()} disabled={isUploading} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            {isUploading ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> :
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
          </button>
          <textarea ref={inputRef} value={input} onChange={e => handleInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={replyTo ? `${replyTo.username}에게 답장...` : "메시지 입력..."}
            rows={1} className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 resize-none focus:outline-none text-sm max-h-32" />
          <button onClick={handleSend} disabled={!input.trim()}
            className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-all flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-1.5">📎 최대 10MB · Enter 전송 · Shift+Enter 줄바꿈</p>
      </div>
      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm z-50">{toast}</div>}
      {previewImage && <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />}
    </div>
  );
};

// ─── 메인 ────────────────────────────────────────
const UserChatPage: React.FC<{ isActiveTab: boolean }> = ({ isActiveTab }) => {
  const { currentRoom, joinRoom } = useUserChatStore();
  return (
    <div className="flex h-full bg-white">
      <RoomSidebar onSelect={joinRoom} currentRoomId={currentRoom?.id} isActiveTab={isActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <ChatArea isActiveTab={isActiveTab} />
      </div>
    </div>
  );
};

export default UserChatPage;
