import React, { useState, useRef, useEffect } from 'react';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';

interface ProfileModalProps { onClose: () => void; }

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { myProfile, fetchMyProfile, updateProfile, uploadImage, deleteImage } = useProfileStore();
  const { user } = useAuthStore();
  const [statusMessage, setStatusMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchMyProfile(); }, []);
  useEffect(() => { if (myProfile) { setStatusMessage(myProfile.status_message || ''); setUsername(myProfile.username || ''); } }, [myProfile]);
  useEffect(() => { if (isEditingStatus) statusRef.current?.focus(); }, [isEditingStatus]);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { showToast('이미지 파일만 업로드 가능합니다.', false); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('이미지 크기는 5MB 이하여야 합니다.', false); return; }
    setIsUploadingImage(true);
    try { await uploadImage(file); showToast('프로필 사진이 업데이트되었습니다.'); }
    catch { showToast('업로드 실패', false); }
    finally { setIsUploadingImage(false); }
  };

  const handleSaveStatus = async () => {
    setIsSaving(true);
    try { await updateProfile({ status_message: statusMessage }); setIsEditingStatus(false); showToast('상태 메시지가 저장되었습니다.'); }
    catch (e: any) { showToast(e.response?.data?.detail || '저장 실패', false); }
    finally { setIsSaving(false); }
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) return;
    setIsSaving(true);
    try { await updateProfile({ username: username.trim() }); setIsEditingUsername(false); showToast('이름이 변경되었습니다.'); }
    catch (e: any) { showToast(e.response?.data?.detail || '저장 실패', false); }
    finally { setIsSaving(false); }
  };

  const profileImageUrl = myProfile?.profile_image ? `http://localhost:8000${myProfile.profile_image}` : null;
  const initials = (myProfile?.username || user?.username || '?')[0].toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-xl">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">내 프로필</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* 프로필 사진 */}
          <div className="flex flex-col items-center gap-3">
            <div
              className={`relative group cursor-pointer transition-transform ${dragOver ? 'scale-105' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f); }}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) { handleImageFile(e.target.files[0]); e.target.value = ''; } }} />
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-blue-400 transition-colors">
                {isUploadingImage ? (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : profileImageUrl ? (
                  <img src={profileImageUrl} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xl font-bold text-white">
                    {initials}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="text-xs text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors">사진 변경</button>
              {profileImageUrl && <button onClick={async () => { await deleteImage(); showToast('삭제되었습니다.'); }} className="text-xs text-red-500 hover:text-red-600 px-3 py-1.5 bg-red-50 rounded-lg transition-colors">사진 삭제</button>}
            </div>
            <p className="text-xs text-gray-400">클릭하거나 드래그하여 업로드 (최대 5MB)</p>
          </div>

          {/* 유저명 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">이름</label>
            <div className="flex items-center gap-2">
              {isEditingUsername ? (
                <>
                  <input value={username} onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveUsername(); if (e.key === 'Escape') { setIsEditingUsername(false); setUsername(myProfile?.username || ''); } }}
                    className="input-field flex-1 text-sm py-2" maxLength={20} autoFocus />
                  <button onClick={handleSaveUsername} disabled={isSaving} className="btn-primary text-xs px-3 py-2">
                    {isSaving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '저장'}
                  </button>
                  <button onClick={() => { setIsEditingUsername(false); setUsername(myProfile?.username || ''); }} className="btn-secondary text-xs px-2 py-2">취소</button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-800 flex-1">{myProfile?.username || user?.username}</p>
                  <button onClick={() => setIsEditingUsername(true)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 이메일 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</label>
            <p className="text-sm text-gray-500">{myProfile?.email || user?.email}</p>
          </div>

          {/* 상태 메시지 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">상태 메시지</label>
            {isEditingStatus ? (
              <div className="space-y-2">
                <input ref={statusRef} value={statusMessage} onChange={e => setStatusMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveStatus(); if (e.key === 'Escape') { setIsEditingStatus(false); setStatusMessage(myProfile?.status_message || ''); } }}
                  placeholder="상태 메시지를 입력하세요" className="input-field w-full text-sm py-2" maxLength={100} />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{statusMessage.length}/100</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setIsEditingStatus(false); setStatusMessage(myProfile?.status_message || ''); }} className="btn-secondary text-xs py-1.5 px-3">취소</button>
                    <button onClick={handleSaveStatus} disabled={isSaving} className="btn-primary text-xs py-1.5 px-3">
                      {isSaving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '저장'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div onClick={() => setIsEditingStatus(true)}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors group border border-gray-200 hover:border-gray-300">
                <p className={`text-sm flex-1 ${statusMessage ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                  {statusMessage || '상태 메시지를 입력해보세요'}
                </p>
                <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
            )}
          </div>
        </div>

        {toast && (
          <div className={`mx-6 mb-4 px-4 py-2.5 rounded-xl text-sm border ${toast.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
