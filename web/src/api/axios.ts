import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터 - JWT 자동 첨부
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 - 401 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // /auth/ 경로는 401 처리 건너뜀 (로그인 실패 등)
      const url = error.config?.url || '';
      if (!url.includes('/auth/')) {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('auth-storage');
        // 이미 로그인 페이지면 리다이렉트 안 함 (무한 루프 방지)
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
