import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../api/axios';
import { useAuthStore } from '../stores/authStore';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
const PERSONA_NAMES: Record<string, string> = { default: '기본 AI', interviewer: '면접관', english_tutor: '영어 튜터', code_reviewer: '코드 리뷰어', writer: '글쓰기 코치', debate: '토론 파트너', custom: '커스텀' };
const PERSONA_EMOJI: Record<string, string> = { default: '🤖', interviewer: '👔', english_tutor: '🗣️', code_reviewer: '💻', writer: '✍️', debate: '⚖️', custom: '⚙️' };

const StatCard: React.FC<{ title: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; trend?: number }> = ({ title, value, sub, icon, color, trend }) => (
  <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      {trend !== undefined && trend > 0 && <span className="text-xs font-medium px-2 py-1 rounded-lg bg-green-500/20 text-green-400">↑ {trend}</span>}
    </div>
    <p className="text-2xl font-bold text-slate-100">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    <p className="text-sm text-slate-400 mt-1">{title}</p>
    {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
  </div>
);

// ─── 내 대시보드 ──────────────────────────────────
const MyDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/api/v1/stats/my').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-slate-500 text-center py-12">데이터를 불러올 수 없습니다.</p>;

  const combinedDaily = data.ai_chat.daily.map((d: any, i: number) => ({
    date: d.date, 'AI 채팅': d.count, '유저 채팅': data.user_chat.daily[i]?.count || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="AI 채팅방" value={data.ai_chat.total_rooms} sub={`이번 주 ${data.ai_chat.messages_this_week}개 메시지`}
          icon={<svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
          color="bg-blue-500/20" trend={data.ai_chat.messages_this_week} />
        <StatCard title="업로드 문서" value={data.documents.total} sub={`총 ${data.documents.total_chunks.toLocaleString()} 청크`}
          icon={<svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          color="bg-violet-500/20" />
        <StatCard title="유저 채팅방" value={data.user_chat.total_rooms} sub={`이번 주 ${data.user_chat.messages_this_week}개 메시지`}
          icon={<svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
          color="bg-green-500/20" trend={data.user_chat.messages_this_week} />
        <StatCard title="친구" value={data.user_chat.friends_count}
          icon={<svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          color="bg-amber-500/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">최근 7일 활동</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={combinedDaily}>
              <defs>
                <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Area type="monotone" dataKey="AI 채팅" stroke="#3b82f6" fill="url(#aiGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="유저 채팅" stroke="#10b981" fill="url(#userGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">문서 타입 분포</h3>
          {data.documents.by_type.length === 0 ? (
            <div className="flex items-center justify-center h-[220px]"><p className="text-slate-600 text-sm">업로드된 문서 없음</p></div>
          ) : (<>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={data.documents.by_type.map((d: any) => ({ name: d.type.toUpperCase(), value: d.count }))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                  {data.documents.by_type.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {data.documents.by_type.map((d: any, i: number) => (
                <div key={d.type} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-slate-400">{d.type.toUpperCase()} ({d.count})</span>
                </div>
              ))}
            </div>
          </>)}
        </div>
      </div>

      {data.persona_usage.length > 0 && (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">페르소나 사용 현황</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {data.persona_usage.map((p: any) => (
              <div key={p.persona_id} className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 border border-slate-700/30 rounded-xl">
                <span className="text-2xl">{PERSONA_EMOJI[p.persona_id] || '🤖'}</span>
                <span className="text-xs text-slate-400 text-center">{PERSONA_NAMES[p.persona_id] || p.persona_id}</span>
                <span className="text-lg font-bold text-slate-200">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 관리자 대시보드 ──────────────────────────────
const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const loadData = () => { setLoading(true); api.get('/api/v1/stats/admin/overview').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  const loadUsers = (p = 1) => { setUsersLoading(true); api.get(`/api/v1/stats/admin/users?page=${p}&limit=20`).then(r => { setUsers(r.data); setUsersLoading(false); }).catch(() => setUsersLoading(false)); };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (activeTab === 'users') loadUsers(page); }, [activeTab, page]);

  const handleToggleActive = async (userId: number) => {
    try {
      const r = await api.patch(`/api/v1/stats/admin/users/${userId}/toggle`);
      showToast(`✅ ${r.data.username} 상태 변경: ${r.data.is_active ? '활성' : '비활성'}`);
      loadUsers(page);
    } catch (e: any) { showToast(`❌ ${e.response?.data?.detail || '오류'}`, false); }
  };

  const handleToggleAdmin = async (userId: number) => {
    try {
      const r = await api.patch(`/api/v1/stats/admin/users/${userId}/toggle-admin`);
      showToast(`✅ ${r.data.username} 관리자: ${r.data.is_admin ? 'ON' : 'OFF'}`);
      loadUsers(page);
    } catch (e: any) { showToast(`❌ ${e.response?.data?.detail || '오류'}`, false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </div>
      <div className="text-center">
        <p className="text-slate-200 font-medium">관리자 권한이 없습니다</p>
        <p className="text-slate-500 text-sm mt-1">관리자 계정으로 로그인하거나<br />DB에서 is_admin = true 로 설정하세요</p>
      </div>
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 font-mono text-xs text-slate-400 mt-2">
        UPDATE users SET is_admin = TRUE<br />WHERE email = '본인이메일';
      </div>
    </div>
  );

  const s = data.summary;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-slate-900 border border-slate-700/50 rounded-xl p-1 w-fit">
        {(['overview', 'users'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t === 'overview' ? '📊 현황 개요' : '👥 유저 관리'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="전체 유저" value={s.total_users} sub={`오늘 +${s.new_users_today} / 이번주 +${s.new_users_week}`}
              icon={<svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              color="bg-blue-500/20" trend={s.new_users_today} />
            <StatCard title="현재 접속자" value={s.online_users}
              icon={<div className="w-5 h-5 bg-green-500 rounded-full animate-pulse" />} color="bg-green-500/20" />
            <StatCard title="전체 AI 메시지" value={s.total_ai_messages} sub={`오늘 ${s.ai_messages_today}개`}
              icon={<svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
              color="bg-violet-500/20" trend={s.ai_messages_today} />
            <StatCard title="전체 유저 채팅" value={s.total_user_messages} sub={`오늘 ${s.user_messages_today}개`}
              icon={<svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
              color="bg-green-500/20" trend={s.user_messages_today} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="업로드 문서" value={s.total_docs} sub={`총 ${s.total_chunks.toLocaleString()} 청크`}
              icon={<svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              color="bg-amber-500/20" />
            <StatCard title="웹검색 활성 방" value={s.web_search_rooms}
              icon={<svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>}
              color="bg-cyan-500/20" />
            <StatCard title="유저 채팅방" value={s.total_user_rooms}
              icon={<svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-1" /></svg>}
              color="bg-pink-500/20" />
            <StatCard title="친구 관계" value={s.total_friendships}
              icon={<svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
              color="bg-rose-500/20" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">신규 가입자 (최근 14일)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.charts.daily_users}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                  <Bar dataKey="count" name="신규 유저" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">전체 메시지 추이 (최근 14일)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.charts.daily_messages}>
                  <defs>
                    <linearGradient id="aiGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                    <linearGradient id="userGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  <Area type="monotone" dataKey="ai" name="AI 채팅" stroke="#8b5cf6" fill="url(#aiGrad2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="user" name="유저 채팅" stroke="#10b981" fill="url(#userGrad2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">문서 타입별 업로드</h3>
              {data.charts.docs_by_type.length === 0
                ? <div className="flex items-center justify-center h-[200px]"><p className="text-slate-600 text-sm">업로드된 문서 없음</p></div>
                : <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.charts.docs_by_type} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis type="category" dataKey="type" tick={{ fill: '#94a3b8', fontSize: 12 }} width={45} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                    <Bar dataKey="count" name="문서 수" radius={[0, 4, 4, 0]}>{data.charts.docs_by_type.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>}
            </div>
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">페르소나 사용 분포</h3>
              {data.charts.persona_usage.length === 0
                ? <div className="flex items-center justify-center h-[200px]"><p className="text-slate-600 text-sm">데이터 없음</p></div>
                : <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.charts.persona_usage.map((p: any) => ({ name: PERSONA_NAMES[p.persona_id] || p.persona_id, value: p.count }))}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#475569' }}>
                      {data.charts.persona_usage.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">🏆 AI 채팅 Top 5</h3>
              <div className="space-y-3">
                {data.top_users.ai_chat.map((u: any, i: number) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/30 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>{i + 1}</span>
                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">{u.username[0].toUpperCase()}</div>
                    <p className="text-sm text-slate-200 flex-1 truncate">{u.username}</p>
                    <span className="text-xs text-slate-500">{u.count}개</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">🏆 유저 채팅 Top 5</h3>
              <div className="space-y-3">
                {data.top_users.user_chat.map((u: any, i: number) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/30 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>{i + 1}</span>
                    <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-xs font-bold text-white">{u.username[0].toUpperCase()}</div>
                    <p className="text-sm text-slate-200 flex-1 truncate">{u.username}</p>
                    <span className="text-xs text-slate-500">{u.count}개</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">🆕 최근 가입</h3>
              <div className="space-y-3">
                {data.recent_users.slice(0, 5).map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{u.username[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-slate-200 truncate">{u.username}</p>
                        {u.is_admin && <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">관리자</span>}
                      </div>
                      <p className="text-xs text-slate-500">{new Date(u.joined).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-slate-600'}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">전체 유저 목록</h3>
              {users && <p className="text-xs text-slate-500 mt-0.5">총 {users.total}명</p>}
            </div>
            <button onClick={() => loadUsers(page)} className="btn-secondary text-xs py-1.5 px-3">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              새로고침
            </button>
          </div>
          {usersLoading
            ? <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
            : <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      {['유저', '이메일', 'AI 메시지', '유저 채팅', '문서', '가입일', '상태', '관리'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {users?.users.map((u: any) => (
                      <tr key={u.id} className={`hover:bg-slate-800/50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                {u.username[0].toUpperCase()}
                              </div>
                              {u.is_online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900" />}
                            </div>
                            <div>
                              <span className="text-sm text-slate-200 font-medium">{u.username}</span>
                              {u.is_admin && <span className="ml-1.5 text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">관리자</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">{u.email}</td>
                        <td className="px-4 py-3"><span className="text-sm font-medium text-violet-400">{u.ai_messages.toLocaleString()}</span></td>
                        <td className="px-4 py-3"><span className="text-sm font-medium text-green-400">{u.user_messages.toLocaleString()}</span></td>
                        <td className="px-4 py-3"><span className="text-sm text-slate-400">{u.documents}</span></td>
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.joined).toLocaleDateString('ko-KR')}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                            {u.is_active ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {/* 활성/비활성 토글 */}
                            <button onClick={() => handleToggleActive(u.id)}
                              className={`text-xs px-2 py-1.5 rounded-lg transition-colors ${u.is_active ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>
                              {u.is_active ? '비활성화' : '활성화'}
                            </button>
                            {/* 관리자 권한 토글 */}
                            <button onClick={() => handleToggleAdmin(u.id)}
                              className={`text-xs px-2 py-1.5 rounded-lg transition-colors ${u.is_admin ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}>
                              {u.is_admin ? '🛡 관리자' : '관리자 ↑'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users && users.total > users.limit && (
                <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between">
                  <p className="text-xs text-slate-500">{users.total}명 중 {(page - 1) * users.limit + 1}~{Math.min(page * users.limit, users.total)}명</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">이전</button>
                    <span className="text-xs text-slate-400 flex items-center px-2">{page} / {Math.ceil(users.total / users.limit)}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page * users.limit >= users.total} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">다음</button>
                  </div>
                </div>
              )}
            </>}
        </div>
      )}

      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl text-sm z-50 border ${toast.ok ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-red-900/80 border-red-700 text-red-200'}`}>{toast.msg}</div>}
    </div>
  );
};

// ─── 대시보드 메인 ────────────────────────────────
const DashboardPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'my' | 'admin'>('my');

  return (
    <div className="fixed inset-0 bg-slate-950 z-40 flex flex-col">
      <header className="h-14 border-b border-slate-700/50 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h1 className="text-sm font-bold text-slate-100">대시보드</h1>
          </div>

          {/* 탭 - 관리자만 🛡 탭 표시 */}
          <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
            <button onClick={() => setTab('my')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'my' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
              👤 내 통계
            </button>
            {user?.is_admin && (
              <button onClick={() => setTab('admin')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'admin' ? 'bg-amber-600/80 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                🛡 관리자
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.is_admin && <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg font-medium">🛡 관리자</span>}
          <p className="text-xs text-slate-500">{user?.username}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {tab === 'my' ? <MyDashboard /> : <AdminDashboard />}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
