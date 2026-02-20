"use client";

import { Settings, Moon, Sun, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/common";
import { formatFileSize } from "@/lib/utils";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  itemsPerPage: number;
  autoRefresh: boolean;
  filesCount: number;
  foldersCount: number;
  totalSize: number;
  onDarkModeChange: (value: boolean) => void;
  onItemsPerPageChange: (value: number) => void;
  onAutoRefreshChange: (value: boolean) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  darkMode,
  itemsPerPage,
  autoRefresh,
  filesCount,
  foldersCount,
  totalSize,
  onDarkModeChange,
  onItemsPerPageChange,
  onAutoRefreshChange,
}: SettingsModalProps) {
  const title = (
    <h3 className="text-lg font-semibold flex items-center">
      <Settings className="h-5 w-5 mr-2" />
      设置
    </h3>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        {/* Theme Settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {darkMode ? (
              <Moon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Sun className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">深色模式</p>
              <p className="text-xs text-muted-foreground">切换应用主题</p>
            </div>
          </div>
          <Button variant={darkMode ? "default" : "outline"} size="sm" onClick={() => onDarkModeChange(!darkMode)}>
            {darkMode ? "开启" : "关闭"}
          </Button>
        </div>

        {/* Items Per Page */}
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">每页显示</p>
              <p className="text-xs text-muted-foreground">设置文件列表每页显示数量</p>
            </div>
          </div>
          <div className="flex space-x-2">
            {[10, 20, 50, 100].map((num) => (
              <Button
                key={num}
                variant={itemsPerPage === num ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => onItemsPerPageChange(num)}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>

        {/* Auto Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">自动刷新</p>
              <p className="text-xs text-muted-foreground">自动检查文件状态</p>
            </div>
          </div>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => onAutoRefreshChange(!autoRefresh)}
          >
            {autoRefresh ? "开启" : "关闭"}
          </Button>
        </div>

        {/* Storage Info */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-3 mb-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <p className="font-medium">存储统计</p>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">文件总数</span>
              <span>{filesCount} 个</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">文件夹数</span>
              <span>{foldersCount} 个</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">总大小</span>
              <span>{formatFileSize(totalSize)}</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="pt-4 border-t">
          <p className="text-xs text-center text-muted-foreground">CrustShare v3.0</p>
          <p className="text-xs text-center text-muted-foreground">基于 Crust Network · IPFS</p>
        </div>
      </div>
    </Modal>
  );
}
