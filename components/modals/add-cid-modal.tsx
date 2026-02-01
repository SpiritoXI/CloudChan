"use client";

import { useState, useCallback, useEffect } from "react";
import { RefreshCw, Link2, FileText, HardDrive, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { extractCidFromInput, validateCidFormat, formatBytes, inferFileType, getFileIcon } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CidInfo {
  name: string;
  size: number;
  isDirectory: boolean;
  valid: boolean;
  error?: string;
}

interface AddCidModalProps {
  isOpen: boolean;
  onClose: () => void;
  cid: string;
  name: string;
  size: string;
  isAdding: boolean;
  isDetecting: boolean;
  detectedInfo: CidInfo | null;
  onCidChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSizeChange: (value: string) => void;
  onSubmit: () => void;
  onDetectCid?: (cid: string) => Promise<void>;
}

export function AddCidModal({
  isOpen,
  onClose,
  cid,
  name,
  size,
  isAdding,
  isDetecting,
  detectedInfo,
  onCidChange,
  onNameChange,
  onSizeChange,
  onSubmit,
  onDetectCid,
}: AddCidModalProps) {
  const [inputValue, setInputValue] = useState(cid);
  const [validation, setValidation] = useState<{ valid: boolean; type: 'v0' | 'v1' | null; error?: string } | null>(null);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  // 同步外部cid变化
  useEffect(() => {
    setInputValue(cid);
  }, [cid]);

  // 当模态框关闭时重置状态
  useEffect(() => {
    if (!isOpen) {
      setHasAutoFilled(false);
      setValidation(null);
    }
  }, [isOpen]);

  // 处理输入变化
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    
    // 尝试提取CID
    const extractedCid = extractCidFromInput(value);
    
    if (extractedCid) {
      // 验证CID格式
      const result = validateCidFormat(extractedCid);
      setValidation(result);
      
      // 更新CID值
      onCidChange(extractedCid);
      
      // 如果验证通过且没有手动填写过文件名，自动触发检测
      if (result.valid && !hasAutoFilled && onDetectCid && !isDetecting) {
        onDetectCid(extractedCid);
      }
    } else {
      setValidation(null);
      onCidChange(value);
    }
  }, [onCidChange, hasAutoFilled, onDetectCid, isDetecting]);

  // 处理粘贴事件
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    const extractedCid = extractCidFromInput(pastedText);
    
    if (extractedCid && extractedCid !== pastedText.trim()) {
      // 如果粘贴的是URL或路径，提取出CID
      e.preventDefault();
      handleInputChange(pastedText);
    }
  }, [handleInputChange]);

  // 手动触发检测
  const handleManualDetect = useCallback(() => {
    const extractedCid = extractCidFromInput(inputValue);
    if (extractedCid && onDetectCid) {
      onDetectCid(extractedCid);
    }
  }, [inputValue, onDetectCid]);

  // 处理文件名变化
  const handleNameChange = useCallback((value: string) => {
    setHasAutoFilled(true);
    onNameChange(value);
  }, [onNameChange]);

  // 处理大小变化
  const handleSizeChange = useCallback((value: string) => {
    setHasAutoFilled(true);
    onSizeChange(value);
  }, [onSizeChange]);

  // 获取验证状态显示
  const getValidationStatus = () => {
    if (!inputValue.trim()) return null;
    if (isDetecting) return { icon: <RefreshCw className="h-4 w-4 animate-spin" />, text: '检测中...', color: 'text-blue-500' };
    if (detectedInfo?.valid) return { icon: <CheckCircle className="h-4 w-4" />, text: 'CID有效', color: 'text-green-500' };
    if (validation?.valid) return { icon: <CheckCircle className="h-4 w-4" />, text: `CID格式正确 (${validation.type === 'v0' ? 'v0' : 'v1'})`, color: 'text-green-500' };
    if (validation?.error) return { icon: <AlertCircle className="h-4 w-4" />, text: validation.error, color: 'text-red-500' };
    return { icon: <AlertCircle className="h-4 w-4" />, text: '无法识别CID格式', color: 'text-orange-500' };
  };

  const validationStatus = getValidationStatus();
  const extractedCid = extractCidFromInput(inputValue);
  const canSubmit = !!extractedCid && !isAdding && !isDetecting;

  // 计算显示的文件大小
  const displaySize = size ? parseInt(size) : (detectedInfo?.size || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<h3 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-500" /> 添加CID</h3>}>
      <div className="space-y-4">
        {/* CID 输入区域 */}
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            CID 或 IPFS 链接
          </label>
          <div className="relative">
            <Input
              placeholder="粘贴 CID、ipfs://链接 或 https://gateway/ipfs/CID"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onPaste={handlePaste}
              autoFocus
              className={cn(
                "pr-10",
                validation?.valid && "border-green-500 focus-visible:ring-green-500",
                validation?.error && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            {validationStatus && (
              <div className={cn("absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs", validationStatus.color)}>
                {validationStatus.icon}
              </div>
            )}
          </div>
          
          {/* 提取到的CID显示 */}
          {extractedCid && extractedCid !== inputValue && (
            <p className="text-xs text-muted-foreground mt-1">
              提取到 CID: <span className="font-mono text-blue-600">{extractedCid.slice(0, 20)}...{extractedCid.slice(-8)}</span>
            </p>
          )}
          
          {/* 验证状态文本 */}
          {validationStatus && (
            <p className={cn("text-xs mt-1", validationStatus.color)}>
              {validationStatus.text}
            </p>
          )}
        </div>

        {/* 检测到的信息预览 */}
        {(detectedInfo?.valid || detectedInfo?.name) && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
              <Sparkles className="h-4 w-4" />
              检测到文件信息
            </div>
            <div className="space-y-1 text-sm">
              {detectedInfo.name && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">文件名:</span>
                  <span className="font-medium flex items-center gap-1">
                    <span>{getFileIcon(detectedInfo.name)}</span>
                    {detectedInfo.name}
                  </span>
                </div>
              )}
              {detectedInfo.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">大小:</span>
                  <span className="font-medium">{formatBytes(detectedInfo.size)}</span>
                </div>
              )}
              {detectedInfo.isDirectory && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">类型:</span>
                  <span className="font-medium text-orange-600">📁 文件夹</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 文件名输入 */}
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <FileText className="h-4 w-4" />
            文件名
            {!detectedInfo?.name && <span className="text-muted-foreground font-normal text-xs">(可选，留空自动生成)</span>}
          </label>
          <Input
            placeholder={detectedInfo?.name || "输入文件名"}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className={cn(detectedInfo?.name && !name && "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20")}
          />
          {name && (
            <p className="text-xs text-muted-foreground mt-1">
              类型: {inferFileType(name)}
            </p>
          )}
        </div>

        {/* 文件大小输入 */}
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            文件大小
            {!detectedInfo?.size && <span className="text-muted-foreground font-normal text-xs">(可选)</span>}
          </label>
          <div className="relative">
            <Input 
              type="number" 
              placeholder={detectedInfo?.size ? detectedInfo.size.toString() : "输入文件大小(字节)"} 
              value={size} 
              onChange={(e) => handleSizeChange(e.target.value)}
              className={cn(
                "pr-20",
                detectedInfo?.size && !size && "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20"
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              bytes
            </span>
          </div>
          {displaySize > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              约 {formatBytes(displaySize)}
            </p>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isAdding || isDetecting}
          >
            取消
          </Button>
          
          {/* 手动检测按钮 */}
          {extractedCid && !detectedInfo?.valid && onDetectCid && (
            <Button
              variant="secondary"
              onClick={handleManualDetect}
              disabled={isDetecting}
              className="px-4"
            >
              {isDetecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
          
          <Button
            className="flex-1 bg-gradient-to-r from-cloudchan-blue to-cloudchan-purple"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            {isAdding ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                添加中...
              </>
            ) : (
              "添加文件"
            )}
          </Button>
        </div>

        {/* 提示信息 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            支持粘贴各种格式的链接：CID、ipfs://、/ipfs/路径、网关URL
          </p>
          {detectedInfo?.error && (
            <p className="text-orange-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {detectedInfo.error}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
