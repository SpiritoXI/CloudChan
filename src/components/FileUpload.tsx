'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileIcon, X, CheckCircle, AlertCircle, Globe, Zap, Clock } from 'lucide-react';
import useStore from '@/store/useStore';
import { toast } from 'sonner';
import { getCrustFilesDirectClient, type DirectUploadProgress } from '@/lib/crustfiles-direct';
import { getTokenFromStorage } from './DialogTokenConfig';

interface FileUploadProps {
  file: File;
  onClose: () => void;
}

// 直连上传的文件大小限制（1GB，可根据 CrustFiles.io 限制调整）
const MAX_FILE_SIZE_DIRECT = 1 * 1024 * 1024 * 1024; // 1GB in bytes

export default function FileUpload({ file, onClose }: FileUploadProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'uploading' | 'completed' | 'error'>('uploading');
  const [error, setError] = useState<string | null>(null);
  const [cid, setCid] = useState<string>('');
  const [gateway, setGateway] = useState<string>('');
  const [uploadStartTime, setUploadStartTime] = useState<number>(0);

  const addFile = useStore((state) => state.addFile);
  const updateFile = useStore((state) => state.updateFile);
  const deleteFile = useStore((state) => state.deleteFile);
  const fileExists = useStore((state) => state.fileExists);
  const currentFolderId = useStore((state) => state.currentFolderId);

  useEffect(() => {
    uploadToCrust();
  }, [file, currentFolderId]);

  const uploadToCrust = async () => {
    // 检查文件是否已存在
    if (fileExists(file.name)) {
      toast.error(`文件 "${file.name}" 已存在，请先删除或重命名`);
      setStatus('error');
      setError('文件已存在');
      return;
    }

    // 检查 Access Token
    const token = getTokenFromStorage();
    if (!token) {
      toast.error('请先配置 CrustFiles.io Access Token');
      setStatus('error');
      setError('未配置 Access Token');
      return;
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 添加文件到列表（上传中状态）
    addFile({
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date().toISOString(),
      status: 'uploading',
      progress: 0,
      folderId: currentFolderId,
    });

    try {
      setUploadStartTime(Date.now());
      
      // 使用直连客户端上传文件
      const client = getCrustFilesDirectClient(token);

      const result = await client.upload(file, {
        onProgress: (progress: DirectUploadProgress) => {
          const percentage = Math.round(progress.percentage);
          setProgress(percentage);
          updateFile(fileId, { progress: percentage });
        },
      });

      if (result.success) {
        setProgress(100);
        setCid(result.cid!);
        setGateway(result.gateway || '');

        // 创建下载映射
        try {
          const mappingResponse = await fetch(`/api/download?fileId=${fileId}&cid=${result.cid}`);
          if (mappingResponse.ok) {
            const mappingData = await mappingResponse.json();
            console.log('[FileUpload] 下载映射已创建:', mappingData.gatewayId);
          }
        } catch (error) {
          console.warn('[FileUpload] 创建下载映射失败:', error);
          // 不影响上传成功的状态
        }

        // 上传完成
        setStatus('completed');
        updateFile(fileId, {
          status: 'completed',
          progress: 100,
          cid: result.cid,
          url: result.url,
        });

        toast.success(`${file.name} 已成功上传到 Crust Network`);
      } else {
        throw new Error(result.error || '上传失败');
      }
    } catch (err) {
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : '上传失败，请重试';
      setError(errorMessage);

      // 上传失败，从列表中删除该文件
      deleteFile(fileId);
      toast.error(`${file.name} 上传失败：${errorMessage}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getUploadTime = (): string => {
    if (uploadStartTime === 0) return '0s';
    const elapsed = Math.floor((Date.now() - uploadStartTime) / 1000);
    return `${elapsed}s`;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="crystal-dialog sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-500/70" />
              <span className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 bg-clip-text text-transparent">
                上传文件
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            {status === 'uploading' && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" />
                正在直连上传到 Crust Network...
                {gateway && <span className="text-xs text-purple-500/70 ml-2">{gateway.replace('https://', '')}</span>}
              </div>
            )}
            {status === 'completed' && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500/70" />
                文件上传成功！
                <span className="text-xs text-muted-foreground ml-2">{getUploadTime()}</span>
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400/70" />
                {error}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 文件信息 */}
          <div className="flex items-start space-x-4 p-4 crystal-card rounded-lg">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20">
                <FileIcon className="h-6 w-6 text-purple-500/80" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatFileSize(file.size)}
              </p>
            </div>
            {status === 'completed' && (
              <CheckCircle className="h-6 w-6 text-green-500/70 flex-shrink-0" />
            )}
            {status === 'error' && (
              <AlertCircle className="h-6 w-6 text-red-400/70 flex-shrink-0" />
            )}
          </div>

          {/* 网关信息 */}
          {gateway && (
            <div className="p-3 crystal-card rounded-lg bg-gradient-to-r from-purple-50/80 to-pink-50/80">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-purple-500/70" />
                <span className="font-medium">使用网关</span>
                <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full">
                  {gateway.replace('https://', '')}
                </span>
              </div>
            </div>
          )}

          {/* CID 信息 */}
          {cid && (
            <div className="p-4 crystal-card rounded-lg">
              <div className="flex items-center gap-2 text-sm mb-2">
                <Globe className="h-4 w-4 text-purple-500/70" />
                <span className="font-medium">文件 CID</span>
              </div>
              <code className="text-xs break-all bg-purple-50/60 px-3 py-2 rounded block">
                {cid}
              </code>
            </div>
          )}

          {/* 上传进度 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">上传进度</span>
              <span className="font-medium bg-gradient-to-r from-purple-500/80 to-pink-500/80 bg-clip-text text-transparent">
                {progress}%
              </span>
            </div>
            <div className="crystal-progress h-2">
              <div className="crystal-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            {status === 'completed' && (
              <Button onClick={onClose} className="crystal-button text-white">
                完成
              </Button>
            )}
            {status === 'error' && (
              <>
                <Button variant="outline" onClick={onClose} className="crystal-card">
                  关闭
                </Button>
                <Button onClick={uploadToCrust} className="crystal-button text-white">
                  重试
                </Button>
              </>
            )}
            {status === 'uploading' && (
              <Button variant="outline" onClick={onClose} className="crystal-card">
                取消
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
