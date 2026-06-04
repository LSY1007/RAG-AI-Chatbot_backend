import React from 'react';
import type { ChatMessage } from '../../types';

interface Props {
  message: ChatMessage;
}

const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 아바타 */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
        isUser ? 'bg-primary-600 text-white' : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
      }`}>
        {isUser ? 'U' : 'AI'}
      </div>

      {/* 메시지 */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-sm'
            : 'bg-dark-800 text-slate-200 border border-slate-700/50 rounded-tl-sm'
        }`}>
          {message.content}
        </div>

        {/* 출처 */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {message.sources.map((src, i) => (
              <span key={i} className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {src.filename}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
