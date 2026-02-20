import { CONFIG, API } from "../config";
import { secureFetch } from "./base";

export const uploadApi = {
  async uploadToCrust(
    file: File,
    _token: string,
    onProgress: (progress: number) => void,
    retryCount = 3
  ): Promise<{ cid: string; size: number; hash?: string; orderCreated?: boolean }> {
    const attemptUpload = (attempt: number): Promise<{ cid: string; size: number; hash?: string; orderCreated?: boolean }> => {
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
              if (response.success && response.data) {
                resolve({
                  cid: response.data.cid,
                  size: response.data.size,
                  hash: response.data.hash,
                  orderCreated: response.data.orderCreated,
                });
              } else {
                reject(new Error(response.error || "上传失败"));
              }
            } catch (parseError) {
              console.error("解析上传响应失败:", parseError, xhr.responseText);
              reject(new Error("解析响应失败"));
            }
          } else if (xhr.status >= 500 && xhr.status < 600 && attempt < retryCount - 1) {
            reject(new Error(`服务器错误: ${xhr.status}`));
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.error || `上传失败: ${xhr.status}`));
            } catch {
              reject(new Error(`上传失败: ${xhr.statusText || xhr.status}`));
            }
          }
        });

        xhr.addEventListener("error", () => {
          if (attempt < retryCount - 1) {
            reject(new Error("网络错误"));
          } else {
            reject(new Error("上传过程中发生错误，已重试多次"));
          }
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("上传已取消"));
        });

        xhr.addEventListener("timeout", () => {
          if (attempt < retryCount - 1) {
            reject(new Error("上传超时"));
          } else {
            reject(new Error("上传超时，已重试多次"));
          }
        });

        xhr.timeout = CONFIG.UPLOAD.TIMEOUT;
        
        const formData = new FormData();
        formData.append("file", file);
        
        const authToken = sessionStorage.getItem('auth_token');
        xhr.open("POST", "/api/upload");
        if (authToken) {
          xhr.setRequestHeader("x-auth-token", authToken);
        }
        xhr.send(formData);
      });
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        onProgress(0);
        const result = await attemptUpload(attempt);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (lastError.message.includes("取消")) {
          throw lastError;
        }
        
        if (attempt < retryCount - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.warn(`上传失败，${delay}ms后重试 (${attempt + 1}/${retryCount - 1}): ${lastError.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("上传失败");
  },

  async verifyFile(cid: string): Promise<{
    verified: boolean;
    status: "ok" | "failed" | "pending";
    message?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.INTEGRITY_CHECK.HEAD_TIMEOUT);

      const response = await fetch(`https://ipfs.io/ipfs/${cid}`, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { verified: true, status: "ok" };
      } else {
        return { verified: false, status: "failed", message: "文件验证失败" };
      }
    } catch (error) {
      console.warn("文件验证请求失败:", error);
      return { verified: false, status: "pending", message: "验证超时" };
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
