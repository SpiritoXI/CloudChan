"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { FileRecord } from "@/types";

export function useBatchOperations(
  files: FileRecord[],
  setFiles: React.Dispatch<React.SetStateAction<FileRecord[]>>,
  showToast: (message: string, type: "success" | "error" | "info" | "warning") => void
) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const handleToggleSelection = useCallback((fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  }, []);

  const createHandleSelectAll = useCallback((searchQuery: string, currentFolderId: string | null) => {
    return () => {
      const filteredFiles = files.filter((file) => {
        const matchesSearch =
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.cid.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFolder = currentFolderId
          ? file.folder_id === currentFolderId
          : true;
        return matchesSearch && matchesFolder;
      });

      setSelectedFiles(filteredFiles.map((file) => String(file.id)));
    };
  }, [files]);

  const handleClearSelection = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const handleBatchMove = useCallback(async (targetFolderId: string | null) => {
    if (selectedFiles.length === 0) return;

    try {
      await api.moveFiles(selectedFiles, targetFolderId || "default");
      setFiles((prev) =>
        prev.map((f) =>
          selectedFiles.includes(String(f.id)) ? { ...f, folder_id: targetFolderId || "default" } : f
        )
      );
      setSelectedFiles([]);
      showToast(`已移动 ${selectedFiles.length} 个文件`, "success");
    } catch {
      showToast("批量移动失败", "error");
    }
  }, [selectedFiles, setFiles, showToast]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      for (const fileId of selectedFiles) {
        await api.deleteFile(fileId);
      }
      setFiles((prev) => prev.filter((f) => !selectedFiles.includes(String(f.id))));
      setSelectedFiles([]);
      showToast(`已删除 ${selectedFiles.length} 个文件`, "success");
    } catch {
      showToast("批量删除失败", "error");
    }
  }, [selectedFiles, setFiles, showToast]);

  const handleBatchCopy = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    showToast(`复制 ${selectedFiles.length} 个文件`, "success");
    setSelectedFiles([]);
  }, [selectedFiles.length, showToast]);

  return {
    selectedFiles,
    setSelectedFiles,
    handleToggleSelection,
    createHandleSelectAll,
    handleClearSelection,
    handleBatchMove,
    handleBatchDelete,
    handleBatchCopy,
  };
}
