export interface Analysis {
  id: number;
  input_file: string;
  method: string;
  status: string;
  result_file: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  extra_data: {
    unique_filename?: string;
    timestamp?: number;
    execution_metrics?: {
      execution_time: number;
      sequence_count: number;
      average_sequence_length: number;
    };
    parameters?: {
      method: string;
      mafft: {
        retree: number;
        thread: number;
      } | null;
      uclust: {
        id: number;
        maxlen: number;
      } | null;
    };
  } | null;
} 