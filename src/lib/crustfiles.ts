/**
 * CrustFiles.io 客户端
 * 用于与 CrustFiles.io 网关进行文件上传和下载
 */

interface UploadResponse {
  success: boolean;
  cid?: string;
  name?: string;
  size?: number;
  url?: string;
  error?: string;
}

interface UploadOptions {
  fileName: string;
  fileSize: number;
  mimeType?: string;
}

/**
 * CrustFiles.io 客户端类
 */
export class CrustFilesClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(accessToken: string, baseUrl?: string) {
    this.accessToken = accessToken;
    // 默认使用 CrustFiles.io 公共网关
    this.baseUrl = baseUrl || 'https://crustfiles.io';
  }

  /**
   * 上传文件到 CrustFiles.io
   * @param file 文件内容（Buffer 或 Blob）
   * @param options 上传选项
   * @returns 上传结果
   */
  async uploadFile(
    file: Buffer | Blob,
    options: UploadOptions
  ): Promise<UploadResponse> {
    try {
      // 如果是 Blob，转换为 ArrayBuffer，然后转换为 Buffer
      let fileBuffer: Buffer;
      if (file instanceof Blob) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      } else {
        fileBuffer = file;
      }

      // 创建 FormData
      const formData = new FormData();
      // 将 Buffer 转换为 Uint8Array，然后作为 BlobPart 使用
      const uint8Array = new Uint8Array(fileBuffer);
      const blob = new Blob([uint8Array], { type: options.mimeType || 'application/octet-stream' });
      formData.append('file', blob, options.fileName);
      formData.append('access_token', this.accessToken);

      // 发送上传请求
      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          cid: data.cid,
          name: data.name || options.fileName,
          size: data.size || options.fileSize,
          url: `${this.baseUrl}/ipfs/${data.cid}`,
        };
      } else {
        return {
          success: false,
          error: data.error || '上传失败',
        };
      }
    } catch (error) {
      console.error('CrustFiles 上传错误:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '上传失败',
      };
    }
  }

  /**
   * 获取文件的访问 URL
   * @param cid 文件的 CID
   * @returns 文件访问 URL
   */
  getFileUrl(cid: string): string {
    return `${this.baseUrl}/ipfs/${cid}`;
  }

  /**
   * 下载文件
   * @param cid 文件的 CID
   * @returns 文件内容
   */
  async downloadFile(cid: string): Promise<Buffer> {
    try {
      const response = await fetch(this.getFileUrl(cid));

      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('CrustFiles 下载错误:', error);
      throw error;
    }
  }

  /**
   * 验证 CID 格式
   * @param cid 要验证的 CID
   * @returns 是否有效
   */
  static isValidCID(cid: string): boolean {
    // CIDv0: 46 个 base58 字符，以 'Q' 或 '1' 开头
    const cidv0Regex = /^[Q1][1-9A-HJ-NP-Za-km-z]{44,}$/;

    // CIDv1: 以 'b' 开头的 base32 编码
    const cidv1Regex = /^b[a-zA-Z2-7]+$/;

    return cidv0Regex.test(cid) || cidv1Regex.test(cid);
  }

  /**
   * 获取客户端实例
   * @param accessToken Access Token
   * @param baseUrl 基础 URL
   * @returns CrustFilesClient 实例
   */
  static getClient(accessToken: string, baseUrl?: string): CrustFilesClient {
    return new CrustFilesClient(accessToken, baseUrl);
  }
}

/**
 * 默认客户端实例（使用环境变量中的 Access Token）
 */
export function getDefaultClient(): CrustFilesClient | null {
  const accessToken = process.env.CRUSTFILES_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('CRUSTFILES_ACCESS_TOKEN 未设置，CrustFiles 功能不可用');
    return null;
  }

  const baseUrl = process.env.CRUSTFILES_BASE_URL || 'https://crustfiles.io';
  return new CrustFilesClient(accessToken, baseUrl);
}
