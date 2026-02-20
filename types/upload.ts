export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface UploadProgress {
  file: File;
  progress: number;
  status: UploadStatus;
  cid?: string;
  error?: string;
}
