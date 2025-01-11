export interface Analysis {
  id: number;
  upload_id: number;
  method: string;
  status: string;
  result_file: string | null;
  error: string | null;
  extra_data: {
    task_id?: string;
    start_time?: string;
  } | null;
  bluebase_result?: {
    alignment_stats_file: string;
    gap_stats_file: string;
    created_at: string;
  };
  created_at: string;
} 