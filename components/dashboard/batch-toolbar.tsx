"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, FolderInput, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Folder } from "@/types";

interface BatchToolbarProps {
  selectedCount: number;
  folders: Folder[];
  onClearSelection: () => void;
  onBatchMove: (targetFolderId: string | null) => void;
  onBatchCopy: (targetFolderId: string | null) => void;
  onBatchDelete: () => void;
}

export function BatchToolbar({
  selectedCount,
  folders,
  onClearSelection,
  onBatchMove,
  onBatchCopy,
  onBatchDelete,
}: BatchToolbarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="border-b border-white/20 bg-gradient-to-r from-cloudchan-purple/10 via-cloudchan-blue/10 to-cloudchan-purple/10 px-6 py-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-cloudchan-purple text-white text-xs font-bold">
                    {selectedCount}
                  </div>
                  <span className="text-sm font-medium">已选择文件</span>
                </motion.div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  取消选择
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <select
                    className="appearance-none text-sm border border-white/30 rounded-lg px-3 py-1.5 pr-8 bg-white/60 hover:bg-white/80 focus:bg-white/80 focus:border-cloudchan-purple/30 focus:ring-1 focus:ring-cloudchan-purple/20 transition-all cursor-pointer"
                    onChange={(e) => {
                      const folderId = e.target.value;
                      if (folderId) {
                        onBatchMove(folderId === "default" ? null : folderId);
                        e.target.value = "";
                      }
                    }}
                    value=""
                  >
                    <option value="" disabled>
                      移动到...
                    </option>
                    <option value="default">根目录</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  <FolderInput className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    className="appearance-none text-sm border border-white/30 rounded-lg px-3 py-1.5 pr-8 bg-white/60 hover:bg-white/80 focus:bg-white/80 focus:border-cloudchan-purple/30 focus:ring-1 focus:ring-cloudchan-purple/20 transition-all cursor-pointer"
                    onChange={(e) => {
                      const folderId = e.target.value;
                      if (folderId) {
                        onBatchCopy(folderId === "default" ? null : folderId);
                        e.target.value = "";
                      }
                    }}
                    value=""
                  >
                    <option value="" disabled>
                      复制到...
                    </option>
                    <option value="default">根目录</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  <Copy className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBatchDelete}
                  className="shadow-sm hover:shadow-md transition-shadow"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
