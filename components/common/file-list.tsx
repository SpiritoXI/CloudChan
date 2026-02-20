"use client";

import { useState, useEffect, useRef, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Copy, Check, Download, Folder, Trash2, ChevronDown, Globe, Pencil, Share2, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { FileRecord, Gateway } from "@/types";
import { formatFileSize, formatDate, getFileIcon, getFileExtension } from "@/lib/utils";

interface FileListProps {
  files: FileRecord[];
  viewMode: "list" | "grid";
  isLoading: boolean;
  copiedId: string | number | null;
  selectedFiles: string[];
  onCopyCid: (cid: string, fileId: string | number) => void;
  onDownload: (cid: string, filename: string) => void;
  onDownloadWithGateway: (cid: string, filename: string, gateway: Gateway) => void;
  onDownloadMenu: (file: FileRecord) => void;
  onMove: (file: FileRecord) => void;
  onDelete: (fileId: string | number) => void;
  onPreview?: (file: FileRecord) => void;
  onRename?: (file: FileRecord) => void;
  onShare?: (file: FileRecord) => void;
  onToggleSelection?: (fileId: string) => void;
  onSelectAll?: () => void;
  gateways?: Gateway[];
}

const FileListComponent = function FileList({
  files,
  viewMode,
  isLoading,
  copiedId,
  selectedFiles,
  onCopyCid,
  onDownload,
  onDownloadWithGateway,
  onDownloadMenu,
  onMove,
  onDelete,
  onPreview,
  onRename,
  onShare,
  onToggleSelection,
  onSelectAll,
  gateways = [],
}: FileListProps) {
  const [openGatewayMenuId, setOpenGatewayMenuId] = useState<string | number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleDownloadWithGateway = (file: FileRecord, gateway: Gateway) => {
    onDownloadWithGateway(file.cid, file.name, gateway);
    setOpenGatewayMenuId(null);
  };

  const allSelected = files.length > 0 && files.every((f) => selectedFiles.includes(String(f.id)));
  const someSelected = selectedFiles.length > 0 && !allSelected;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenGatewayMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-12 w-12 rounded-full border-4 border-cloudchan-purple/20 border-t-cloudchan-purple"
          />
          <p className="text-muted-foreground text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-full flex-col items-center justify-center text-muted-foreground"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Cloud className="mb-4 h-20 w-20 opacity-30" />
        </motion.div>
        <p className="text-lg font-medium mb-1">暂无文件</p>
        <p className="text-sm opacity-70">拖拽文件到此处或点击上传按钮</p>
      </motion.div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="rounded-xl glass overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-white/60 to-white/40">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium w-10">
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                    onCheckedChange={onSelectAll}
                    aria-label="全选"
                    className="border-cloudchan-purple/30"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">文件名</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">大小</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">上传时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">CID</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {files.map((file, index) => (
                  <motion.tr
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className={`border-t border-white/20 hover:bg-white/40 transition-colors duration-200 ${selectedFiles.includes(String(file.id)) ? "bg-cloudchan-purple/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedFiles.includes(String(file.id))}
                        onCheckedChange={() => onToggleSelection?.(String(file.id))}
                        aria-label={`选择 ${file.name}`}
                        className="border-cloudchan-purple/30 data-[state=checked]:bg-cloudchan-purple data-[state:checked]:border-cloudchan-purple"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center cursor-pointer hover:text-cloudchan-purple transition-colors group"
                        onClick={() => onPreview?.(file)}
                        title="点击预览"
                      >
                        <motion.span
                          className="mr-2"
                          whileHover={{ scale: 1.1 }}
                          transition={{ duration: 0.2 }}
                        >
                          {getFileIcon(file.name)}
                        </motion.span>
                        <span className="truncate max-w-[200px] font-medium">{file.name}</span>
                        {getFileExtension(file.name) && (
                          <span className="ml-2 text-xs text-cloudchan-purple bg-cloudchan-purple/10 px-2 py-0.5 rounded-full">
                            .{getFileExtension(file.name)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatFileSize(file.size)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(file.date)}</td>
                    <td className="px-4 py-3">
                      <code className="rounded-lg bg-white/60 px-2 py-1 text-xs font-mono border border-white/30">
                        {file.cid.slice(0, 12)}...
                      </code>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-cloudchan-purple/10 hover:text-cloudchan-purple transition-colors"
                          onClick={() => onCopyCid(file.cid, file.id)}
                          title="复制 CID"
                        >
                          <AnimatePresence mode="wait">
                            {copiedId === file.id ? (
                              <motion.div
                                key="check"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                              >
                                <Check className="h-4 w-4 text-green-500" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="copy"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                              >
                                <Copy className="h-4 w-4" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Button>
                        <div className="relative" ref={openGatewayMenuId === file.id ? menuRef : null}>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 rounded-r-none border-r-0 hover:bg-cloudchan-blue/10 hover:text-cloudchan-blue transition-colors"
                              onClick={() => onDownload(file.cid, file.name)}
                              title="立即下载"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              下载
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-6 rounded-l-none px-1 hover:bg-cloudchan-blue/10 hover:text-cloudchan-blue transition-colors"
                              onClick={() => setOpenGatewayMenuId(openGatewayMenuId === file.id ? null : file.id)}
                              title="选择网关下载"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <AnimatePresence>
                            {openGatewayMenuId === file.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-1 w-56 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/30 z-50 py-1 overflow-hidden"
                              >
                                <div className="px-3 py-2 border-b border-white/30 bg-gradient-to-r from-cloudchan-purple/5 to-cloudchan-blue/5">
                                  <p className="text-xs font-medium text-muted-foreground flex items-center">
                                    <Globe className="h-3 w-3 mr-1" />
                                    选择网关下载
                                  </p>
                                </div>
                                {gateways.filter(g => g.available).length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                    暂无可用网关
                                  </div>
                                ) : (
                                  gateways
                                    .filter(g => g.available)
                                    .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity))
                                    .map(gateway => (
                                      <button
                                        key={gateway.name}
                                        onClick={() => handleDownloadWithGateway(file, gateway)}
                                        className="w-full px-3 py-2 text-left hover:bg-cloudchan-purple/5 transition-colors flex items-center justify-between"
                                      >
                                        <div className="flex items-center">
                                          <span className="text-sm mr-2">{gateway.icon}</span>
                                          <span className="text-sm">{gateway.name}</span>
                                        </div>
                                        <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{gateway.latency}ms</span>
                                      </button>
                                    ))
                                )}
                                <div className="border-t border-white/30 mt-1 pt-1">
                                  <button
                                    onClick={() => {
                                      onDownloadMenu(file);
                                      setOpenGatewayMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-cloudchan-purple/5 transition-colors text-sm text-muted-foreground flex items-center"
                                  >
                                    <Globe className="h-4 w-4 mr-2" />
                                    更多网关选项...
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          onClick={() => onMove(file)}
                          title="移动到文件夹"
                        >
                          <Folder className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          onClick={() => onShare?.(file)}
                          title="分享文件"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                          onClick={() => onRename?.(file)}
                          title="重命名"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-50 hover:text-red-600 transition-colors"
                          onClick={() => onDelete(file.id)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <AnimatePresence>
        {files.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: index * 0.03 }}
            className={`glass rounded-xl p-4 card-hover cursor-pointer relative group overflow-hidden ${selectedFiles.includes(String(file.id)) ? "ring-2 ring-cloudchan-purple bg-cloudchan-purple/5" : ""}`}
            onClick={() => onPreview?.(file)}
            whileHover={{ y: -4 }}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cloudchan-blue to-cloudchan-purple opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedFiles.includes(String(file.id))}
                onCheckedChange={() => onToggleSelection?.(String(file.id))}
                aria-label={`选择 ${file.name}`}
                className="border-white/50 bg-white/50 data-[state=checked]:bg-cloudchan-purple data-[state:checked]:border-cloudchan-purple"
              />
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
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
                className="h-7 w-7 bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(file.cid, file.name);
                }}
                title="下载"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare?.(file);
                }}
                title="分享"
              >
                <Share2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-white/80 backdrop-blur-sm hover:bg-red-50 shadow-sm text-destructive"
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
              <motion.span
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                {getFileIcon(file.name)}
              </motion.span>
            </div>
            <p className="truncate text-sm font-medium mb-1">{file.name}</p>
            <div className="flex items-center justify-between">
              {getFileExtension(file.name) && (
                <span className="text-xs text-cloudchan-purple bg-cloudchan-purple/10 px-2 py-0.5 rounded-full">
                  .{getFileExtension(file.name)}
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{formatFileSize(file.size)}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export const FileList = memo(FileListComponent);
