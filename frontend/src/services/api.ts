import type { FileRecord, FileUploadResponse, AlignmentRequest, AlignmentJobResponse, AlignmentJob, HealthResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 파일 업로드
export async function uploadFile(file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  console.log(formData);
  const response = await fetch(`${API_BASE_URL}/file/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('파일 업로드에 실패했습니다.');
  }

  return response.json();
}

// 파일 목록 조회
export async function getFileList(): Promise<FileRecord[]> {
  const response = await fetch(`${API_BASE_URL}/file/list`);
  
  if (!response.ok) {
    throw new Error('파일 목록을 가져올 수 없습니다.');
  }

  return response.json();
}

// 파일 다운로드
export async function downloadFile(fileId: number, filename: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/file/download/${fileId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`파일 다운로드 실패: ${response.statusText}`);
    }

    // 응답을 blob으로 변환
    const blob = await response.blob();
    
    // blob을 다운로드할 수 있는 URL 생성
    const url = window.URL.createObjectURL(blob);
    
    // 다운로드 링크 생성 및 클릭
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    
    // 정리
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log(`✅ 파일 다운로드 완료: ${filename}`);
  } catch (error) {
    console.error('❌ 파일 다운로드 오류:', error);
    throw new Error('파일 다운로드에 실패했습니다.');
  }
}

// 정렬 작업 시작
export async function startAlignment(
  fileId: number, 
  request: AlignmentRequest
): Promise<AlignmentJobResponse> {
  const response = await fetch(`${API_BASE_URL}/align/${fileId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('정렬 작업을 시작할 수 없습니다.');
  }

  return response.json();
}

// 백엔드 서버 상태 확인 (새로운 health API 사용)
export async function checkServerHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5초 타임아웃
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.warn('서버 상태 확인 실패:', error);
    return null;
  }
}

// 정렬 작업 목록 조회 (페이징)
export async function getAlignmentJobs(page: number = 1, size: number = 10): Promise<AlignmentJob[]> {
  // Spring Boot 표준 정렬 파라미터 추가: createdAt 기준 내림차순(최신순)
  const sortParam = 'createdAt';
  const response = await fetch(`${API_BASE_URL}/align/jobs?page=${page}&size=${size}&sort=${sortParam},desc`);
  
  if (!response.ok) {
    throw new Error('정렬 작업 목록을 가져올 수 없습니다.');
  }

  return response.json();
}

// SSE 연결을 위한 함수 (업데이트만 처리하도록 수정)
export function createSSEConnection(
  onMessage: (job: AlignmentJob) => void, 
  onError?: (error: Event) => void,
  onOpen?: () => void
): { eventSource: EventSource | null; cleanup: () => void } {
  let eventSource: EventSource | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;
  const reconnectDelay = 10000; // 10초로 증가
  let reconnectTimer: NodeJS.Timeout | null = null;
  let isConnecting = false;
  let hasConnectedSuccessfully = false;

  const cleanup = () => {
    console.log('🧹 SSE 연결을 정리합니다...');
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    isConnecting = false;
    reconnectAttempts = 0;
    hasConnectedSuccessfully = false;
  };

  const connect = async () => {
    // 이미 연결되어 있거나 연결 중이면 중단
    if (isConnecting || (eventSource?.readyState === EventSource.OPEN)) {
      console.log('⏸️ SSE 연결 시도 중단: 이미 연결됨 또는 연결 중');
      return;
    }

    isConnecting = true;
    console.log('🔄 SSE 연결을 시도합니다...');

    // 서버 상태 확인
    const healthStatus = await checkServerHealth();
    if (!healthStatus || healthStatus.status !== 'UP') {
      console.warn('⚠️ 서버가 준비되지 않았습니다:', healthStatus);
      isConnecting = false;
      
      // 서버가 다운된 경우에만 재연결 시도
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`🔄 서버 복구 대기 중... ${reconnectAttempts}/${maxReconnectAttempts} (${reconnectDelay}ms 후)`);
        reconnectTimer = setTimeout(connect, reconnectDelay);
      }
      return;
    }

    try {
      // 페이지네이션 파라미터 없이 스트림 연결 (업데이트만 받음)
      eventSource = new EventSource(`${API_BASE_URL}/align/stream`);
      
      eventSource.onopen = () => {
        console.log('✅ SSE 연결이 성공적으로 열렸습니다.');
        reconnectAttempts = 0; // 성공 시 재연결 카운터 리셋
        isConnecting = false;
        hasConnectedSuccessfully = true;
        
        if (onOpen) {
          onOpen();
        }
      };
      
      eventSource.onmessage = (event) => {
        try {
          const job: AlignmentJob = JSON.parse(event.data);
          // 업데이트 메시지만 처리 (KEEP_ALIVE 제외)
          if (job.taskId !== 'KEEP_ALIVE') {
            console.log('📨 SSE 업데이트 수신:', job);
            onMessage(job);
          }
        } catch (error) {
          console.error('❌ SSE 메시지 파싱 오류:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE 연결 오류:', error);
        isConnecting = false;
        
        const readyState = eventSource?.readyState;
        console.log('🔍 SSE 연결 상태:', readyState);
        
        if (onError) {
          onError(error);
        }

        // 연결 정리
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        // 이전에 성공적으로 연결된 적이 있거나, 최대 재연결 횟수를 초과하지 않은 경우에만 재연결 시도
        if (!hasConnectedSuccessfully && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`🔄 SSE 재연결 시도 ${reconnectAttempts}/${maxReconnectAttempts} (${reconnectDelay}ms 후)`);
          reconnectTimer = setTimeout(connect, reconnectDelay);
        } else {
          if (hasConnectedSuccessfully) {
            console.log('ℹ️ 이전에 연결된 적이 있으므로 자동 재연결하지 않습니다.');
          } else {
            console.error('💥 최대 SSE 재연결 시도 횟수를 초과했습니다.');
          }
        }
      };

    } catch (error) {
      console.error('❌ SSE 연결 생성 오류:', error);
      isConnecting = false;
      
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`🔄 SSE 재연결 시도 ${reconnectAttempts}/${maxReconnectAttempts} (${reconnectDelay}ms 후)`);
        reconnectTimer = setTimeout(connect, reconnectDelay);
      }
    }
  };

  // 초기 연결 시도
  connect();

  return { eventSource, cleanup };
}

// 파일 삭제 (API 문서에는 없지만 UI에서 필요)
export async function deleteFile(fileId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/file/${fileId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('파일 삭제에 실패했습니다.');
  }
} 