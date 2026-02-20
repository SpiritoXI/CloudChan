import type { Gateway } from './gateway';

export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface DownloadTask {
  id: string;
  cid: string;
  filename: string;
  fileSize: number;
  status: DownloadStatus;
  progress: number;
  downloadedBytes: number;
  speed: number;
  remainingTime: number;
  startTime: number;
  endTime?: number;
  gateway: Gateway;
  gatewayIndex: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  blob?: Blob;
}

export interface DownloadOptions {
  maxRetries?: number;
  maxGatewaySwitches?: number;
  timeout?: number;
  chunkSize?: number;
  onProgress?: (task: DownloadTask) => void;
  onStatusChange?: (task: DownloadTask) => void;
  onGatewaySwitch?: (oldGateway: Gateway, newGateway: Gateway) => void;
  onComplete?: (task: DownloadTask) => void;
  onError?: (task: DownloadTask, error: Error) => void;
}

export interface DownloadHistory {
  id: string;
  cid: string;
  filename: string;
  fileSize: number;
  gatewayName: string;
  gatewayUrl: string;
  downloadTime: number;
  duration: number;
  averageSpeed: number;
  success: boolean;
  errorMessage?: string;
}

export interface DownloadQueueConfig {
  maxConcurrent: number;
  maxRetries: number;
  maxGatewaySwitches: number;
  timeout: number;
  autoStart: boolean;
}

export interface DownloadStats {
  totalDownloads: number;
  successfulDownloads: number;
  failedDownloads: number;
  totalBytes: number;
  averageSpeed: number;
}
