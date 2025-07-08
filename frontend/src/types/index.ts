// 파일 관리 관련 타입
export interface FileRecord {
  id: number;
  filename: string;
  createdAt: string;
  size: number;
}

export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  size: number;
}

// 정렬 작업 관련 타입
export interface AlignmentJob {
  taskId: string;
  userID: number;
  inputPath: string;
  inputFileRecordId: number;
  alignTool: 'mafft' | 'uclust' | 'vsearch';
  options: string;
  createdAt: string;
  updatedAt: string;
  outputFileRecordId?: number;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  progress?: number;
  message?: string;
}

export interface AlignmentRequest {
  user_id: number;
  align_tool: 'mafft' | 'uclust' | 'vsearch';
  options: string;
}

export interface AlignmentJobResponse {
  taskId: string;
  userID: number;
  inputPath: string;
  inputFileRecordId: number;
  alignTool: 'mafft' | 'uclust' | 'vsearch';
  options: string;
  createdAt: string;
  updatedAt: string;
  outputFileRecordId?: number;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  message?: string;
}

// Health API 타입
export interface HealthResponse {
  status: "UP" | "DOWN";
  timestamp: string;
  details: string;
}

// UI 관련 타입
export interface FilterOption {
  label: string;
  value: string;
  type: 'input' | 'tool' | 'user';
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
} 