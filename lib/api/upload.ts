import { CONFIG, API } from "../config";
import { secureFetch } from "./base";

// ============================================
// Crust Network 文件固定验证说明
// ============================================
// 
// 如何保证文件已经被固定？
// 
// 1. 上传时自动固定：
//    - URL 中包含 pin=true 参数
//    - Crust 节点会在收到文件后自动固定
// 
// 2. 验证方式：
//    - 通过 IPFS 网关访问文件（能访问说明已被固定）
//    - 查询 Crust 链上存储状态
//    - 调用 verifyPinStatus() 获取详细状态
// 
// 3. 存储订单（可选）：
//    - 使用 CRUST_ACCESS_TOKEN 创建订单
//    - 订单会为文件提供更长时间的存储保障
//    - crustfiles.io 免费模式无需订单也永久存储
//
// ============================================
// 多个备用端点，自动故障转移
const CRUST_UPLOAD_ENDPOINTS = [
  {
    name: 'crustfiles-app',
    upload: 'https://gw.crustfiles.app/api/v0/add?pin=true',
    order: 'https://gw.crustfiles.app/crust/api/v1/files',
  },
  {
    name: 'decoo-main',
    upload: 'https://gw.decoo.io/api/v0/add?pin=true',
    order: 'https://gw.decoo.io/crust/api/v1/files',
  },
  {
    name: 'decoo-hk',
    upload: 'https://ipfs-hk.decoo.io/api/v0/add?pin=true',
    order: 'https://ipfs-hk.decoo.io/crust/api/v1/files',
  },
  {
    name: 'crust-gateway',
    upload: 'https://crustgateway.com/api/v0/add?pin=true',
    order: 'https://crustgateway.com/crust/api/v1/files',
  },
];

