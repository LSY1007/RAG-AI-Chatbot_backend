import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import ReactMarkdown from 'react-markdown';

const WebSources: React.FC<{ sources: { title: string; url: string }[] }> = ({ sources }) => {
  if (!sources?.length) return null;
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
      <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
        웹 검색 출처
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700 px-2 py-0.5 rounded-full truncate max-w-[200px] transition-colors">
            {s.title || s.url}
          </a>
        ))}
      </div>
    </div>
  );
};

const DocSources: React.FC<{ sources: { filename: string }[] }> = ({ sources }) => {
  if (!sources?.length) return null;
  const unique = [...new Set(sources.map(s => s.filename))];
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
      <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        참고 문서
      </p>
      <div className="flex flex-wrap gap-1.5">
        {unique.map((f, i) => (
          <span key={i} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded-full truncate max-w-[200px]">{f}</span>
        ))}
      </div>
    </div>
  );
};

const StreamingCursor: React.FC = () => (
  <span className="inline-block w-0.5 h-4 bg-gray-500 dark:bg-gray-400 ml-0.5 animate-pulse align-middle" />
);

// ─── 퀵스타트 카드 설정 ───────────────────────────
const QUICK_STARTS = [
  {
    icon: '👔', label: '면접 연습', desc: '기술 면접 준비',
    persona_id: 'interviewer', web_search: false,
    first_message: '안녕하세요! 오늘 면접 연습을 시작하겠습니다.\n\n먼저 간단한 자기소개를 해주세요. 어떤 직군/포지션을 준비 중인지도 함께 알려주시면 그에 맞는 질문을 드리겠습니다.',
  },
  {
    icon: '🌐', label: '웹 검색', desc: '최신 정보 검색',
    persona_id: 'default', web_search: true,
    first_message: '웹 검색이 활성화되었습니다! 🌐\n\n저는 실시간으로 인터넷을 검색하여 최신 정보를 제공할 수 있어요.\n\n예시 질문:\n- 오늘 날씨는?\n- 최근 AI 기술 동향은?\n- 현재 환율은?\n- 최신 뉴스는?\n\n무엇이 궁금하신가요?',
  },
  {
    icon: '💻', label: '코드 리뷰', desc: '코드 개선 제안',
    persona_id: 'code_reviewer', web_search: false,
    first_message: '안녕하세요! 코드 리뷰어입니다. 👨‍💻\n\n검토받고 싶은 코드를 붙여넣어 주세요.\n\n확인해드릴 항목:\n- 🐛 버그 및 잠재적 오류\n- ⚡ 성능 최적화 포인트\n- 🔒 보안 취약점\n- 📖 가독성 및 유지보수성\n- ✨ 더 나은 구현 방법 제안',
  },
  {
    icon: '🗣️', label: '영어 튜터', desc: '영어 회화 & 문법',
    persona_id: 'english_tutor', web_search: false,
    first_message: "Hello! I'm your English tutor. 👋\n\n영어로 말하고 싶은 내용을 자유롭게 작성해보세요!\n\n도와드릴 것들:\n- ✅ 문법 교정 및 설명\n- 💬 자연스러운 표현으로 개선\n- 📝 다양한 어휘 제안\n\n오늘 어떤 영어를 연습하고 싶으신가요?",
  },
  {
    icon: '✍️', label: '글쓰기 코치', desc: '글 다듬기',
    persona_id: 'writer', web_search: false,
    first_message: '안녕하세요! 글쓰기 코치입니다. ✍️\n\n다듬고 싶은 글을 붙여넣어 주세요.\n\n도움드릴 수 있는 유형:\n- 📄 자기소개서 / 이력서\n- 📧 이메일 / 공문서\n- 📝 블로그 / SNS 글\n- 📊 보고서 / 기획서',
  },
  {
    icon: '⚖️', label: '토론 파트너', desc: '논리력 훈련',
    persona_id: 'debate', web_search: false,
    first_message: '안녕하세요! 토론 파트너입니다. ⚖️\n\n논리적 사고와 비판적 분석을 함께 연습해볼까요?\n\n토론 방식:\n1. 주제를 제시해주시면 찬반 양측 논거를 분석합니다\n2. 날카로운 반론을 제기합니다\n3. 논리적 오류를 찾아 지적합니다\n\n어떤 주제로 토론해볼까요?',
  },
];

