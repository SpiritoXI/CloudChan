/**
 * 文件上传 Hook
 * 处理文件上传逻辑
 */

"use client";

import { useState, useCallback } from "react";
import { api, uploadApi, propagationApi } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { useFileStore, useUIStore, useGatewayStore } from "@/lib/store";
import { generateId, hasEnoughQuota, updateUploadQuota, formatQuotaInfo, getUploadQuota } from "@/lib/utils";
import { isAllowedFileType, isSafeFilename, sanitizeFilename, calculateFileHash } from "@/lib/security";
import { getAutoRepairService } from "@/lib/auto-repair";
import { handleError } from "@/lib/error-handler";
import type { FileRecord } from "@/types";

export interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  currentFile: File | null;
}

export interface UploadOperations {
  handleFileUpload: (fileList: FileList | null) => Promise<void>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  cancelUpload: () => void;
}

interface UseUploadOptions {
  currentFolderId: string | null;
  onUploadSuccess?: (file: FileRecord) => void;
}

export function useUpload(options: UseUploadOptions): UploadState & UploadOperations {
  const { currentFolderId, onUploadSuccess } = options;
  const { files, setFiles } = useFileStore();
  const { showToast } = useUIStore();
  const { gateways } = useGatewayStore();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // 验证文件
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // 文件大小检查
    if (file.size > CONFIG.UPLOAD.MAX_SIZE) {
      return { valid: false, error: `文件 ${file.name} 超过1GB限制` };
    }
    
    // 文件名安全检查
    if (!isSafeFilename(file.name)) {
      return { valid: false, error: `文件 ${file.name} 包含非法字符` };
    }
    
    // MIME 类型检查
    if (file.type && !isAllowedFileType(file.type)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'txt', 'md', 'json', 'mp4', 'webm', 'mp3', 'wav', 'zip', 'rar'];
      if (ext && !allowedExts.includes(ext)) {
        return { valid: false, error: `文件 ${file.name} 类型不支持` };
      }
    }
    
    return { valid: true };
  }, []);

  // 处理文件上传
  const handleFileUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const filesArray = Array.from(fileList);
      
      // 验证所有文件
      const validFiles: File[] = [];
      let totalSize = 0;
      let oversizedFiles: string[] = [];
      
      for (const file of filesArray) {
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
          totalSize += file.size;
        } else {
          if (validation.error?.includes('超过')) {
            oversizedFiles.push(file.name);
          }
          showToast(validation.error!, "error");
        }
      }

      if (oversizedFiles.length > 0) {
        showToast(`${oversizedFiles.length} 个文件超过 1GB 限制，已跳过`, 'warning');
      }

      if (validFiles.length === 0) return;

      // 检查上传配额
      if (!hasEnoughQuota(totalSize)) {
        const quota = getUploadQuota();
        showToast(`上传配额不足！${formatQuotaInfo(quota)}`, 'error');
        return;
      }

      // 显示总大小信息
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      console.log(`[Upload] 准备上传 ${validFiles.length} 个文件，总大小: ${totalSizeMB} MB`);

      // 显示配额信息
      const quota = getUploadQuota();
      console.log(`[Upload] 配额状态: ${formatQuotaInfo(quota)}`);

      // 上传前验证网关新鲜度
      const freshGateways = gateways.filter(g => {
        const lastChecked = g.lastChecked || 0;
        const isFresh = Date.now() - lastChecked < CONFIG.GATEWAY_TEST.GATEWAY_FRESHNESS_THRESHOLD;
        return g.available && isFresh;
      });

      if (freshGateways.length < 3 && gateways.filter(g => g.available).length > 0) {
        console.warn('[Upload] 网关数据过期，建议重新检测网关');
        showToast('网关数据可能已过期，建议重新检测', 'warning');
      }

      setIsUploading(true);
      const controller = new AbortController();
      setAbortController(controller);

      try {
        const token = await api.getToken();

        // 定义单个文件上传函数（支持重试）
        const uploadSingleFile = async (file: File, retryCount: number = 0): Promise<void> => {
          if (controller.signal.aborted) return;

          setCurrentFile(file);
          setUploadProgress(0);

          // 步骤 1: 上传前计算文件 Hash
          showToast(`正在计算文件 ${file.name} 的校验值...`, "info");
          const localHash = await calculateFileHash(file, (hashProgress) => {
            // Hash 计算占 15% 进度
            setUploadProgress(Math.round(hashProgress * 15));
          });

          // 步骤 2: 上传文件到 Crust
          setUploadProgress(15); // Hash 计算完成
          showToast(`正在上传 ${file.name}...`, "info");
          
          const result = await uploadApi.uploadToCrust(file, token, (progress) => {
            // 上传占 70% 进度 (15% - 85%)
            setUploadProgress(15 + Math.round(progress * 0.7));
          });

          // 步骤 3: 验证上传结果
          if (!result.cid || !result.hash) {
            throw new Error("上传响应缺少必要信息");
          }

          // 验证 CID 格式
          const cidPattern = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{52,})$/;
          if (!cidPattern.test(result.cid)) {
            console.error(`[Upload] 无效的 CID 格式: ${result.cid}`);
            throw new Error("服务器返回的文件标识符无效");
          }

          // 步骤 3.5: 双重验证 - 比对本地计算的 hash 和服务器返回的 hash
          if (result.hash !== localHash) {
            console.error(`[Upload] Hash 不匹配! 本地: ${localHash}, 服务器: ${result.hash}`);

            // 尝试重新上传（最多 2 次）
            if (retryCount < 2) {
              showToast(`文件校验失败，正在重试 (${retryCount + 1}/2)...`, "warning");
              // 延迟后重试
              await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
              return uploadSingleFile(file, retryCount + 1);
            }

            throw new Error("文件上传后校验失败，请检查网络连接或稍后重试");
          }

          console.log(`[Upload] Hash 验证通过: ${localHash}`);

          // 步骤 4: 使用安全的文件名
          const safeName = sanitizeFilename(file.name);

          // 步骤 5: 创建文件记录（包含本地计算的 hash）
          const fileRecord: FileRecord = {
            id: generateId(),
            name: safeName,
            size: result.size,
            cid: result.cid,
            date: new Date().toLocaleString(),
            folder_id: currentFolderId || "default",
            hash: localHash, // 使用本地计算的 hash
            verified: false,
            verify_status: "pending",
            uploadedAt: Date.now(),
          };

          await api.saveFile(fileRecord);
          setFiles((prev) => [fileRecord, ...prev]);

          // 步骤 6: 后台完整性验证
          setUploadProgress(85); // 上传完成，进入验证阶段 (85% - 95%)
          uploadApi.verifyFileWithHash(result.cid, localHash, file.size).then((verifyResult) => {
            const updatedFile: FileRecord = {
              ...fileRecord,
              verified: verifyResult.verified,
              verify_status: verifyResult.status,
              verify_message: verifyResult.message,
            };

            // 更新本地状态
            setFiles((prev) =>
              prev.map((f) => (f.id === fileRecord.id ? updatedFile : f))
            );

            // 保存验证结果到服务器
            api.saveFile(updatedFile).catch((err) => {
              console.error("保存验证结果失败:", err);
            });

            // 根据验证结果显示提示
            if (verifyResult.verified) {
              showToast(`文件 ${safeName} 完整性验证通过`, "success");
            } else if (verifyResult.status === "failed") {
              showToast(`文件 ${safeName} 完整性验证失败: ${verifyResult.message}`, "error");

              // 自动添加到修复队列
              const repairService = getAutoRepairService();
              repairService.addTask(updatedFile);
              console.log(`[Upload] 文件已添加到自动修复队列: ${safeName}`);
            }
          }).catch((err) => {
            console.error("文件验证过程出错:", err);

            // 验证出错时也添加到修复队列
            const repairService = getAutoRepairService();
            repairService.addTask(fileRecord);
          });

          setUploadProgress(95); // 验证完成
          showToast(`文件 ${safeName} 上传成功，正在后台传播...`, "success");
          
          // 步骤 7: 后台静默传播文件到其他网关
          if (gateways.length > 0) {
            // 选择优质网关进行传播，限制数量以避免浏览器并发限制
            const sortedGateways = gateways
              .filter(g => g.available && (g.healthScore || 0) > 40)
              .sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0))
              .slice(0, CONFIG.PROPAGATION.MAX_GATEWAYS);

            if (sortedGateways.length > 0) {
              propagationApi.backgroundPropagate(result.cid, sortedGateways, {
                maxGateways: sortedGateways.length,
                timeout: CONFIG.PROPAGATION.TIMEOUT,
                onComplete: (propResult) => {
                  if (propResult.success.length > 0) {
                    console.log(`[Upload] 文件已传播到 ${propResult.success.length}/${propResult.total} 个网关`);
                  }
                  if (propResult.failed.length > 0) {
                    console.warn(`[Upload] ${propResult.failed.length} 个网关传播失败`);
                  }
                },
              });
            }
          }

          setUploadProgress(100); // 全部完成
          
          // 更新上传配额
          updateUploadQuota(file.size);
          console.log(`[Upload] 已更新配额，本次上传: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
          
          onUploadSuccess?.(fileRecord);
        };

        // 处理所有文件
        for (const file of validFiles) {
          if (controller.signal.aborted) break;

          try {
            await uploadSingleFile(file);
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              showToast("上传已取消", "info");
              break;
            }
            handleError(error, { showToast });
            // 继续处理下一个文件
          }
        }
      } catch (error) {
        handleError(error, { showToast });
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setCurrentFile(null);
        setAbortController(null);
      }
    },
    [currentFolderId, setFiles, showToast, validateFile, onUploadSuccess, gateways]
  );

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload]
  );

  // 取消上传
  const cancelUpload = useCallback(() => {
    if (abortController) {
      abortController.abort();
      console.log('[Upload] 上传已取消，正在清理资源...');
    }
    // 立即重置上传状态
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentFile(null);
    showToast('上传已取消', 'info');
  }, [abortController, showToast]);

  return {
    // 状态
    isUploading,
    uploadProgress,
    currentFile,
    // 操作
    handleFileUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    cancelUpload,
  };
}