// 上传版本号 - 用于确认代码是否更新
const UPLOAD_VERSION = '3.3.5-multi-endpoint';

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const uploadApi = {
  /**
   * 直连上传到 Crust API（多端点自动故障转移）
   * 
   * 特性:
   * - 多个备用端点，自动故障转移
   * - 直连上传，绕过代理服务器限制
   * - 支持 CORS，前端直连无问题
   * - 每个端点失败后延迟重试，避免快速连续失败
   * 
   * 版本: 3.3.5-multi-endpoint
   */
  async uploadToCrust(
    file: File,
    token: string,
    onProgress: (progress: number) => void
  ): Promise<{ cid: string; size: number; hash?: string; orderCreated?: boolean }> {
    console.log(`[CrustShare v${UPLOAD_VERSION}] 开始多端点上传`);
    console.log(`[CrustShare] 文件: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[CrustShare] 可用端点: ${CRUST_UPLOAD_ENDPOINTS.map(e => e.name).join(', ')}`);
    
    const errors: string[] = [];
    
    // 依次尝试每个端点
    for (let i = 0; i < CRUST_UPLOAD_ENDPOINTS.length; i++) {
      const endpoint = CRUST_UPLOAD_ENDPOINTS[i];
      console.log(`[CrustShare] 尝试端点 ${i + 1}/${CRUST_UPLOAD_ENDPOINTS.length}: ${endpoint.name}`);
      console.log(`[CrustShare] 上传 URL: ${endpoint.upload}`);
      
      try {
        const result = await this.uploadToEndpoint(file, token, endpoint.upload, endpoint.order, onProgress);
        console.log(`[CrustShare] 端点 ${endpoint.name} 上传成功!`);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[CrustShare] 端点 ${endpoint.name} 失败: ${errorMsg}`);
        errors.push(`${endpoint.name}: ${errorMsg}`);
        
        // 如果不是最后一个端点，等待后继续尝试下一个
        if (i < CRUST_UPLOAD_ENDPOINTS.length - 1) {
          const waitTime = 2000; // 2秒延迟
          console.log(`[CrustShare] 等待 ${waitTime/1000} 秒后切换到下一个端点...`);
          await delay(waitTime);
        }
      }
    }
    
    // 所有端点都失败了
    console.error(`[CrustShare] 所有端点都失败!`);
    throw new Error(`上传失败，已尝试所有端点:\n${errors.join('\n')}`);
  },

  /**
   * 上传到指定端点
   */
  async uploadToEndpoint(
    file: File,
    token: string,
    uploadUrl: string,
    orderUrl: string,
    onProgress: (progress: number) => void
  ): Promise<{ cid: string; size: number; hash?: string; orderCreated?: boolean }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            
            if (response.Hash) {
              const cid = response.Hash;
              const size = response.Size || file.size;
              
              // 上传成功后，通过后端 API 创建存储订单（绕过 CORS）
              // 不等待订单创建完成，直接返回成功
              this.createOrderViaBackend(cid, size).catch(err => {
                console.warn("[CrustShare] 后台创建存储订单出错:", err);
              });
              
              // 立即返回成功，不阻塞
              resolve({
                cid,
                size,
                hash: response.Hash,
                orderCreated: false, // 订单在后台创建
              });
            } else if (response.error) {
              reject(new Error(response.error));
            } else if (response.Message) {
              reject(new Error(response.Message));
            } else {
              reject(new Error("上传失败：无效响应"));
            }
          } catch (parseError) {
            reject(new Error(`解析响应失败: ${xhr.responseText.substring(0, 100)}`));
          }
        } else {
          // 解析错误信息
          let errorMsg = `HTTP ${xhr.status}`;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMsg = errorResponse.error || errorResponse.message || errorResponse.Message || errorMsg;
          } catch {
            if (xhr.statusText) {
              errorMsg = xhr.statusText;
            }
          }
          reject(new Error(errorMsg));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("网络错误"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("上传已取消"));
      });

      xhr.addEventListener("timeout", () => {
        reject(new Error("上传超时"));
      });

      xhr.timeout = CONFIG.UPLOAD.TIMEOUT;
      
      const formData = new FormData();
      formData.append("file", file);
      
      // 直连上传
      xhr.open("POST", uploadUrl);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    });
  },

  /**
   * 通过后端 API 创建存储订单（绕过 CORS 限制）
   * 在后台异步执行，不阻塞主流程
   */
  async createOrderViaBackend(cid: string, size: number): Promise<boolean> {
    try {
      console.log(`[CrustShare] 后台创建存储订单: CID=${cid}, Size=${size}`);
      
      const response = await secureFetch(`/api/create_order?cid=${cid}&size=${size}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.orderCreated) {
        console.log(`[CrustShare] 存储订单创建成功`);
        return true;
      } else {
        console.log(`[CrustShare] 存储订单: ${data.data?.reason || '已跳过'}`);
        return false;
      }
    } catch (error) {
      console.error("[CrustShare] 创建存储订单请求失败:", error);
      return false;
    }
  },

  /**
   * 创建存储订单（直接调用 - 已弃用，使用 createOrderViaBackend）
   * @deprecated 使用 createOrderViaBackend 替代
   */
  async createOrder(cid: string, size: number, token: string, orderUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${orderUrl}/${cid}/order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cid,
          size,
          months: 1200,
        }),
      });
      return response.ok;
    } catch (error) {
      console.error("创建存储订单失败:", error);
      return false;
    }
  },

  /**
   * 验证文件完整性
   * 使用多个网关进行验证，优先使用国内可访问的网关
   */
  async verifyFile(cid: string): Promise<{
    verified: boolean;
    status: "ok" | "failed" | "pending";
    message?: string;
  }> {
    // 验证网关列表 - 优先使用国内可访问的网关
    const verifyGateways = [
      'https://cf-ipfs.com/ipfs',           // Cloudflare CN
      'https://4everland.io/ipfs',          // 4EVERLAND
      'https://cdn.ipfsscan.io/ipfs',       // IPFSScan CN
      'https://gateway.lighthouse.storage/ipfs', // Lighthouse
      'https://crustwebsites.net/ipfs',     // Crust
    ];
    
    // 每个网关超时时间：10秒
    const timeout = 10000;
    
    for (const gateway of verifyGateways) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeout);

        const url = `${gateway}/${cid}`;
        console.log(`[CrustShare] 尝试验证文件: ${url}`);
        
        const response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`[CrustShare] 文件验证成功: ${gateway}`);
          return { verified: true, status: "ok", message: `验证成功` };
        }
      } catch (error) {
        // 单个网关失败，继续尝试下一个
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[CrustShare] 网关 ${gateway} 验证失败:`, errorMsg);
        continue;
      }
    }
    
    // 所有网关都失败，返回 pending 状态
    // 文件刚上传可能需要时间传播到各网关
    console.warn(`[CrustShare] 所有验证网关都失败，返回 pending 状态`);
    return { 
      verified: false, 
      status: "pending", 
      message: "文件验证中，请稍后刷新查看" 
    };
  },

  /**
   * 验证文件固定状态（通过后端 API）
   * 
   * 返回详细的固定状态信息：
   * - pinned: 文件是否已被固定
   * - availableOnGateways: 文件可用的网关列表
   * - crustOrderExists: 是否有 Crust 链上存储订单
   * 
   * 使用方法：
   * ```typescript
   * const status = await uploadApi.verifyPinStatus(cid);
   * if (status.pinned) {
   *   console.log("文件已被固定，可用网关:", status.availableOnGateways);
   * }
   * ```
   */
  async verifyPinStatus(cid: string): Promise<{
    pinned: boolean;
    availableOnGateways: string[];
    crustOrderExists: boolean;
    lastChecked: string;
  }> {
    try {
      console.log(`[CrustShare] 验证文件固定状态: CID=${cid}`);
      
      const response = await secureFetch(`/api/verify_pin?cid=${cid}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      return {
        pinned: false,
        availableOnGateways: [],
        crustOrderExists: false,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[CrustShare] 验证固定状态失败:", error);
      return {
        pinned: false,
        availableOnGateways: [],
        crustOrderExists: false,
        lastChecked: new Date().toISOString(),
      };
    }
  },
};

export const tokenApi = {
  async getToken(): Promise<string> {
    const response = await secureFetch(API.GET_TOKEN);
    const data = await response.json();
    return data.data?.token || data.token;
  },
};
