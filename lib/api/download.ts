import { CONFIG } from "../config";
import type { Gateway, DownloadTask, DownloadOptions, DownloadHistory, DownloadQueueConfig, DownloadStats } from "@/types";

const DOWNLOAD_HISTORY_KEY = 'cc_download_history_v1';
const MAX_HISTORY_ENTRIES = 100;

const defaultQueueConfig: DownloadQueueConfig = {
  maxConcurrent: 3,
  maxRetries: 3,
  maxGatewaySwitches: 3,
  timeout: 30000,
  autoStart: true,
};

export const downloadApi = {
  generateTaskId(): string {
    return `dl_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  },

  formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';
    if (bytesPerSecond === Infinity) return '计算中...';
    
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return `${(bytesPerSecond / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  },

  formatTime(seconds: number): string {
    if (seconds === Infinity || seconds < 0) return '计算中...';
    if (seconds === 0) return '即将完成';
    
    if (seconds < 60) return `${Math.ceil(seconds)}秒`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.ceil(seconds % 60);
      return `${minutes}分${secs}秒`;
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `${hours}小时${minutes}分`;
  },

  async fetchWithProgress(
    url: string,
    options: {
      onProgress?: (loaded: number, total: number) => void;
      signal?: AbortSignal;
      timeout?: number;
    } = {}
  ): Promise<{ blob: Blob; totalSize: number }> {
    const { onProgress, signal, timeout = 30000 } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const combinedSignal = signal 
      ? this.combineSignals([controller.signal, signal])
      : controller.signal;

    try {
      const response = await fetch(url, {
        signal: combinedSignal,
        headers: {
          'Accept': '*/*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

      if (!response.body) {
        const blob = await response.blob();
        return { blob, totalSize: blob.size };
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        if (onProgress) {
          onProgress(loaded, totalSize || loaded);
        }
      }

      const blob = new Blob(chunks as BlobPart[]);
      return { blob, totalSize: blob.size };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort());
    }

    return controller.signal;
  },

  async downloadWithGateway(
    cid: string,
    gateway: Gateway,
    options: DownloadOptions = {}
  ): Promise<DownloadTask> {
    const {
      maxRetries = 3,
      timeout = 30000,
      onProgress,
      onStatusChange,
    } = options;

    const task: DownloadTask = {
      id: this.generateTaskId(),
      cid,
      filename: '',
      fileSize: 0,
      status: 'pending',
      progress: 0,
      downloadedBytes: 0,
      speed: 0,
      remainingTime: Infinity,
      startTime: Date.now(),
      gateway,
      gatewayIndex: 0,
      retryCount: 0,
      maxRetries,
    };

    task.status = 'downloading';
    onStatusChange?.(task);

    const url = `${gateway.url}${cid}`;
    let lastLoaded = 0;
    let lastTime = Date.now();
    const speedSamples: number[] = [];

    try {
      const { blob, totalSize } = await this.fetchWithProgress(url, {
        timeout,
        onProgress: (loaded, total) => {
          const now = Date.now();
          const timeDiff = now - lastTime;
          
          if (timeDiff >= 100) {
            const bytesDiff = loaded - lastLoaded;
            const currentSpeed = (bytesDiff / timeDiff) * 1000;
            
            speedSamples.push(currentSpeed);
            if (speedSamples.length > 10) {
              speedSamples.shift();
            }
            
            const avgSpeed = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
            
            task.downloadedBytes = loaded;
            task.fileSize = total;
            task.progress = total > 0 ? Math.round((loaded / total) * 100) : 0;
            task.speed = avgSpeed;
            task.remainingTime = avgSpeed > 0 ? (total - loaded) / avgSpeed : Infinity;
            
            lastLoaded = loaded;
            lastTime = now;
            
            onProgress?.(task);
          }
        },
      });

      task.blob = blob;
      task.fileSize = totalSize;
      task.progress = 100;
      task.downloadedBytes = totalSize;
      task.status = 'completed';
      task.endTime = Date.now();
      onStatusChange?.(task);

      return task;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : '下载失败';
      task.retryCount++;
      onStatusChange?.(task);
      throw error;
    }
  },

  async downloadWithAutoSwitch(
    cid: string,
    filename: string,
    gateways: Gateway[],
    options: DownloadOptions = {}
  ): Promise<DownloadTask> {
    const {
      maxRetries = 3,
      maxGatewaySwitches = 3,
      timeout = 30000,
      onProgress,
      onStatusChange,
      onGatewaySwitch,
      onComplete,
      onError,
    } = options;

    const availableGateways = gateways
      .filter(g => g.available)
      .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity));

    if (availableGateways.length === 0) {
      const task: DownloadTask = {
        id: this.generateTaskId(),
        cid,
        filename,
        fileSize: 0,
        status: 'failed',
        progress: 0,
        downloadedBytes: 0,
        speed: 0,
        remainingTime: Infinity,
        startTime: Date.now(),
        gateway: gateways[0],
        gatewayIndex: 0,
        retryCount: 0,
        maxRetries,
        error: '没有可用网关',
      };
      onStatusChange?.(task);
      onError?.(task, new Error('没有可用网关'));
      return task;
    }

    const task: DownloadTask = {
      id: this.generateTaskId(),
      cid,
      filename,
      fileSize: 0,
      status: 'pending',
      progress: 0,
      downloadedBytes: 0,
      speed: 0,
      remainingTime: Infinity,
      startTime: Date.now(),
      gateway: availableGateways[0],
      gatewayIndex: 0,
      retryCount: 0,
      maxRetries,
    };

    let lastGateway = availableGateways[0];
    let gatewaySwitchCount = 0;

    for (let attempt = 0; attempt < maxRetries * maxGatewaySwitches; attempt++) {
      const gatewayIndex = Math.min(
        Math.floor(attempt / maxRetries),
        availableGateways.length - 1
      );
      const currentGateway = availableGateways[gatewayIndex];

      if (currentGateway !== lastGateway) {
        gatewaySwitchCount++;
        if (gatewaySwitchCount > maxGatewaySwitches) {
          task.status = 'failed';
          task.error = '已尝试所有网关';
          onStatusChange?.(task);
          onError?.(task, new Error('已尝试所有网关'));
          return task;
        }
        onGatewaySwitch?.(lastGateway, currentGateway);
        lastGateway = currentGateway;
      }

      task.gateway = currentGateway;
      task.gatewayIndex = gatewayIndex;
      task.retryCount = attempt % maxRetries;
      task.status = 'downloading';
      task.error = undefined;
      onStatusChange?.(task);

      try {
        const result = await this.downloadWithGateway(cid, currentGateway, {
          timeout,
          onProgress,
          onStatusChange,
        });

        result.id = task.id;
        result.filename = filename;
        
        onComplete?.(result);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '下载失败';
        task.error = errorMessage;
        
        if (gatewayIndex >= availableGateways.length - 1 && 
            (attempt % maxRetries) >= maxRetries - 1) {
          task.status = 'failed';
          onStatusChange?.(task);
          onError?.(task, error instanceof Error ? error : new Error(errorMessage));
          return task;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    task.status = 'failed';
    task.error = '下载失败';
    onStatusChange?.(task);
    onError?.(task, new Error('下载失败'));
    return task;
  },

  saveDownloadBlob(task: DownloadTask): void {
    if (!task.blob || task.status !== 'completed') {
      return;
    }

    const url = URL.createObjectURL(task.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = task.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  saveDownloadHistory(task: DownloadTask): void {
    try {
      const stored = localStorage.getItem(DOWNLOAD_HISTORY_KEY);
      let history: DownloadHistory[] = stored ? JSON.parse(stored) : [];

      const entry: DownloadHistory = {
        id: task.id,
        cid: task.cid,
        filename: task.filename,
        fileSize: task.fileSize,
        gatewayName: task.gateway.name,
        gatewayUrl: task.gateway.url,
        downloadTime: task.startTime,
        duration: (task.endTime || Date.now()) - task.startTime,
        averageSpeed: task.speed,
        success: task.status === 'completed',
        errorMessage: task.error,
      };

      history.unshift(entry);

      if (history.length > MAX_HISTORY_ENTRIES) {
        history = history.slice(0, MAX_HISTORY_ENTRIES);
      }

      localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('保存下载历史失败:', error);
    }
  },

  loadDownloadHistory(): DownloadHistory[] {
    try {
      const stored = localStorage.getItem(DOWNLOAD_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  clearDownloadHistory(): void {
    localStorage.removeItem(DOWNLOAD_HISTORY_KEY);
  },

  getDownloadStats(): DownloadStats {
    const history = this.loadDownloadHistory();
    
    const stats: DownloadStats = {
      totalDownloads: history.length,
      successfulDownloads: history.filter(h => h.success).length,
      failedDownloads: history.filter(h => !h.success).length,
      totalBytes: history.reduce((sum, h) => sum + h.fileSize, 0),
      averageSpeed: 0,
    };

    const successfulSpeeds = history
      .filter(h => h.success && h.averageSpeed > 0)
      .map(h => h.averageSpeed);

    if (successfulSpeeds.length > 0) {
      stats.averageSpeed = successfulSpeeds.reduce((a, b) => a + b, 0) / successfulSpeeds.length;
    }

    return stats;
  },

  createDownloadQueue(config: Partial<DownloadQueueConfig> = {}) {
    const finalConfig = { ...defaultQueueConfig, ...config };
    const queue: DownloadTask[] = [];
    const active: Map<string, DownloadTask> = new Map();
    const abortControllers: Map<string, AbortController> = new Map();

    const generateId = () => this.generateTaskId();

    return {
      config: finalConfig,
      queue,
      active,

      add(cid: string, filename: string, fileSize: number, gateways: Gateway[]): string {
        const availableGateways = gateways.filter(g => g.available);
        
        const task: DownloadTask = {
          id: generateId(),
          cid,
          filename,
          fileSize,
          status: 'pending',
          progress: 0,
          downloadedBytes: 0,
          speed: 0,
          remainingTime: Infinity,
          startTime: 0,
          gateway: availableGateways[0] || gateways[0],
          gatewayIndex: 0,
          retryCount: 0,
          maxRetries: finalConfig.maxRetries,
        };

        queue.push(task);

        if (finalConfig.autoStart) {
          this.processQueue(gateways);
        }

        return task.id;
      },

      async processQueue(gateways: Gateway[]): Promise<void> {
        while (queue.length > 0 && active.size < finalConfig.maxConcurrent) {
          const task = queue.shift();
          if (!task) break;

          const controller = new AbortController();
          abortControllers.set(task.id, controller);
          active.set(task.id, task);

          task.status = 'downloading';
          task.startTime = Date.now();

          downloadWithAutoSwitch(task.cid, task.filename, gateways, {
            maxRetries: finalConfig.maxRetries,
            maxGatewaySwitches: finalConfig.maxGatewaySwitches,
            timeout: finalConfig.timeout,
            onProgress: (updatedTask) => {
              Object.assign(task, updatedTask);
            },
            onStatusChange: (updatedTask) => {
              Object.assign(task, updatedTask);
            },
          })
            .then((result) => {
              if (result.status === 'completed') {
                downloadApi.saveDownloadBlob(result);
                downloadApi.saveDownloadHistory(result);
              }
            })
            .catch(console.error)
            .finally(() => {
              active.delete(task.id);
              abortControllers.delete(task.id);
              this.processQueue(gateways);
            });
        }
      },

      pause(taskId: string): void {
        const controller = abortControllers.get(taskId);
        if (controller) {
          controller.abort();
        }

        const task = active.get(taskId);
        if (task) {
          task.status = 'paused';
          active.delete(taskId);
        }
      },

      resume(taskId: string, gateways: Gateway[]): void {
        const taskIndex = queue.findIndex(t => t.id === taskId);
        if (taskIndex >= 0) {
          const task = queue[taskIndex];
          task.status = 'pending';
          this.processQueue(gateways);
        }
      },

      cancel(taskId: string): void {
        this.pause(taskId);
        
        const taskIndex = queue.findIndex(t => t.id === taskId);
        if (taskIndex >= 0) {
          const task = queue[taskIndex];
          task.status = 'cancelled';
          queue.splice(taskIndex, 1);
        }
      },

      cancelAll(): void {
        const activeIds = Array.from(active.keys());
        for (const id of activeIds) {
          this.cancel(id);
        }
        queue.length = 0;
      },

      getQueue(): DownloadTask[] {
        return [...queue];
      },

      getActive(): DownloadTask[] {
        return Array.from(active.values());
      },

      getAll(): DownloadTask[] {
        return [...queue, ...Array.from(active.values())];
      },
    };
  },
};

function downloadWithAutoSwitch(
  cid: string,
  filename: string,
  gateways: Gateway[],
  options: DownloadOptions = {}
): Promise<DownloadTask> {
  return downloadApi.downloadWithAutoSwitch(cid, filename, gateways, options);
}
