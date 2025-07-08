import { useState, useRef, useCallback } from 'react';
import { uploadFile, deleteFile, startAlignment } from '../services/api';
import { AlignmentModal } from './AlignmentModal';
import { Toast } from './Toast';
import type { FileRecord, AlignmentRequest } from '../types';

// 로딩 스피너
function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[99] bg-black/40">
      <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

interface FileUploadSectionProps {
  files: FileRecord[];
  onFileUpload: (file: FileRecord) => void;
  onFileDelete: (fileId: number) => void;
}

export function FileUploadSection({ files, onFileUpload, onFileDelete }: FileUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Toast 상태
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    isVisible: false,
    message: '',
    type: 'success',
  });

  // Upload 확인 Modal 상태
  const [uploadConfirmModal, setUploadConfirmModal] = useState<{
    isOpen: boolean;
    selectedFile: File | null;
  }>({
    isOpen: false,
    selectedFile: null,
  });

  // Alignment Modal 상태 관리
  const [alignmentModal, setAlignmentModal] = useState<{
    isOpen: boolean;
    fileId: number | null;
    fileName: string;
  }>({
    isOpen: false,
    fileId: null,
    fileName: '',
  });

  // Toast 표시 함수
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ isVisible: true, message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const file = droppedFiles[0];
    if (file) {
      setUploadConfirmModal({
        isOpen: true,
        selectedFile: file,
      });
    }
  }, []);

  // 업로드 확인 Modal에서 확인 클릭 시
  const handleUploadConfirm = useCallback(async () => {
    setUploadConfirmModal({ isOpen: false, selectedFile: null });
    setUploading(true);
    if (uploadConfirmModal.selectedFile) {
      await handleFileUpload(uploadConfirmModal.selectedFile);
    }
    setUploading(false);
  }, [uploadConfirmModal.selectedFile]);

  const handleUploadCancel = useCallback(() => {
    setUploadConfirmModal({
      isOpen: false,
      selectedFile: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file) return;
      const supportedExtensions = ['.fasta', '.fa', '.fastq', '.fq'];
      const fileName = file.name.toLowerCase();
      const isSupported = supportedExtensions.some((ext) => fileName.endsWith(ext));
      if (!isSupported) {
        showToast('지원하는 파일 형식: .fasta, .fa, .fastq, .fq', 'warning');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      try {
        console.log(file);
        const uploadResponse = await uploadFile(file);
        const newFile: FileRecord = {
          id: parseInt(uploadResponse.fileId),
          filename: uploadResponse.fileName,
          createdAt: new Date().toISOString(),
          size: uploadResponse.size,
        };
        onFileUpload(newFile);
        showToast('파일이 성공적으로 업로드되었습니다.', 'success');
      } catch (error) {
        showToast('파일 업로드에 실패했습니다.', 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onFileUpload, showToast]
  );

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadConfirmModal({
        isOpen: true,
        selectedFile: file,
      });
    }
  }, []);

  const handleDeleteFile = useCallback(
    async (fileId: number) => {
      try {
        await deleteFile(fileId);
        onFileDelete(fileId);
        showToast('파일이 성공적으로 삭제되었습니다.', 'success');
      } catch (error) {
        showToast('파일 삭제에 실패했습니다.', 'error');
      }
    },
    [onFileDelete, showToast]
  );

  const handleAlign = useCallback((fileId: number, fileName: string) => {
    setAlignmentModal({
      isOpen: true,
      fileId,
      fileName,
    });
  }, []);

  const handleAlignmentConfirm = useCallback(
    async (alignmentRequest: AlignmentRequest) => {
      if (!alignmentModal.fileId) return;
      try {
        const result = await startAlignment(alignmentModal.fileId, alignmentRequest);
        console.log('정렬 작업 시작됨:', result);
        showToast('정렬 작업이 시작되었습니다.', 'success');
      } catch (error) {
        showToast('정렬 작업을 시작할 수 없습니다.', 'error');
      }
    },
    [alignmentModal.fileId, showToast]
  );

  const handleAlignmentClose = useCallback(() => {
    setAlignmentModal({
      isOpen: false,
      fileId: null,
      fileName: '',
    });
  }, []);

  const formatFileSize = (size: string) => {
    if (size.includes('KB') || size.includes('MB') || size.includes('GB')) {
      return size;
    }
    const bytes = parseInt(size);
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}MB`;
    return `${Math.round(bytes / (1024 * 1024 * 1024))}GB`;
  };

  return (
    <div className="w-full">
      <h2 className="text-white text-xs mb-6">내 input 파일</h2>
      
      {/* 파일 업로드 영역 */}
      <div className="mb-4">
        <div 
          className={`w-full h-[151px] transition-colors flex flex-col items-center justify-center cursor-pointer ${
            isDragging ? 'border-blue-400' : ''
          }`}
          style={{ 
            backgroundColor: isDragging ? '#1a202c' : '#22252f',
            border: 'none'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-xs mb-4" style={{ color: '#9f9f9f' }}>
            {uploading ? '업로드 중...' : '여기에 파일을 drag 하세요'}
          </span>
          {!uploading && (
            <button 
              className="px-4 py-1.5 text-xs rounded hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#3f3c3c', color: '#b7b7b7' }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              파일찾기
            </button>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".fasta,.fa,.fastq,.fq"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* 파일 목록 */}
      <div className="rounded" style={{ backgroundColor: '#17171c' }}>
        <div 
          className="h-[524px] overflow-y-auto pr-2"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#9ca3af transparent'
          }}
        >
          {files.map((file) => (
            <div key={file.id} className="flex items-center px-6 py-2 text-white text-xs hover:bg-white/5 transition-colors">
              <span className="w-4">{file.id}</span>
              <span className="flex-1 ml-6 truncate" title={file.filename}>{file.filename}</span>
              <span className="w-12 ml-4">{formatFileSize(file.size.toString())}</span>
              <button 
                className="ml-4 px-3 py-1 text-white text-[10px] rounded hover:opacity-80 transition-opacity flex-shrink-0"
                style={{ backgroundColor: '#005aeb' }}
                onClick={() => handleAlign(file.id, file.filename)}
              >
                align
              </button>
              <button 
                className="ml-4 text-base hover:opacity-70 transition-opacity flex-shrink-0"
                onClick={() => handleDeleteFile(file.id)}
              >
                🗑️
              </button>
            </div>
          ))}
          
          {/* 빈 상태 메시지 */}
          {files.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500 text-xs">
              업로드된 파일이 없습니다
            </div>
          )}
        </div>
      </div>

      {/* Alignment Modal */}
      <AlignmentModal
        isOpen={alignmentModal.isOpen}
        onClose={handleAlignmentClose}
        onConfirm={handleAlignmentConfirm}
        fileName={alignmentModal.fileName}
      />

      {/* Upload Confirmation Modal */}
      {uploadConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">📁</span>
              <h3 className="text-lg font-semibold text-white">파일 업로드 확인</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-300 mb-2">다음 파일을 업로드하시겠습니까?</p>
              <div className="bg-gray-700 rounded p-3 border border-gray-600">
                <div className="text-white font-medium">
                  {uploadConfirmModal.selectedFile?.name}
                </div>
                <div className="text-gray-400 text-sm">
                  크기: {uploadConfirmModal.selectedFile?.size ? `${Math.round(uploadConfirmModal.selectedFile.size / 1024)}KB` : 'Unknown'}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleUploadCancel}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUploadConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                업로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 업로드 중 애니메이션 */}
      {uploading && <Spinner />}

      {/* 토스트 알림 */}
      <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={closeToast} duration={3000} />
    </div>
  );
} 