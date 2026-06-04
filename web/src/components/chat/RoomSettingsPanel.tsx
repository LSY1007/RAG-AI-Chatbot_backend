import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import type { ChatRoom, Persona } from '../../types';

interface RoomSettingsPanelProps { room: ChatRoom; onClose: () => void; }

const RoomSettingsPanel: React.FC<RoomSettingsPanelProps> = ({ room, onClose }) => {
  const { personas, fetchPersonas, updateRoomSettings, summarizeRoom, isSummarizing } = useChatStore();
  const [selectedPersona, setSelectedPersona] = useState(room.persona_id || 'default');
  const [customPrompt, setCustomPrompt] = useState(room.persona_prompt || '');
  const [webSearch, setWebSearch] = useState(room.web_search_enabled || false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => { if (personas.length === 0) fetchPersonas(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateRoomSettings(room.id, { persona_id: selectedPersona, persona_prompt: selectedPersona === 'custom' ? customPrompt : undefined, web_search_enabled: webSearch });
      showToast('✅ 설정이 저장되었습니다.');
    } catch (e: any) { showToast(`❌ ${e.response?.data?.detail || '저장 실패'}`); }
    finally { setIsSaving(false); }
  };

  const handleSummarize = async () => {
    try { const text = await summarizeRoom(room.id); setSummary(text); setShowSummary(true); }
    catch (e: any) { showToast(`❌ ${e.response?.data?.detail || '요약 실패'}`); }
  };

  return (
    <>
      <div className="w-76 bg-white border-l border-gray-200 flex flex-col h-full overflow-y-auto flex-shrink-0" style={{width: '300px'}}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">채팅방 설정</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* 대화 요약 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">📋 대화 요약</p>
                <p className="text-xs text-blue-500 mt-0.5">AI가 대화 내용을 정리합니다</p>
              </div>
              <button onClick={handleSummarize} disabled={isSummarizing} className="btn-primary text-xs py-1.5 px-3">
                {isSummarizing ? <div className="flex items-center gap-1.5"><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />요약 중</div> : '요약하기'}
              </button>
            </div>
          </div>

          {/* 웹 검색 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">웹 검색</label>
            <div onClick={() => setWebSearch(!webSearch)}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${webSearch ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🌐</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">웹 검색 활성화</p>
                  <p className="text-xs text-gray-400">최신 정보로 답변</p>
                </div>
              </div>
              <div className={`w-10 h-5.5 rounded-full transition-colors relative ${webSearch ? 'bg-green-500' : 'bg-gray-300'}`} style={{height: '22px'}}>
                <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${webSearch ? 'translate-x-[22px]' : 'translate-x-0.5'}`} style={{width:'18px', height:'18px'}} />
              </div>
            </div>
          </div>

          {/* 페르소나 선택 */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI 페르소나</label>
            <div className="grid grid-cols-2 gap-2">
              {personas.map((p: Persona) => (
                <button key={p.id} onClick={() => setSelectedPersona(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${selectedPersona === p.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                  <div className="text-xl mb-1">{p.emoji}</div>
                  <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-snug">{p.description}</p>
                </button>
              ))}
            </div>

            {selectedPersona === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500">커스텀 프롬프트</label>
                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="AI의 역할과 행동 방식을 설정하세요..."
                  rows={5} className="input-field text-sm resize-none w-full" />
                <p className="text-xs text-gray-400">{customPrompt.length}자</p>
              </div>
            )}
          </div>

          <button onClick={handleSave} disabled={isSaving} className="btn-primary w-full justify-center py-2.5">
            {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '설정 저장'}
          </button>
        </div>

        {toast && <div className="mx-5 mb-4 px-4 py-2.5 rounded-xl text-sm bg-gray-900 text-white">{toast}</div>}
      </div>

      {showSummary && summary && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowSummary(false)}>
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-lg">📋</span><h3 className="text-sm font-semibold text-gray-800">대화 요약</h3></div>
              <button onClick={() => setShowSummary(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{summary}</div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => { navigator.clipboard.writeText(summary); showToast('📋 복사되었습니다.'); }} className="btn-secondary text-xs">복사</button>
              <button onClick={() => setShowSummary(false)} className="btn-primary text-xs">닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoomSettingsPanel;
