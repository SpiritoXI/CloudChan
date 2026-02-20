"use client";

import { File, Image, Film, Music, Clock, Server, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize, isImageFile, isMediaFile, isVideoFile } from "@/lib/utils";

interface FileInfoCardProps {
  cid: string;
  filename?: string;
  size?: number;
  expiry?: string;
  copiedCid: boolean;
  onCopyCid: () => void;
}

export function FileInfoCard({
  cid,
  filename,
  size,
  expiry,
  copiedCid,
  onCopyCid,
}: FileInfoCardProps) {
  const getFileIcon = () => {
    if (isImageFile(filename || "")) {
      return <Image className="h-10 w-10 text-green-600 dark:text-green-400" />;
    }
    if (isMediaFile(filename || "")) {
      return isVideoFile(filename || "") ? (
        <Film className="h-10 w-10 text-purple-600 dark:text-purple-400" />
      ) : (
        <Music className="h-10 w-10 text-pink-600 dark:text-pink-400" />
      );
    }
    return <File className="h-10 w-10 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-start space-x-4">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center flex-shrink-0">
          {getFileIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 break-all">
            {filename || `文件-${cid.slice(0, 16)}...`}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            {size && (
              <span className="flex items-center">
                <Server className="h-4 w-4 mr-1" />
                {formatFileSize(size)}
              </span>
            )}
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              CID: {cid.slice(0, 12)}...{cid.slice(-6)}
            </span>
            {expiry && (
              <span className="flex items-center text-amber-600 dark:text-amber-400">
                有效期: {expiry}天
              </span>
            )}
            {isImageFile(filename || "") && (
              <span className="flex items-center text-green-600 dark:text-green-400">
                <Image className="h-4 w-4 mr-1" />
                支持图片预览
              </span>
            )}
            {isMediaFile(filename || "") && (
              <span className="flex items-center text-purple-600 dark:text-purple-400">
                支持在线播放
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center space-x-2">
            <code className="flex-1 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 break-all">
              {cid}
            </code>
            <Button variant="outline" size="sm" onClick={onCopyCid}>
              {copiedCid ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
