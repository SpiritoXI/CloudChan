"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { generateId } from "@/lib/utils";
import type { FileRecord, Folder } from "@/types";

export function useFolderManager(
  folders: Folder[],
  setFolders: (folders: Folder[]) => void,
  currentFolderId: string | null,
  setCurrentFolderId: (id: string | null) => void,
  showToast: (message: string, type: "success" | "error" | "info" | "warning") => void
) {
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      showToast("请输入文件夹名称", "error");
      return;
    }

    try {
      const newFolder = await api.createFolder(newFolderName.trim(), currentFolderId);
      const updatedFolders = [...folders, newFolder];
      setFolders(updatedFolders);
      setFolderModalOpen(false);
      setNewFolderName("");
      showToast("文件夹已创建", "success");
    } catch {
      showToast("创建文件夹失败", "error");
    }
  }, [newFolderName, folders, currentFolderId, setFolders, showToast]);

  const handleRenameFolder = useCallback(async () => {
    if (!editingFolder || !newFolderName.trim()) {
      showToast("请输入文件夹名称", "error");
      return;
    }

    try {
      await api.renameFolder(editingFolder.id, newFolderName.trim());
      const updatedFolders = folders.map((f) =>
        f.id === editingFolder.id ? { ...f, name: newFolderName.trim() } : f
      );
      setFolders(updatedFolders);
      setFolderModalOpen(false);
      setNewFolderName("");
      setEditingFolder(null);
      showToast("文件夹已重命名", "success");
    } catch {
      showToast("重命名文件夹失败", "error");
    }
  }, [editingFolder, newFolderName, folders, setFolders, showToast]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    if (!folderId) return;

    try {
      await api.deleteFolder(folderId);
      const updatedFolders = folders.filter((f) => f.id !== folderId);
      setFolders(updatedFolders);
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
      showToast("文件夹已删除", "success");
    } catch {
      showToast("删除文件夹失败", "error");
    }
  }, [currentFolderId, folders, setFolders, setCurrentFolderId, showToast]);

  return {
    folderModalOpen,
    setFolderModalOpen,
    newFolderName,
    setNewFolderName,
    editingFolder,
    setEditingFolder,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
  };
}
