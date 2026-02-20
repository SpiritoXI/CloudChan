"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { FileRecord } from "@/types";

export function useFileOperations(
  setFiles: React.Dispatch<React.SetStateAction<FileRecord[]>>,
  showToast: (message: string, type: "success" | "error" | "info" | "warning") => void
) {
  const [renameFileModalOpen, setRenameFileModalOpen] = useState(false);
  const [selectedFileToRename, setSelectedFileToRename] = useState<FileRecord | null>(null);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFileToShare, setSelectedFileToShare] = useState<FileRecord | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedFileToMove, setSelectedFileToMove] = useState<FileRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  const handleDelete = useCallback(async (fileId: string | number) => {
    try {
      await api.deleteFile(fileId.toString());
      setFiles((prev) => prev.filter((f) => f.id !== fileId.toString()));
      showToast("文件已删除", "success");
    } catch {
      showToast("删除文件失败", "error");
    }
  }, [setFiles, showToast]);

  const handleCopyCID = useCallback((cid: string, fileId: string | number) => {
    navigator.clipboard.writeText(cid);
    setCopiedId(fileId);
    setTimeout(() => setCopiedId(null), 2000);
    showToast("CID 已复制", "success");
  }, [showToast]);

  const handleRenameFile = useCallback((file: FileRecord) => {
    setSelectedFileToRename(file);
    setRenameFileModalOpen(true);
  }, []);

  const handleSubmitRenameFile = useCallback(async (fileId: string | number, newName: string) => {
    try {
      await api.renameFile(fileId.toString(), newName);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId.toString() ? { ...f, name: newName } : f
        )
      );
      showToast("文件已重命名", "success");
      setRenameFileModalOpen(false);
      setSelectedFileToRename(null);
    } catch {
      showToast("重命名文件失败", "error");
    }
  }, [setFiles, showToast]);

  const handlePreview = useCallback((file: FileRecord) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewFile(null);
  }, []);

  const handleShareFile = useCallback((file: FileRecord) => {
    setSelectedFileToShare(file);
    setShareModalOpen(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShareModalOpen(false);
    setSelectedFileToShare(null);
  }, []);

  const handleMoveFile = useCallback(async (targetFolderId: string | null) => {
    if (!selectedFileToMove) return;

    try {
      await api.moveFiles([selectedFileToMove.id], targetFolderId || "default");
      setFiles((prev) =>
        prev.map((f) =>
          f.id === selectedFileToMove.id ? { ...f, folder_id: targetFolderId || "default" } : f
        )
      );
      setMoveModalOpen(false);
      setSelectedFileToMove(null);
      showToast("文件移动成功", "success");
    } catch {
      showToast("移动文件失败", "error");
    }
  }, [selectedFileToMove, setFiles, showToast]);

  return {
    renameFileModalOpen,
    setRenameFileModalOpen,
    selectedFileToRename,
    setSelectedFileToRename,
    previewFile,
    setPreviewFile,
    previewOpen,
    setPreviewOpen,
    shareModalOpen,
    setShareModalOpen,
    selectedFileToShare,
    setSelectedFileToShare,
    moveModalOpen,
    setMoveModalOpen,
    selectedFileToMove,
    setSelectedFileToMove,
    copiedId,
    handleDelete,
    handleCopyCID,
    handleRenameFile,
    handleSubmitRenameFile,
    handlePreview,
    handleClosePreview,
    handleShareFile,
    handleCloseShareModal,
    handleMoveFile,
  };
}
