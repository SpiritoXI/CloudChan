"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  Upload,
  Folder,
  FolderOpen,
  Globe,
  LogOut,
  Plus,
  Edit3,
  Trash2,
  HardDrive,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Folder as FolderType } from "@/types";
import { formatFileSize } from "@/lib/utils";

interface SidebarProps {
  totalSize: number;
  filesCount: number;
  foldersCount: number;
  folders: FolderType[];
  currentFolderId: string | null;
  isUploading: boolean;
  onUploadClick: () => void;
  onAddCidClick: () => void;
  onTestGateways: () => void;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: FolderType) => void;
  onDeleteFolder: (folderId: string) => void;
  onLogout: () => void;
}

export function Sidebar({
  totalSize,
  filesCount,
  foldersCount,
  folders,
  currentFolderId,
  isUploading,
  onUploadClick,
  onAddCidClick,
  onTestGateways,
  onFolderSelect,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onLogout,
}: SidebarProps) {
  const storagePercent = Math.min((Math.max(0, Number(totalSize) || 0) / (1024 * 1024 * 1024)) * 100, 100);

  return (
    <motion.aside
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="w-64 glass border-r border-white/20 flex flex-col"
    >
      <div className="flex h-16 items-center border-b border-white/20 px-6">
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
        >
          <Cloud className="mr-2 h-6 w-6 text-cloudchan-purple" />
        </motion.div>
        <span className="text-xl font-bold gradient-text">CrustShare</span>
      </div>

      <div className="p-4 flex-1 overflow-hidden flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl bg-gradient-to-br from-white/60 to-white/40 p-4 border border-white/30 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-cloudchan-purple" />
              <span className="text-sm font-medium text-muted-foreground">存储空间</span>
            </div>
          </div>
          <div className="mb-3">
            <span className="text-2xl font-bold gradient-text">{formatFileSize(totalSize)}</span>
          </div>
          <div className="relative">
            <Progress value={storagePercent} className="h-2" />
            <motion.div
              className="absolute top-0 left-0 h-2 rounded-full bg-gradient-to-r from-cloudchan-blue to-cloudchan-purple"
              initial={{ width: 0 }}
              animate={{ width: `${storagePercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {filesCount} 个文件
            </span>
            <span>{foldersCount} 个文件夹</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3 mb-4"
        >
          <Button
            className="w-full bg-gradient-to-r from-cloudchan-blue to-cloudchan-purple hover:opacity-90 shadow-md hover:shadow-lg transition-all duration-200 group"
            onClick={onUploadClick}
            disabled={isUploading}
          >
            <Upload className={`mr-2 h-4 w-4 ${isUploading ? "animate-bounce" : "group-hover:scale-110 transition-transform"}`} />
            {isUploading ? "上传中..." : "上传文件"}
          </Button>

          <Button
            className="w-full border-cloudchan-purple/30 hover:bg-cloudchan-purple/10 hover:border-cloudchan-purple/50 transition-all duration-200"
            variant="outline"
            onClick={onAddCidClick}
          >
            <Plus className="mr-2 h-4 w-4" />
            添加CID
          </Button>
        </motion.div>

        <nav className="space-y-1 mb-4">
          <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
            <Button
              variant="ghost"
              className={`w-full justify-start transition-all duration-200 ${!currentFolderId ? "bg-white/40 shadow-sm" : "hover:bg-white/30"}`}
              onClick={() => onFolderSelect(null)}
            >
              <Folder className="mr-2 h-4 w-4" />
              全部文件
              {!currentFolderId && <ChevronRight className="ml-auto h-4 w-4 text-cloudchan-purple" />}
            </Button>
          </motion.div>
          <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-white/30 transition-all duration-200"
              onClick={onTestGateways}
            >
              <Globe className="mr-2 h-4 w-4" />
              网关检测
            </Button>
          </motion.div>
        </nav>

        <div className="border-t border-white/20 pt-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3 px-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">文件夹</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-cloudchan-purple/20 hover:text-cloudchan-purple transition-colors"
              onClick={onCreateFolder}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            <AnimatePresence>
              {folders.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground px-3 py-4 text-center"
                >
                  暂无文件夹
                </motion.p>
              ) : (
                folders.map((folder, index) => (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-sm transition-all duration-200 ${
                        currentFolderId === folder.id ? "bg-white/40 shadow-sm" : "hover:bg-white/30"
                      }`}
                      onClick={() => onFolderSelect(folder.id)}
                    >
                      {currentFolderId === folder.id ? (
                        <FolderOpen className="mr-2 h-4 w-4 text-cloudchan-purple" />
                      ) : (
                        <Folder className="mr-2 h-4 w-4" />
                      )}
                      <span className="truncate flex-1 text-left">{folder.name}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-white/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditFolder(folder);
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolder(folder.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </Button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20 p-4 bg-white/20">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </Button>
      </div>
    </motion.aside>
  );
}
