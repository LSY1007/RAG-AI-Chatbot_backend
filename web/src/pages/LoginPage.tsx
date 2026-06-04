import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

const LoginPage: React.FC = () => {
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) await register(form.email, form.username, form.password);
    else await login(form.email, form.password);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      {/* 배경 패턴 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">RAG AI Assistant</h1>
          <p className="text-gray-400 text-sm mt-1.5">문서 기반 AI 채팅 + 실시간 메시지</p>
        </div>

        {/* 카드 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
          {/* 탭 */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button onClick={() => { setIsRegister(false); clearError(); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isRegister ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              로그인
            </button>
            <button onClick={() => { setIsRegister(true); clearError(); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isRegister ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">이메일</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="example@email.com" className="input-field" required />
            </div>
            {isRegister && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">사용자명</label>
                <input name="username" type="text" value={form.username} onChange={handleChange}
                  placeholder="사용자명" className="input-field" required />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">비밀번호</label>
              <input name="password" type="password" value={form.password} onChange={handleChange}
                placeholder="••••••••" className="input-field" required />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full justify-center py-3 mt-1">
              {isLoading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : isRegister ? '계정 만들기' : '로그인'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-5">
          RAG AI Assistant · Built with FastAPI & React
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
