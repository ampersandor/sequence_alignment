export type AlignmentMethod = 'mafft' | 'uclust';

export interface AnalysisMetrics {
  execution_time: number;
  sequence_count: number;
  average_sequence_length: number;
}

export interface AnalysisParameters {
  method: string;
  mafft?: {
    retree: number;
    thread: number;
  };
  uclust?: {
    id: number;
    maxlen: number;
  };
}

export interface TaskResult {
  status: string;
  result_file?: string;
  metrics?: {
    execution_metrics: AnalysisMetrics;
    parameters: AnalysisParameters;
  };
  error?: string;
  progress?: number;
}

export interface TaskStatus {
  status: string;
  result?: TaskResult;
  error?: string;
} 