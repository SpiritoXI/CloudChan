/**
 * CrustFiles.io 直连客户端
 * 直接连接到 CrustFiles.io API，绕过 Vercel 的请求体大小限制
 */

export interface DirectUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type DirectProgressCallback = (progress: DirectUploadProgress) => void;

export interface DirectUploadOptions {
  onProgress?: DirectProgressCallback;
  headers?: Record<string, string>;
}

export interface DirectUploadResult {
  success: boolean;
  cid?: string;
  name?: string;
  size?: number;
  url?: string;
  error?: string;
  gateway?: string; // 使用的网关
}

// 网关配置
export const GATEWAYS = {
  PRIMARY: 'https://gw.w3ipfs.org.cn', // 国内优选
  OFFICIAL: 'https://gw.crustfiles.app', // 官方主推
  DEVELOPER: 'https://crustipfs.xyz' // 开发者/海外兜底
};

// 网关优先级列表
export const GATEWAY_PRIORITY = [
  GATEWAYS.PRIMARY,
  GATEWAYS.OFFICIAL,
  GATEWAYS.DEVELOPER
];

class CrustFilesDirectClient {
  private gateways: string[];
  private currentGatewayIndex: number;
  private authToken?: string;

  constructor(authToken?: string) {
    // 使用网关优先级列表
    this.gateways = GATEWAY_PRIORITY;
    this.currentGatewayIndex = 0;
    this.authToken = authToken;
  }

  /**
   * 获取当前使用的网关
   */
  getCurrentGateway(): string {
    return this.gateways[this.currentGatewayIndex];
  }

  /**
   * 切换到下一个网关
   */
  switchToNextGateway(): string {
    this.currentGatewayIndex = (this.currentGatewayIndex + 1) % this.gateways.length;
    const newGateway = this.getCurrentGateway();
    console.log(`[CrustFiles] 切换到下一个网关: ${newGateway}`);
    return newGateway;
  }

  /**
   * 重置网关到第一个
   */
  resetGateway(): void {
    this.currentGatewayIndex = 0;
    console.log(`[CrustFiles] 重置网关到: ${this.getCurrentGateway()}`);
  }

  /**
   * 设置认证 Token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * 获取认证 Token
   */
  getAuthToken(): string | undefined {
    return this.authToken;
  }

