import { API } from "../config";
import { secureFetch } from "./base";
import type { ApiResponse } from "@/types";

export const shareApi = {
  async getShareInfo(cid: string): Promise<{
    cid: string;
    filename?: string;
    size?: number;
    hasPassword: boolean;
    expiry?: string;
  } | null> {
    try {
      const response = await fetch(`${API.SHARE}?cid=${encodeURIComponent(cid)}`);
      const data: ApiResponse<{
        cid: string;
        filename?: string;
        size?: number;
        hasPassword: boolean;
        expiry?: string;
      }> = await response.json();

      if (!data.success) {
        return null;
      }
      return data.data || null;
    } catch {
      return null;
    }
  },

  async createShare(shareInfo: {
    cid: string;
    filename?: string;
    size?: number;
    password?: string;
    expiry?: string;
  }): Promise<void> {
    const response = await secureFetch(API.SHARE, {
      method: "POST",
      body: JSON.stringify(shareInfo),
    });
    const data: ApiResponse = await response.json();
    if (!data.success) throw new Error(data.error || "创建分享失败");
  },

  async verifyPassword(cid: string, password: string): Promise<{
    cid: string;
    filename?: string;
    size?: number;
    hasPassword: boolean;
    expiry?: string;
  } | null> {
    try {
      const response = await fetch(API.VERIFY_SHARE_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid, password }),
      });
      const data: ApiResponse<{
        cid: string;
        filename?: string;
        size?: number;
        hasPassword: boolean;
        expiry?: string;
      }> = await response.json();

      if (!data.success) {
        return null;
      }
      return data.data || null;
    } catch {
      return null;
    }
  },

  async deleteShare(cid: string): Promise<void> {
    const response = await secureFetch(`${API.SHARE}?cid=${encodeURIComponent(cid)}`, {
      method: "DELETE",
    });
    const data: ApiResponse = await response.json();
    if (!data.success) throw new Error(data.error || "删除分享失败");
  },
};
