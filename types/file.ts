export interface FileVersion {
  version: number;
  cid: string;
  size: number;
  date: string;
  hash?: string;
}

export type VerifyStatus = 'pending' | 'verifying' | 'ok' | 'failed';

export interface FileRecord {
  id: string | number;
  name: string;
  size: number;
  cid: string;
  date: string;
  folder_id?: string;
  hash?: string;
  verified?: boolean;
  verify_status?: VerifyStatus;
  verify_message?: string;
  uploadedAt?: number;
  tags?: string[];
  version?: number;
  versions?: FileVersion[];
}
