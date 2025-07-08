import { useState, useEffect, useCallback } from 'react';
import { Navigation } from './components/Navigation';
import { FileUploadSection } from './components/FileUploadSection';
import { RealtimeChart } from './components/RealtimeChart';
import { createSSEConnection, getFileList, checkServerHealth } from './services/api';
import type { AlignmentJob, FileRecord, HealthResponse } from './types';

function App() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [isLoading, setIsLoading] = useState(true);
  const [serverHealth, setServerHealth] = useState<HealthResponse | null>(null);
  const [latestSSEMessage, setLatestSSEMessage] = useState<AlignmentJob | null>(null);

  // 서버 상태 모니터링
  useEffect(() => {
    const checkHealth = async () => {
      const health = await checkServerHealth();
      setServerHealth(health);
    };

    checkHealth();
    const healthInterval = setInterval(checkHealth, 30000);

    return () => clearInterval(healthInterval);
  }, []);

  // 초기 파일 목록 로드
  useEffect(() => {
    const loadInitialFiles = async () => {
      try {
        console.log('📁 초기 파일 목록을 로드합니다...');
        const fileList = await getFileList();
        setFiles(fileList);
        console.log('✅ 파일 목록 로드 완료:', fileList.length, '개');
      } catch (error) {
        console.error('❌ 파일 목록 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialFiles();
  }, []);

  // SSE 메시지 핸들러 - 단순히 최신 메시지만 전달
  const handleSSEMessage = useCallback((job: AlignmentJob) => {
    // KEEP_ALIVE 메시지는 무시
    if (job.taskId === 'KEEP_ALIVE') return;
    
    console.log('🔄 [App.tsx] SSE 메시지 수신:', {
      taskId: job.taskId.substring(0, 8) + '...',
      status: job.status,
      userID: job.userID
    });
    
    // 최신 SSE 메시지를 RealtimeChart에 전달
    setLatestSSEMessage(job);
  }, []);

  const handleSSEOpen = useCallback(() => {
    console.log('🟢 SSE 연결이 열렸습니다.');
    setConnectionStatus('connected');
  }, []);

  const handleSSEError = useCallback((error: Event) => {
    console.error('🔴 SSE 연결 오류:', error);
    setConnectionStatus('error');
  }, []);

  // SSE 연결 시작
  useEffect(() => {
    if (isLoading) return;

    console.log('🔌 SSE 연결을 시작합니다...');
    setConnectionStatus('connecting');
    
    const { cleanup } = createSSEConnection(
      handleSSEMessage,
      handleSSEError,
      handleSSEOpen
    );
    
    return cleanup;
  }, [isLoading, handleSSEMessage, handleSSEError, handleSSEOpen]);

  const handleFileUpload = useCallback((newFile: FileRecord) => {
    setFiles(prev => [newFile, ...prev]);
  }, []);

  const handleFileDelete = useCallback((fileId: number) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-primary font-inter flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary font-inter">
      <Navigation />
      
      {/* 서버 상태 및 연결 상태 표시 */}
      <div className="px-8 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs">
            {/* 서버 상태 */}
            <div className="flex items-center space-x-2">
              <span className="text-text-secondary">서버:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                serverHealth?.status === 'UP' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {serverHealth?.status === 'UP' ? '🟢 정상' : '🔴 오류'}
              </span>
              {serverHealth?.timestamp && (
                <span className="text-text-secondary text-[10px]">
                  {new Date(serverHealth.timestamp).toLocaleTimeString('ko-KR')}
                </span>
              )}
            </div>
            
            {/* SSE 연결 상태 */}
            <div className="flex items-center space-x-2">
              <span className="text-text-secondary">실시간:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                connectionStatus === 'connected' 
                  ? 'bg-green-500/20 text-green-400' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {connectionStatus === 'connected' && '🟢 연결됨'}
                {connectionStatus === 'connecting' && '🟡 연결 중...'}
                {connectionStatus === 'disconnected' && '🔴 연결 끊김'}
                {connectionStatus === 'error' && '🔴 오류'}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-text-secondary">
            파일 {files.length}개
          </div>
        </div>
        
        {/* 서버 상세 정보 */}
        {serverHealth?.details && (
          <div className="mt-1 text-text-secondary text-[10px]">
            {serverHealth.details}
          </div>
        )}
      </div>
      
      <div className="flex min-h-0">
        {/* 왼쪽 사이드바 - 파일 업로드 */}
        <div className="w-[431px] flex-shrink-0 p-8">
          <FileUploadSection 
            files={files}
            onFileUpload={handleFileUpload}
            onFileDelete={handleFileDelete}
          />
        </div>

        {/* 메인 영역 - 실시간 차트 */}
        <div className="flex-1 min-w-0 p-8 pl-0">
          <RealtimeChart latestSSEMessage={latestSSEMessage} />
        </div>
      </div>
    </div>
  );
}

export default App;
