const API_URL = import.meta.env.VITE_API_URL;

export const api = {
  // 파일 업로드
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    return response.json();
  },

  // 분석 시작
  startAnalysis: async (uploadId: number, method: 'mafft' | 'uclust') => {
    const response = await fetch(`${API_URL}/analysis/${method}/${uploadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Analysis request failed');
    }

    return response.json();
  },

  // 상태 확인
  checkStatus: async (taskId: string) => {
    const response = await fetch(`${API_URL}/status/${taskId}`);
    
    if (!response.ok) {
      throw new Error('Status check failed');
    }
    
    return response.json();
  },

  // 결과 파일 가져오기
  getResult: async (filename: string) => {
    const response = await fetch(`${API_URL}/analysis/results/${filename}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch result');
    }
    
    return response.text();
  },

  // 업로드 목록 가져오기
  getUploads: async () => {
    const response = await fetch(`${API_URL}/uploads`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch uploads');
    }
    
    return response.json();
  },

  // Bluebase 계산
  calculateBluebase: async (filename: string, method: 'mafft' | 'uclust') => {
    const response = await fetch(`${API_URL}/bluebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        method,
      }),
    });

    if (!response.ok) {
      throw new Error('Bluebase calculation failed');
    }

    return response.json();
  },

  // 결과 파일 다운로드
  downloadResult: async (filename: string) => {
    const response = await fetch(`${API_URL}/analysis/results/${filename}`);
    
    if (!response.ok) {
      throw new Error('Failed to download result');
    }
    
    // 파일 다운로드 처리
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}; 