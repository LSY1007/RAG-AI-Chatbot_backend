import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import ProfileModal from '../profile/ProfileModal';
import Avatar from '../profile/Avatar';
import DashboardPage from '../../pages/DashboardPage';
import type { ChatRoom } from '../../types';

interface SidebarProps {
  activeTab: 'chat' | 'documents';
  setActiveTab: (tab: 'chat' | 'documents') => void;
}

const PERSONA_EMOJI: Record<string, string> = {
  default: '', interviewer: '👔', english_tutor: '🗣️',
  code_reviewer: '💻', writer: '✍️', debate: '⚖️', custom: '⚙️',
};

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { rooms, currentRoomId, fetchRooms, selectRoom, newChat, deleteRoom } = useChatStore();
  const { user, logout } = useAuthStore();
  const { myProfile, fetchMyProfile } = useProfileStore();
  const [hoveredRoom, setHoveredRoom] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchRooms();
      fetchMyProfile();
    }
  }, []);

  const handleNewChat = async () => {
    setIsCreating(true);
    await newChat();
    setIsCreating(false);
  };

  const handleDeleteRoom = async (e: React.MouseEvent, roomId: number) => {
    e.stopPropagation();
    if (confirmDelete === roomId) {
      await deleteRoom(roomId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(roomId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <>
      <aside className="w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
        {/* 로고 */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">RAG AI</h1>
                <p className="text-xs text-gray-400">Assistant</p>
              </div>
            </div>
            <button onClick={() => setShowDashboard(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all" title="대시보드">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="px-3 py-2.5 flex gap-1 border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
            채팅
          </button>
          <button onClick={() => setActiveTab('documents')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'documents' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
            문서
          </button>
        </div>

        {/* 새 채팅 */}
        {activeTab === 'chat' && (
          <div className="px-3 py-2">
            <button onClick={handleNewChat} disabled={isCreating}
              className="btn-primary w-full justify-center text-xs py-2 bg-blue-600 hover:bg-blue-700">
              {isCreating
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
              새 채팅
            </button>
          </div>
        )}

        {/* 채팅방 목록 */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 py-1">
          {activeTab === 'chat' && (
            <>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 py-1.5">최근 대화</p>
              {rooms.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 text-xs text-center py-4">대화 내역이 없습니다</p>
              ) : rooms.map((room: ChatRoom) => {
                const personaEmoji = room.persona_id ? PERSONA_EMOJI[room.persona_id] : '';
                const isActive = currentRoomId === room.id;
                return (
                  <div key={room.id}
                    className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                    onClick={() => selectRoom(room.id)}
                    onMouseEnter={() => setHoveredRoom(room.id)}
                    onMouseLeave={() => setHoveredRoom(null)}>
                    {personaEmoji ? <span className="text-sm flex-shrink-0">{personaEmoji}</span> :
                      <svg className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>}
                    <span className={`truncate flex-1 text-sm ${isActive ? 'font-medium' : ''}`}>{room.title}</span>
                    {room.web_search_enabled && <span className="text-xs flex-shrink-0">🌐</span>}
                    {(hoveredRoom === room.id || confirmDelete === room.id) && (
                      <button onClick={(e) => handleDeleteRoom(e, room.id)}
                        className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all ${confirmDelete === room.id ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* 유저 정보 */}
        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setShowProfile(true)} className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-75 transition-opacity text-left rounded-lg p-1.5 hover:bg-gray-50">
              <Avatar username={myProfile?.username || user?.username || ''} profileImage={myProfile?.profile_image} size="sm" showOnlineBadge isOnline={true} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{myProfile?.username || user?.username}</p>
                <p className="text-xs text-gray-400 truncate">{myProfile?.status_message || user?.email}</p>
              </div>
            </button>
            <button onClick={logout} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex-shrink-0" title="로그아웃">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showDashboard && <DashboardPage onClose={() => setShowDashboard(false)} />}
    </>
  );
};

export default Sidebar;
