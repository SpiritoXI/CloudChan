"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Share2, Lock, Clock, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/common";
import type { FileRecord } from "@/types";
import { formatFileSize, copyToClipboard } from "@/lib/utils";
import { shareApi } from "@/lib/api";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileRecord | null;
}

export function ShareModal({
  isOpen,
  onClose,
  file,
}: ShareModalProps) {
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState("7");
  const [shareUrl, setShareUrl] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCid, setCopiedCid] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [shareCreated, setShareCreated] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setShareUrl(`${baseUrl}/share/${file.cid}`);
      setPassword("");
      setExpiry("7");
      setCopiedLink(false);
      setCopiedCid(false);
      setShareCreated(false);
    }
  }, [isOpen, file]);

  const handleCreateShare = useCallback(async () => {
    if (!file) return;
    
    setIsCreating(true);
    try {
      const expiryDate = expiry === "0" 
        ? undefined 
        : new Date(Date.now() + parseInt(expiry) * 24 * 60 * 60 * 1000).toISOString();
      
      await shareApi.createShare({
        cid: file.cid,
        filename: file.name,
        size: file.size,
        password: password || undefined,
        expiry: expiryDate,
      });
      
      setShareCreated(true);
    } catch (error) {
      console.error("创建分享失败:", error);
    } finally {
      setIsCreating(false);
    }
  }, [file, password, expiry]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    
    await copyToClipboard(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [shareUrl]);

  const handleCopyCid = useCallback(async () => {
    if (!file?.cid) return;
    
    await copyToClipboard(file.cid);
    setCopiedCid(true);
    setTimeout(() => setCopiedCid(false), 2000);
  }, [file?.cid]);

  if (!file) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-cloudchan-purple" />
          <h3 className="text-lg font-semibold">分享文件</h3>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-1">
            <Link2 className="h-4 w-4" />
            分享链接
          </label>
          <div className="flex space-x-2">
            <Input 
              value={shareUrl} 
              readOnly 
              className="flex-1 text-sm"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button 
              onClick={handleCopyLink}
              variant={copiedLink ? "default" : "outline"}
              className="shrink-0"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 mr-1 text-green-500" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  复制
                </>
              )}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-1">
            <Lock className="h-4 w-4" />
            访问密码（可选）
          </label>
          <Input
            type="text"
            placeholder="设置访问密码，留空则公开访问"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-sm"
          />
          {password && (
            <p className="text-xs text-muted-foreground mt-1">
              访问者需要输入密码才能查看文件
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            有效期
          </label>
          <select
            className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-slate-800"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          >
            <option value="1">1天</option>
            <option value="7">7天</option>
            <option value="30">30天</option>
            <option value="0">永久有效</option>
          </select>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">
              CID: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{file.cid.slice(0, 16)}...</code>
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopyCid}
              className="h-7 text-xs"
            >
              {copiedCid ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  复制 CID
                </>
              )}
            </Button>
          </div>
          
          {!shareCreated ? (
            <Button 
              className="w-full" 
              onClick={handleCreateShare}
              disabled={isCreating}
            >
              {isCreating ? "创建中..." : "创建分享链接"}
            </Button>
          ) : (
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ 分享链接已创建
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
