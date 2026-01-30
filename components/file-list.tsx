"use client";

import { motion } from "framer-motion";
import { Cloud, Copy, Check, Share2, Download, Folder, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileRecord } from "@/types";
import { formatFileSize, formatDate, getFileIcon } from "@/lib/utils";

interface FileListProps {
  files: FileRecord[];
  viewMode: "list" | "grid";
  isLoading: boolean;
  copiedId: string | number | null;
  onCopyCid: (cid: string, fileId: string | number) => void;
  onShare: (file: FileRecord) => void;
  onDownload: (cid: string, filename: string) => void;
  onDownloadMenu: (file: FileRecord) => void;
  onMove: (file: FileRecord) => void;
  onDelete: (fileId: string | number) => void;
}

export function FileList({
  files,
  viewMode,
  isLoading,
  copiedId,
  onCopyCid,
  onShare,
  onDownload,
  onDownloadMenu,
  onMove,
  onDelete,
}: FileListProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cloudchan-purple border-t-transparent" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <Cloud className="mb-4 h-16 w-16 opacity-50" />
        <p className="text-lg font-medium">暂无文件</p>
        <p className="text-sm">拖拽文件到此处或点击上传按钮</p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="rounded-xl glass overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">文件名</th>
              <th className="px-4 py-3 text-left text-sm font-medium">大小</th>
              <th className="px-4 py-3 text-left text-sm font-medium">上传时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium">CID</th>
              <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => (
              <motion.tr
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-t border-white/20 hover:bg-white/30"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <span className="mr-2">{getFileIcon(file.name)}</span>
                    <span className="truncate max-w-[200px]">{file.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{formatFileSize(file.size)}</td>
                <td className="px-4 py-3 text-sm">{formatDate(file.date)}</td>
                <td className="px-4 py-3">
                  <code className="rounded bg-white/50 px-2 py-1 text-xs">
                    {file.cid.slice(0, 12)}...
                  </code>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onCopyCid(file.cid, file.id)}
                      title="复制 CID"
                    >
                      {copiedId === file.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onShare(file)}
                      title="分享"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDownload(file.cid, file.name)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onDownloadMenu(file);
                      }}
                      title="下载 (右键选择网关)"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onMove(file)}
                      title="移动到文件夹"
                    >
                      <Folder className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onDelete(file.id)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Grid view
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {files.map((file, index) => (
        <motion.div
          key={file.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="glass rounded-xl p-4 card-hover cursor-pointer relative group"
        >
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-white/80"
              onClick={(e) => {
                e.stopPropagation();
                onCopyCid(file.cid, file.id);
              }}
              title="复制 CID"
            >
              {copiedId === file.id ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-white/80"
              onClick={(e) => {
                e.stopPropagation();
                onShare(file);
              }}
              title="分享"
            >
              <Share2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-white/80"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(file.cid, file.name);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDownloadMenu(file);
              }}
              title="下载 (右键选择网关)"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-white/80"
              onClick={(e) => {
                e.stopPropagation();
                onMove(file);
              }}
              title="移动到文件夹"
            >
              <Folder className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-white/80 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file.id);
              }}
              title="删除"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="mb-3 flex h-16 items-center justify-center text-4xl">
            {getFileIcon(file.name)}
          </div>
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        </motion.div>
      ))}
    </div>
  );
}