const ChatWindow: React.FC = () => {
  const { messages, currentRoomId, isSending, isStreaming, streamingContent, sendMessage, newChat, updateRoomSettings } = useChatStore();
  const [input, setInput] = React.useState('');
  const [isStarting, setIsStarting] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input.trim() || isSending || isStreaming) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleQuickStart = async (item: typeof QUICK_STARTS[0]) => {
    setIsStarting(item.label);
    try {
      // currentRoomId가 없으면 새 채팅방 먼저 생성
      if (!currentRoomId) {
        await newChat();
        await new Promise(r => setTimeout(r, 300));
      }
      const { currentRoomId: roomId } = useChatStore.getState();
      if (!roomId) return;

      // 페르소나 + 웹검색 설정
      await updateRoomSettings(roomId, {
        persona_id: item.persona_id,
        web_search_enabled: item.web_search,
        title: item.label,
      });

      // 첫 안내 메시지 전송
      await sendMessage(item.first_message);
    } catch (e) {
      console.error('QuickStart 오류:', e);
    } finally {
      setIsStarting(null);
    }
  };

  // ★ 핵심: messages가 없으면 항상 welcome 화면
  // currentRoomId 유무와 상관없이 - 새 채팅 클릭 후에도 표시됨
  if (messages.length === 0 && !isStreaming && !isSending) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <div className="w-14 h-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl flex items-center justify-center shadow-sm">
          <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="text-gray-800 dark:text-gray-100 font-semibold text-xl mb-2">AI 채팅을 시작하세요</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm">아래 카드를 클릭하면 바로 시작할 수 있어요</p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-2xl w-full">
          {QUICK_STARTS.map(item => (
            <button
              key={item.label}
              onClick={() => handleQuickStart(item)}
              disabled={isStarting !== null}
              className="group relative p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-center shadow-sm hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                {isStarting === item.label
                  ? <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  : <div className="text-3xl mb-2">{item.icon}</div>}
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-600">또는 아래 입력창에 직접 메시지를 입력하세요</p>

        {/* welcome 화면에서도 입력창 사용 가능 */}
        <div className="w-full max-w-2xl px-1">
          <div className="flex gap-2 items-end bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all shadow-sm">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="직접 입력하거나 위 카드를 클릭하세요..."
              rows={1}
              className="flex-1 bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none text-sm max-h-32"
            />
            <button onClick={handleSend} disabled={!input.trim()}
              className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg flex items-center justify-center transition-all flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 채팅 화면 ────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-gray-50 dark:bg-gray-900">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-lg shadow-sm'}`}>
              {msg.role === 'user' ? '나' : '✨'}
            </div>
            <div className={`max-w-[75%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.role === 'user' ? (
                <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm whitespace-pre-wrap">
                  {msg.content}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed text-gray-800 dark:text-gray-200 shadow-sm w-full">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  <DocSources sources={msg.sources || []} />
                  <WebSources sources={msg.web_sources || []} />
                </div>
              )}
              <span className="text-xs text-gray-400">
                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-center text-lg shadow-sm">✨</div>
            <div className="max-w-[75%]">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed text-gray-800 dark:text-gray-200 shadow-sm">
                {streamingContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    <StreamingCursor />
                  </div>
                ) : (
                  <div className="flex gap-1 items-center h-5">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 bg-gray-400 rounded-full typing-dot" style={{ animationDelay: `${i*0.15}s` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex gap-2 items-end bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="메시지를 입력하세요... (Enter 전송)"
            rows={1}
            disabled={isSending || isStreaming}
            className="flex-1 bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none text-sm max-h-32 disabled:opacity-50"
          />
          <button onClick={handleSend} disabled={!input.trim() || isSending || isStreaming}
            className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg flex items-center justify-center transition-all flex-shrink-0">
            {isStreaming
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-1.5">AI가 실수할 수 있습니다. 중요한 정보는 직접 확인하세요.</p>
      </div>
    </div>
  );
};

export default ChatWindow;