  /**
   * 清除认证 Token
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * 构建完整的 API URL
   */
  private buildUrl(path: string, gateway?: string): string {
    const baseUrl = gateway || this.getCurrentGateway();
    // 移除开头的斜杠，避免重复
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl}/${cleanPath}`;
  }

  /**
   * 构建请求头
   */
  private buildHeaders(customHeaders?: Record<string, string>): Headers {
    const headers = new Headers();

    // 添加认证 Token
    if (this.authToken) {
      headers.append('Authorization', `Bearer ${this.authToken}`);
    }

    // 添加自定义 headers
    if (customHeaders) {
      Object.entries(customHeaders).forEach(([key, value]) => {
        headers.append(key, value);
      });
    }

    return headers;
  }

  /**
   * 上传文件（直接连接 CrustFiles.io）
   * 使用 XMLHttpRequest 以支持上传进度
   * 实现多网关自动切换
   */
  async upload(
    file: File,
    options?: DirectUploadOptions
  ): Promise<DirectUploadResult> {
    // 重置网关索引
    this.resetGateway();
    
    // 尝试所有网关
    for (let attempt = 0; attempt < this.gateways.length; attempt++) {
      const currentGateway = this.getCurrentGateway();
      console.log(`[CrustFiles] 尝试上传到网关: ${currentGateway} (尝试 ${attempt + 1}/${this.gateways.length})`);
      
      const result = await this.uploadWithGateway(file, currentGateway, options);
      
      if (result.success) {
        console.log(`[CrustFiles] 上传成功，使用网关: ${currentGateway}`);
        return {
          ...result,
          gateway: currentGateway
        };
      } else {
        console.warn(`[CrustFiles] 网关 ${currentGateway} 上传失败: ${result.error}`);
        
        // 如果不是最后一个网关，切换到下一个
        if (attempt < this.gateways.length - 1) {
          this.switchToNextGateway();
        }
      }
    }
    
    // 所有网关都失败
    return {
      success: false,
      error: '所有网关上传失败，请检查网络连接后重试',
      gateway: this.getCurrentGateway()
    };
  }

  /**
   * 使用指定网关上传文件
   */
  private uploadWithGateway(
    file: File,
    gateway: string,
    options?: DirectUploadOptions
  ): Promise<DirectUploadResult> {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      const url = this.buildUrl('/api/v0/add', gateway);

      console.log(`[CrustFiles] 上传 URL: ${url}`);

      // 监听上传进度
      if (options?.onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            options.onProgress!({  
              loaded: event.loaded,
              total: event.total,
              percentage: (event.loaded / event.total) * 100,
            });
          }
        });
      }

      // 监听请求完成
      xhr.addEventListener('load', () => {
        const contentType = xhr.getResponseHeader('content-type') || '';
        let data: any;

        try {
          if (contentType.includes('application/json')) {
            data = JSON.parse(xhr.responseText);
          } else {
            data = xhr.responseText;
          }
        } catch (error) {
          data = xhr.responseText;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            success: true,
            cid: data.Hash || data.cid,
            name: data.Name || data.name || file.name,
            size: data.Size || data.size || file.size,
            url: `${gateway}/ipfs/${data.Hash || data.cid}`,
          });
        } else {
          resolve({
            success: false,
            error: `HTTP ${xhr.status}: ${xhr.statusText || '上传失败'}`,
          });
        }
      });

      // 监听请求错误
      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: '网络错误，请检查网络连接',
        });
      });

      // 监听请求中止
      xhr.addEventListener('abort', () => {
        resolve({
          success: false,
          error: '上传已取消',
        });
      });

      // 监听请求超时
      xhr.addEventListener('timeout', () => {
        resolve({
          success: false,
          error: '上传超时，请重试',
        });
      });

      // 设置超时时间（30分钟）
      xhr.timeout = 30 * 60 * 1000;

      // 设置请求头
      const requestHeaders = this.buildHeaders(options?.headers);
      requestHeaders.forEach((value, key) => {
        xhr.setRequestHeader(key, value);
      });

      // 发送请求
      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  /**
   * 下载文件（直接连接 CrustFiles.io）
   */
  async download(cid: string, fileName?: string): Promise<Blob> {
    // 重置网关索引
    this.resetGateway();
    
    // 尝试所有网关
    for (let attempt = 0; attempt < this.gateways.length; attempt++) {
      const currentGateway = this.getCurrentGateway();
      console.log(`[CrustFiles] 尝试从网关下载: ${currentGateway}`);
      
      try {
        const result = await this.downloadWithGateway(cid, currentGateway);
        console.log(`[CrustFiles] 下载成功，使用网关: ${currentGateway}`);
        return result;
      } catch (error) {
        console.warn(`[CrustFiles] 网关 ${currentGateway} 下载失败: ${error}`);
        
        // 如果不是最后一个网关，切换到下一个
        if (attempt < this.gateways.length - 1) {
          this.switchToNextGateway();
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('所有网关下载失败');
  }

  /**
   * 使用指定网关下载文件
   */
  private async downloadWithGateway(cid: string, gateway: string): Promise<Blob> {
    const url = this.buildUrl(`/ipfs/${cid}`, gateway);
    const requestHeaders = this.buildHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
    });

    if (!response.ok) {
      throw new Error(`下载失败: HTTP ${response.status}`);
    }

    return await response.blob();
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(cid: string): Promise<any> {
    // 重置网关索引
    this.resetGateway();
    
    // 尝试所有网关
    for (let attempt = 0; attempt < this.gateways.length; attempt++) {
      const currentGateway = this.getCurrentGateway();
      
      try {
        const result = await this.getFileInfoWithGateway(cid, currentGateway);
        return result;
      } catch (error) {
        console.warn(`[CrustFiles] 网关 ${currentGateway} 获取文件信息失败: ${error}`);
        
        // 如果不是最后一个网关，切换到下一个
        if (attempt < this.gateways.length - 1) {
          this.switchToNextGateway();
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('所有网关获取文件信息失败');
  }

  /**
   * 使用指定网关获取文件信息
   */
  private async getFileInfoWithGateway(cid: string, gateway: string): Promise<any> {
    const url = this.buildUrl(`/api/v0/object/stat?arg=${cid}`, gateway);
    const requestHeaders = this.buildHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
    });

    if (!response.ok) {
      throw new Error(`获取文件信息失败: HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 执行 pin 操作（固定文件）
   */
  async pin(cid: string): Promise<{ success: boolean; error?: string; gateway?: string }> {
    // 重置网关索引
    this.resetGateway();
    
    // 尝试所有网关
    for (let attempt = 0; attempt < this.gateways.length; attempt++) {
      const currentGateway = this.getCurrentGateway();
      
      try {
        const result = await this.pinWithGateway(cid, currentGateway);
        if (result.success) {
          return {
            ...result,
            gateway: currentGateway
          };
        }
      } catch (error) {
        console.warn(`[CrustFiles] 网关 ${currentGateway} pin 失败: ${error}`);
      }
      
      // 如果不是最后一个网关，切换到下一个
      if (attempt < this.gateways.length - 1) {
        this.switchToNextGateway();
      }
    }
    
    return {
      success: false,
      error: '所有网关 pin 操作失败'
    };
  }

  /**
   * 使用指定网关执行 pin 操作
   */
  private async pinWithGateway(cid: string, gateway: string): Promise<{ success: boolean; error?: string }> {
    const url = this.buildUrl(`/api/v0/pin/add?arg=${cid}`, gateway);
    const requestHeaders = this.buildHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Pin 失败: HTTP ${response.status}`,
      };
    }

    return { success: true };
  }

  /**
   * 检查 pin 状态
   */
  async isPinned(cid: string): Promise<boolean> {
    // 重置网关索引
    this.resetGateway();
    
    // 尝试所有网关
    for (let attempt = 0; attempt < this.gateways.length; attempt++) {
      const currentGateway = this.getCurrentGateway();
      
      try {
        const result = await this.isPinnedWithGateway(cid, currentGateway);
        if (result) {
          return true;
        }
      } catch (error) {
        console.warn(`[CrustFiles] 网关 ${currentGateway} 检查 pin 状态失败: ${error}`);
      }
      
      // 如果不是最后一个网关，切换到下一个
      if (attempt < this.gateways.length - 1) {
        this.switchToNextGateway();
      }
    }
    
    return false;
  }

  /**
   * 使用指定网关检查 pin 状态
   */
  private async isPinnedWithGateway(cid: string, gateway: string): Promise<boolean> {
    const url = this.buildUrl(`/api/v0/pin/ls?arg=${cid}`, gateway);
    const requestHeaders = this.buildHeaders();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// 单例模式
let directClientInstance: CrustFilesDirectClient | null = null;

/**
 * 获取直连客户端实例
 */
export function getCrustFilesDirectClient(authToken?: string): CrustFilesDirectClient {
  if (!directClientInstance) {
    directClientInstance = new CrustFilesDirectClient(authToken);
  } else if (authToken) {
    directClientInstance.setAuthToken(authToken);
  }

  return directClientInstance;
}

/**
 * 清除客户端实例
 */
export function clearCrustFilesDirectClient(): void {
  directClientInstance = null;
}
