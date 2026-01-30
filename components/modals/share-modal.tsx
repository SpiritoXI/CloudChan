"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import type { FileRecord } from "@/types";
import { formatFileSize } from "@/lib/utils";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileRecord | null;
  shareUrl: string;
  sharePassword: string;
  shareExpiry: string;
  onPasswordChange: (value: string) => void;
  onExpiryChange: (value: string) => void;
  onCopyLink: () => void;
  onCopyCid: () => void;
}

export function ShareModal({
  isOpen,
  onClose,
  file,
  shareUrl,
  sharePassword,
  shareExpiry,
  onPasswordChange,
  onExpiryChange,
  onCopyLink,
  onCopyCid,
}: ShareModalProps) {
  if (!file) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<h3 className="text-lg font-semibold">分享文件</h3>}
    >
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">分享链接</label>
          <div className="flex space-x-2">
            <Input value={shareUrl} readOnly className="flex-1" />
            <Button onClick={onCopyLink}>
              <Copy className="h-4 w-4 mr-1" />
              复制
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">访问密码（可选）</label>
          <Input
            type="text"
            placeholder="设置访问密码"
            value={sharePassword}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">有效期</label>
          <select
            className="w-full p-2 border rounded-lg"
            value={shareExpiry}
            onChange={(e) => onExpiryChange(e.target.value)}
          >
            <option value="1">1天</option>
            <option value="7">7天</option>
            <option value="30">30天</option>
            <option value="0">永久有效</option>
          </select>
        </div>

        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">CID: {file.cid}</p>
          <Button variant="outline" className="w-full" onClick={onCopyCid}>
            <Copy className="h-4 w-4 mr-1" />
            复制 CID
          </Button>
        </div>
      </div>
    </Modal>
  );
}
