import React, { useState } from 'react';
import { useChatStore } from '../../stores/chatStore';

const fileTypeColor: Record<string, string> = {
  pdf: 'text-red-400 bg-red-400/10',
  txt: 'text-slate-400 bg-slate-400/10',
  docx: 'text-blue-400 bg-blue-400/10',
  xlsx: 'text-green-400 bg-green-400/10',
  xls: 'text-green-400 bg-green-400/10',
  pptx: 'text-orange-400 bg-orange-400/10',
  ppt: 'text-orange-400 bg-orange-400/10',
  hwp: 'text-teal-400 bg-teal-400/10',
};

const DocumentPanel: React.FC = () => {
  const { documents, isUploading, uploadDocument, fetchDocuments, deleteDocument, currentRoomId } = useChatStore();
  const [dragOver, setDragOver] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  React.useEffect(() => { if (currentRoomId) fetchDocuments(currentRoomId); }, [currentRoomId]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFile = async (file: File) => {
    try {
      await uploadDocument(file);
      showToast(`✅ ${file.name} 업로드 완료!`);
    } catch (err: any) {
      showToast(`❌ ${err.message || '업로드 실패'}`, 'error');
    }
  };

  const handleDelete = async (docId: number) => {
    if (confirmDelete === docId) {
      await deleteDocument(docId);
      showToast('🗑️ 문서가 삭제되었습니다.');
      setConfirmDelete(null);
    } else {
      setConfirmDelete(docId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (!currentRoomId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm">채팅방을 선택하거나<br />새 채팅을 시작해주세요</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 현재 채팅방 표시 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 border border-blue-500/20 rounded-lg">
        <div className="w-2 h-2 bg-blue-500 rounded-full" />
        <p className="text-xs text-blue-400">채팅방 #{currentRoomId}의 문서</p>
      </div>

      {/* 업로드 영역 */}
      <div
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.docx,.xlsx,.xls,.pptx,.ppt,.hwp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">업로드 중...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-slate-300 text-sm font-medium">파일을 드래그하거나 클릭</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {['PDF', 'TXT', 'DOCX', 'XLSX', 'PPTX', 'HWP'].map((ext) => (
                <span key={ext} className="text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">{ext}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 문서 목록 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          문서 목록 ({documents.length})
        </p>
        {documents.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-4">이 채팅방에 문서가 없습니다</p>
        ) : (
          documents.map((doc) => {
            const colorClass = fileTypeColor[doc.file_type] || 'text-slate-400 bg-slate-400/10';
            return (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700/50 group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">{doc.filename}</p>
                  <p className="text-slate-500 text-xs">{doc.chunk_count} chunks</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-md uppercase font-medium ${colorClass}`}>
                    {doc.file_type}
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                      confirmDelete === doc.id
                        ? 'bg-red-500 text-white'
                        : 'text-slate-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title={confirmDelete === doc.id ? '한 번 더 클릭하면 삭제' : '삭제'}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 border px-4 py-3 rounded-xl shadow-xl text-sm transition-all ${
          toast.type === 'error' ? 'bg-red-900/80 border-red-700 text-red-200' : 'bg-slate-800 border-slate-700 text-slate-200'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default DocumentPanel;
