import { Analysis } from './analysis'

export interface Upload {
  id: number;
  filename: string;
  created_at: string;
  analyses: Analysis[];
} 