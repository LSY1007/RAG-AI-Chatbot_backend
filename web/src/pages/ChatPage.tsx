import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import DocumentPanel from '../components/chat/DocumentPanel';
import RoomSettingsPanel from '../components/chat/RoomSettingsPanel';
import UserChatPage from './UserChatPage';
import { useUserChatStore } from '../stores/userChatStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useChatStore } from '../stores/chatStore';

type MainTab = 'ai' | 'users';

const ChatPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'documents'>('chat');
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('ai');
  const { unreadCounts } = useUserChatStore();
  const { rooms, currentRoomId, fetchPersonas } = useChatStore();

  useEffect(() => { fetchPersonas(); }, []);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const currentRoom = rooms.find(r => r.id === currentRoomId);

  const getPersonaLabel = () => {
    if (!currentRoom?.persona_id || currentRoom.persona_id === 'default') return null;
    const emojiMap: Record<string, string> = { interviewer: '👔', english_tutor: '🗣️', code_reviewer: '💻', writer: '✍️', debate: '⚖️', custom: '⚙️' };
    const nameMap: Record<string, string> = { interviewer: '면접관', english_tutor: '영어 튜터', code_reviewer: '코드 리뷰어', writer: '글쓰기 코치', debate: '토론 파트너', custom: '커스텀' };
    return { emoji: emojiMap[currentRoom.persona_id] || '🤖', name: nameMap[currentRoom.persona_id] || currentRoom.persona_id };
  };

  const personaLabel = getPersonaLabel();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {mainTab === 'ai' && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}

      <main className="flex-1 flex flex-col min-w-0">
        {/* 상단 탭 헤더 */}
        <header className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-5 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* 메인 탭 */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setMainTab('ai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mainTab === 'ai' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                AI 채팅
              </button>
              <button onClick={() => setMainTab('users')}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mainTab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                유저 채팅
                {totalUnread > 0 && mainTab !== 'users' && (
                  <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </button>
            </div>

            {/* 뱃지들 */}
            {mainTab === 'ai' && personaLabel && (
              <span className="badge bg-violet-100 text-violet-700">{personaLabel.emoji} {personaLabel.name}</span>
            )}
            {mainTab === 'ai' && currentRoom?.web_search_enabled && (
              <span className="badge bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                웹 검색
              </span>
            )}
          </div>

          {mainTab === 'ai' && (
            <div className="flex items-center gap-1.5">
              {currentRoomId && (
                <button onClick={() => { setShowSettings(!showSettings); setShowDocPanel(false); }}
                  className={`btn-ghost text-xs py-1.5 ${showSettings ? 'bg-violet-50 text-violet-600' : ''}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  설정
                </button>
              )}
              <button onClick={() => { setShowDocPanel(!showDocPanel); setShowSettings(false); }}
                className={`btn-ghost text-xs py-1.5 ${showDocPanel ? 'bg-blue-50 text-blue-600' : ''}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                문서
              </button>
            </div>
          )}
        </header>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-hidden relative">
          {/* AI 채팅 */}
          <div className={`absolute inset-0 flex bg-white dark:bg-gray-900 ${mainTab === 'ai' ? '' : 'pointer-events-none invisible'}`}>
            <div className="flex-1 overflow-hidden"><ChatWindow /></div>
            {showDocPanel && (
              <div className="w-72 border-l border-gray-200 dark:border-gray-800 overflow-y-auto p-5 bg-white dark:bg-gray-900 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">문서 관리</h3>
                  <button onClick={() => setShowDocPanel(false)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <DocumentPanel />
              </div>
            )}
            {showSettings && currentRoom && (
              <RoomSettingsPanel room={currentRoom} onClose={() => setShowSettings(false)} />
            )}
          </div>

          {/* 유저 채팅 */}
          <div className={`absolute inset-0 ${mainTab === 'users' ? '' : 'pointer-events-none invisible'}`}>
            <UserChatPage isActiveTab={mainTab === 'users'} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatPage;
