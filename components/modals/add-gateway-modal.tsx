"use client";

import { useState, useEffect } from "react";
import { Globe, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/common";

interface AddGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  url: string;
  region: "CN" | "INTL";
  isAdding: boolean;
  onNameChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onRegionChange: (value: "CN" | "INTL") => void;
  onSubmit: () => Promise<{ success: boolean; message: string }>;
  onValidateUrl: (url: string) => { valid: boolean; normalizedUrl: string; error?: string };
}

type ValidationState = {
  status: 'idle' | 'validating' | 'valid' | 'invalid';
  message: string;
  normalizedUrl?: string;
};

export function AddGatewayModal({
  isOpen,
  onClose,
  name,
  url,
  region,
  isAdding,
  onNameChange,
  onUrlChange,
  onRegionChange,
  onSubmit,
  onValidateUrl,
}: AddGatewayModalProps) {
  const [validation, setValidation] = useState<ValidationState>({
    status: 'idle',
    message: '',
  });
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (!url.trim()) {
      setValidation({ status: 'idle', message: '' });
      return;
    }

    const timer = setTimeout(() => {
      const result = onValidateUrl(url);
      if (result.valid) {
        setValidation({
          status: 'valid',
          message: 'URL 格式有效',
          normalizedUrl: result.normalizedUrl,
        });
      } else {
        setValidation({
          status: 'invalid',
          message: result.error || 'URL 格式无效',
        });
      }
    }, 300);

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [url, onValidateUrl]);

  useEffect(() => {
    if (!isOpen) {
      setValidation({ status: 'idle', message: '' });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (validation.status !== 'valid') {
      const result = onValidateUrl(url);
      if (!result.valid) {
        setValidation({
          status: 'invalid',
          message: result.error || 'URL 格式无效',
        });
        return;
      }
    }
    
    setValidation({ status: 'validating', message: '正在测试网关连接...' });
    
    const result = await onSubmit();
    
    if (result.success) {
      setValidation({ status: 'valid', message: result.message });
    } else {
      setValidation({ status: 'invalid', message: result.message });
    }
  };

  const getValidationIcon = () => {
    switch (validation.status) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getValidationColor = () => {
    switch (validation.status) {
      case 'validating':
        return 'text-blue-500';
      case 'valid':
        return 'text-green-500';
      case 'invalid':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const title = (
    <h3 className="text-lg font-semibold flex items-center">
      <Globe className="h-5 w-5 mr-2" />
      添加自定义网关
    </h3>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            网关名称 <span className="text-red-500">*</span>
          </label>
          <Input 
            placeholder="例如：我的网关" 
            value={name} 
            onChange={(e) => onNameChange(e.target.value)}
            disabled={isAdding}
          />
          <p className="text-xs text-muted-foreground mt-1">
            给网关起一个易于识别的名称
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            网关URL <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              placeholder="https://gateway.example.com/ipfs/"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              className={`
                ${validation.status === 'valid' ? 'border-green-500 pr-10' : ''}
                ${validation.status === 'invalid' ? 'border-red-500 pr-10' : ''}
                ${validation.status === 'validating' ? 'pr-10' : ''}
              `}
              disabled={isAdding}
            />
            {validation.status !== 'idle' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getValidationIcon()}
              </div>
            )}
          </div>
          <div className="flex items-start gap-1 mt-1">
            {validation.message && (
              <div className="flex items-center gap-1">
                {validation.status === 'invalid' && (
                  <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                )}
                <span className={`text-xs ${getValidationColor()}`}>
                  {validation.message}
                </span>
              </div>
            )}
          </div>
          {validation.normalizedUrl && validation.status === 'valid' && (
            <p className="text-xs text-muted-foreground mt-1">
              标准化URL: {validation.normalizedUrl}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            支持格式: https://example.com/ipfs/ 或 https://example.com/
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">区域</label>
          <div className="flex space-x-2">
            <Button 
              variant={region === "CN" ? "default" : "outline"} 
              className="flex-1" 
              onClick={() => onRegionChange("CN")}
              disabled={isAdding}
            >
              🇨🇳 国内
            </Button>
            <Button
              variant={region === "INTL" ? "default" : "outline"}
              className="flex-1"
              onClick={() => onRegionChange("INTL")}
              disabled={isAdding}
            >
              🌍 国际
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            国内网关在检测时会优先测试
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">添加说明：</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>添加后会自动测试网关可用性</li>
            <li>支持自动补全 /ipfs/ 路径</li>
            <li>自定义网关会持久保存</li>
            <li>可在网关列表中删除自定义网关</li>
          </ul>
        </div>

        <div className="flex space-x-2 pt-2">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={onClose}
            disabled={isAdding}
          >
            取消
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-cloudchan-blue to-cloudchan-purple"
            onClick={handleSubmit}
            disabled={!name.trim() || !url.trim() || validation.status === 'invalid' || isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                添加中...
              </>
            ) : (
              '添加并检测'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
