import React, { useEffect, useRef } from 'react';
import { useAuthStore } from './stores/authStore';
import { useNotificationStore } from './stores/notificationStore';
import { useThemeStore } from './stores/themeStore';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';

// ─── 토스트 알림 ──────────────────────────────────
const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm pointer-events-auto max-w-sm ${
            toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
            : toast.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/50 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
          }`}>
          <span className="flex-1 whitespace-pre-line">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
};

// ─── 다크모드 토글 버튼 ───────────────────────────
const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:scale-110 transition-transform"
      title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
    >
      {theme === 'light' ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      )}
    </button>
  );
};

// ─── 알림 WS 자동 재연결 ──────────────────────────
const useNotificationWs = () => {
  const { token } = useAuthStore();
  const { connectNotifications } = useNotificationStore();

  const tryConnect = () => {
    if (!token) return;
    const ws = useNotificationStore.getState().ws;
    if (ws && ws.readyState === WebSocket.OPEN) return;
    connectNotifications(token);
  };

  useEffect(() => {
    if (!token) return;
    tryConnect();
    const interval = setInterval(() => {
      const ws = useNotificationStore.getState().ws;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) tryConnect();
    }, 3000);
    return () => clearInterval(interval);
  }, [token]);
};

// ─── 테마 초기화 ──────────────────────────────────
const useThemeInit = () => {
  const { theme } = useThemeStore();
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);
};

const App: React.FC = () => {
  const { token } = useAuthStore();
  useNotificationWs();
  useThemeInit();

  return (
    <>
      {token ? <ChatPage /> : <LoginPage />}
      <ToastContainer />
      <ThemeToggle />
    </>
  );
};

export default App;
