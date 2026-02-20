"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { generateId } from "@/lib/utils";
import type { FileRecord } from "@/types";

interface DetectedCidInfo {
  cid: string;
  name: string;
  size: number;
  isDirectory: boolean;
  valid: boolean;
  error?: string;
}

export function useCidManager(
  currentFolderId: string | null,
  setFiles: React.Dispatch<React.SetStateAction<FileRecord[]>>,
  showToast: (message: string, type: "success" | "error" | "info" | "warning") => void
) {
  const [addCidModalOpen, setAddCidModalOpen] = useState(false);
  const [newCid, setNewCid] = useState("");
  const [newCidName, setNewCidName] = useState("");
  const [newCidSize, setNewCidSize] = useState("");
  const [isAddingCid, setIsAddingCid] = useState(false);
  const [isDetectingCid, setIsDetectingCid] = useState(false);
  const [detectedCidInfo, setDetectedCidInfo] = useState<DetectedCidInfo | null>(null);

  const handleDetectCid = useCallback(async (cid: string) => {
    if (!cid.trim()) return;

    setIsDetectingCid(true);
    try {
      const metadata = await api.fetchCidInfo(cid);
      const metadataWithCid: DetectedCidInfo = metadata 
        ? { ...metadata, cid }
        : { cid, name: "", size: 0, isDirectory: false, valid: false, error: "无法获取文件信息" };
      setDetectedCidInfo(metadataWithCid);

      if (metadata?.valid) {
        if (metadata.name && !newCidName) {
          setNewCidName(metadata.name);
        }
        if (metadata.size > 0 && !newCidSize) {
          setNewCidSize(metadata.size.toString());
        }
      }

      if (metadata?.error) {
        showToast(metadata.error, "warning");
      }
    } catch {
      setDetectedCidInfo({
        cid,
        name: "",
        size: 0,
        isDirectory: false,
        valid: false,
        error: "无法自动检测文件信息，请手动填写",
      });
      showToast("无法自动检测文件信息，请手动填写", "warning");
    } finally {
      setIsDetectingCid(false);
    }
  }, [newCidName, newCidSize, showToast]);

  const handleAddCid = useCallback(async () => {
    if (!newCid.trim()) {
      showToast("请输入CID", "error");
      return;
    }

    setIsAddingCid(true);

    try {
      let name = newCidName.trim();
      const userInputSize = newCidSize ? (parseInt(newCidSize) || 0) : 0;
      let size = userInputSize;

      let metadata = detectedCidInfo;
      if (!metadata || metadata.cid !== newCid.trim()) {
        setIsDetectingCid(true);
        try {
          const fetchedMetadata = await api.fetchCidInfo(newCid);
          if (fetchedMetadata) {
            metadata = { ...fetchedMetadata, cid: newCid.trim() };
            setDetectedCidInfo(metadata);
          }

          if (metadata && !metadata.valid) {
            showToast(metadata.error || "无效的CID格式", "error");
            return;
          }
        } catch {
          // continue
        } finally {
          setIsDetectingCid(false);
        }
      }

      if (!name) {
        name = metadata?.name || `file-${newCid.slice(0, 8)}`;
      }

      if (!userInputSize && metadata?.size) {
        size = metadata.size;
      }

      const fileRecord: FileRecord = {
        id: generateId(),
        name,
        size,
        cid: newCid.trim(),
        date: new Date().toLocaleString(),
        folder_id: currentFolderId || "default",
        hash: "",
        verified: false,
        verify_status: metadata?.valid ? "ok" : "pending",
        uploadedAt: Date.now(),
      };

      await api.saveFile(fileRecord);
      setFiles((prev) => [fileRecord, ...prev]);
      
      setAddCidModalOpen(false);
      setNewCid("");
      setNewCidName("");
      setNewCidSize("");
      setDetectedCidInfo(null);
      showToast("文件已添加", "success");
    } catch {
      showToast("添加文件失败", "error");
    } finally {
      setIsAddingCid(false);
    }
  }, [currentFolderId, newCid, newCidName, newCidSize, setFiles, showToast, detectedCidInfo]);

  return {
    addCidModalOpen,
    setAddCidModalOpen,
    newCid,
    setNewCid,
    newCidName,
    setNewCidName,
    newCidSize,
    setNewCidSize,
    isAddingCid,
    isDetectingCid,
    detectedCidInfo,
    handleDetectCid,
    handleAddCid,
  };
}
