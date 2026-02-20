import { API } from "../config";
import { secureFetch, ApiError } from "./base";
import type { FileRecord, Folder, ApiResponse } from "@/types";

export const fileApi = {
  async loadFiles(): Promise<FileRecord[]> {
    const response = await secureFetch(`${API.DB_PROXY}?action=load_files`);
    const data: ApiResponse<FileRecord[]> = await response.json();
    if (!data.success) throw new Error(data.error || "加载文件失败");
    return data.data || [];
  },

  async saveFile(file: FileRecord): Promise<void> {
    const response = await secureFetch(`${API.DB_PROXY}?action=save_file`, {
      method: "POST",
      body: JSON.stringify(file),
    });
    const data: ApiResponse = await response.json();
    if (!data.success) throw new Error(data.error || "保存文件失败");
  },

  async updateFile(fileId: string | number, updates: Partial<FileRecord>): Promise<void> {
    const response = await secureFetch(`${API.DB_PROXY}?action=update_file`, {
      method: "POST",
      body: JSON.stringify({ fileId, updates }),
    });
    const data: ApiResponse = await response.json();
    if (!data.success) throw new Error(data.error || "更新文件失败");
  },

  async addCid(cid: string, name: string, size: number, folderId: string = "default"): Promise<FileRecord> {
    const response = await secureFetch(`${API.DB_PROXY}?action=add_cid`, {
      method: "POST",
      body: JSON.stringify({ cid, name, size, folderId }),
    });
    const data: ApiResponse<FileRecord> = await response.json();
    if (!data.success) throw new Error(data.error || "添加CID失败");
    return data.data!;
  },

  validateCid(cid: string): { valid: boolean; error?: string } {
    const cidV0Pattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    const cidV1Pattern = /^b[2-7a-z]{58,}$/;
    const cidV1Base36Pattern = /^k[2-7a-z]{58,}$/;

    if (!cid || cid.trim() === "") {
      return { valid: false, error: "CID不能为空" };
    }

    const trimmedCid = cid.trim();

    if (cidV0Pattern.test(trimmedCid)) {
      return { valid: true };
    }

    if (cidV1Pattern.test(trimmedCid) || cidV1Base36Pattern.test(trimmedCid)) {
      return { valid: true };
    }

    return { valid: false, error: "无效的CID格式" };
  },

  async fetchCidInfo(cid: string): Promise<{ name: string; size: number; isDirectory: boolean; valid: boolean; error?: string } | null> {
    try {
      const validation = this.validateCid(cid);
      if (!validation.valid) {
        return {
          name: "",
          size: 0,
          isDirectory: false,
          valid: false,
          error: validation.error,
        };
      }

      const gateways = [
        "https://ipfs.io",
        "https://gateway.ipfs.io",
        "https://cloudflare-ipfs.com",
        "https://dweb.link",
        "https://gateway.pinata.cloud",
      ];

      for (const gateway of gateways) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(`https://ipfs.io/api/v0/ls?arg=${cid}`, {
            method: "POST",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data.Objects && data.Objects.length > 0) {
              const obj = data.Objects[0];
              if (obj.Links && obj.Links.length > 0) {
                let totalSize = 0;
                obj.Links.forEach((link: { Size?: number }) => {
                  totalSize += link.Size || 0;
                });
                return {
                  name: `folder-${cid.slice(0, 8)}`,
                  size: totalSize,
                  isDirectory: true,
                  valid: true,
                };
              }
            }
          }
        } catch {
          // continue
        }
      }

      for (const gateway of gateways) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(`${gateway}/ipfs/${cid}`, {
            method: "HEAD",
            signal: controller.signal,
            redirect: "follow",
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const contentLength = response.headers.get("content-length");
            const contentType = response.headers.get("content-type");
            const contentDisposition = response.headers.get("content-disposition");

            let filename: string | null = null;
            if (contentDisposition) {
              const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
              if (match) {
                filename = match[1].replace(/['"]/g, "");
              }
            }

            if (!filename) {
              const url = response.url;
              const urlParts = url.split("/");
              const lastPart = urlParts[urlParts.length - 1];
              if (lastPart && lastPart !== cid && !lastPart.startsWith("Qm") && !lastPart.startsWith("b")) {
                filename = decodeURIComponent(lastPart);
              }
            }

            let extension = "";
            if (contentType) {
              const extMap: Record<string, string> = {
                "image/jpeg": ".jpg",
                "image/jpg": ".jpg",
                "image/png": ".png",
                "image/gif": ".gif",
                "image/webp": ".webp",
                "image/svg+xml": ".svg",
                "application/pdf": ".pdf",
                "text/plain": ".txt",
                "text/markdown": ".md",
                "text/html": ".html",
                "application/json": ".json",
                "video/mp4": ".mp4",
                "video/webm": ".webm",
                "audio/mpeg": ".mp3",
                "audio/wav": ".wav",
                "application/zip": ".zip",
                "application/x-rar-compressed": ".rar",
                "application/x-7z-compressed": ".7z",
                "application/gzip": ".gz",
                "application/x-tar": ".tar",
              };
              extension = extMap[contentType.split(";")[0].trim()] || "";
            }

            const size = contentLength ? (parseInt(contentLength) || 0) : 0;

            return {
              name: filename || `file-${cid.slice(0, 8)}${extension}`,
              size: size,
              isDirectory: false,
              valid: true,
            };
          }
        } catch {
          // continue
        }
      }

      return {
        name: `file-${cid.slice(0, 8)}`,
        size: 0,
        isDirectory: false,
        valid: true,
        error: "无法从IPFS网络获取文件信息，请手动填写文件名和大小",
      };
    } catch {
      return {
        name: `file-${cid.slice(0, 8)}`,
        size: 0,
        isDirectory: false,
        valid: true,
        error: "获取文件信息时发生错误，请手动填写文件名和大小",
      };
    }
  },

  async deleteFile(fileId: string | number): Promise<void> {
    const response = await secureFetch(`${API.DB_PROXY}?action=delete_file`, {
      method: "POST",
      body: JSON.stringify({ fileId }),
    });
    const data: ApiResponse = await response.json();
    if (!data.success) throw new Error(data.error || "删除文件失败");
  },

  async deleteFiles(fileIds: (string | number)[]): Promise<number> {
    const response = await secureFetch(`${API.DB_PROXY}?action=delete_files`, {
      method: "POST",
      body: JSON.stringify({ fileIds }),
    });
    const data: ApiResponse<{ deleted: number }> = await response.json();
    if (!data.success) throw new Error(data.error || "批量删除文件失败");
    return data.data?.deleted || 0;
  },

  async renameFile(fileId: string | number, newName: string): Promise<void> {
    const response = await secureFetch(`${API.DB_PROXY}?action=rename_file`, {
      method: "POST",
      body: JSON.stringify({ fileId, newName }),
    });
    const data: ApiResponse = await response.json();
    if (!data.success) throw new Error(data.error || "重命名文件失败");
  },

  async moveFiles(fileIds: (string | number)[], folderId: string): Promise<number> {
    const response = await secureFetch(`${API.DB_PROXY}?action=move_files`, {
      method: "POST",
      body: JSON.stringify({ fileIds, folderId }),
    });
    const data: ApiResponse<{ moved: number }> = await response.json();
    if (!data.success) throw new Error(data.error || "移动文件失败");
    return data.data?.moved || 0;
  },

  async copyFiles(fileIds: (string | number)[], folderId: string): Promise<number> {
    const response = await secureFetch(`${API.DB_PROXY}?action=copy_files`, {
      method: "POST",
      body: JSON.stringify({ fileIds, folderId }),
    });
    const data: ApiResponse<{ copied: number }> = await response.json();
    if (!data.success) throw new Error(data.error || "复制文件失败");
    return data.data?.copied || 0;
  },

  async loadFolders(): Promise<Folder[]> {
    const response = await secureFetch(`${API.DB_PROXY}?action=load_folders`);
    const data: ApiResponse<Folder[]> = await response.json();
    if (!data.success) throw new Error(data.error || "加载文件夹失败");
    return data.data || [];
  },

  async createFolder(name: string, parentId: string | null = null): Promise<Folder> {
    const response = await secureFetch(`${API.DB_PROXY}?action=create_folder`, {
      method: "POST",
      body: JSON.stringify({ name, parentId }),
    });
    const data: ApiResponse<Folder> = await response.json();
    if (!data.success) throw new Error(data.error || "创建文件夹失败");
    return data.data!;
  },

  async renameFolder(folderId: string, newName: string): Promise<void> {
    const response = await secureFetch(`${API.DB_PROXY}?action=rename_folder`, {
      method: "POST",
      body: JSON.stringify({ folderId, newName }),
    });
    const data: ApiResponse = await response.json();
    if (!data.success) throw new Error(data.error || "重命名文件夹失败");
  },

  async deleteFolder(folderId: string): Promise<void> {
    const response = await secureFetch(`${API.DB_PROXY}?action=delete_folder`, {
      method: "POST",
      body: JSON.stringify({ folderId }),
    });
    const data: ApiResponse = await response.json();
    if (!data.success) throw new Error(data.error || "删除文件夹失败");
  },

  async getDbStats(): Promise<{
    files: { count: number };
    folders: { count: number };
  }> {
    const response = await secureFetch(`${API.DB_PROXY}?action=db_stats`);
    const data: ApiResponse<{
      keys: {
        files: { count: number };
        folders: { count: number };
      };
    }> = await response.json();
    if (!data.success) throw new Error(data.error || "获取统计失败");
    return {
      files: data.data!.keys.files,
      folders: data.data!.keys.folders,
    };
  },

  async checkVerificationStatus(): Promise<FileRecord[]> {
    const response = await secureFetch(`${API.DB_PROXY}?action=check_verification_status`);
    const data: ApiResponse<{ failedFiles: FileRecord[] }> = await response.json();
    if (!data.success) throw new Error(data.error || "检查验证状态失败");
    return data.data?.failedFiles || [];
  },

  async loadShares(): Promise<Array<{
    cid: string;
    filename?: string;
    size?: number;
    expiry?: string;
    createdAt: number;
    hasPassword: boolean;
  }>> {
    const response = await secureFetch(`${API.SHARE}?list=true`);
    const data: ApiResponse<Array<{
      cid: string;
      filename?: string;
      size?: number;
      expiry?: string;
      createdAt: number;
      hasPassword: boolean;
    }>> = await response.json();
    if (!data.success) throw new Error(data.error || "加载分享列表失败");
    return data.data || [];
  },

  async deleteShare(cid: string): Promise<void> {
    const response = await secureFetch(`${API.SHARE}?cid=${cid}`, {
      method: "DELETE",
    });
    const data: ApiResponse = await response.json();
    if (!data.success) throw new Error(data.error || "删除分享失败");
  },
};
