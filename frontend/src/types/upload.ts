export interface Analysis {
  id: number;
  method: string;
  status: string;
  result_file: string | null;
  created_at: string;
  extra_data: any;
}

export interface Upload {
  id: number;
  filename: string;
  created_at: string;
  analyses: Analysis[];
} 