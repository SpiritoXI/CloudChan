"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Globe, Zap, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modal";
import type { FileRecord, Gateway } from "@/types";
import { formatFileSize } from "@/lib/utils";
import { gatewayApi } from "@/lib/api";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileRecord | null;
  gateways: Gateway[];
  customGateways: Gateway[];
  onDownload: (cid: string, filename: string) => void;
  onDownloadWithGateway: (cid: string, filename: string, gateway: Gateway) => void;
  onTestGateways: () => void;
}

interface GatewayStatus {
  gateway: Gateway;
  status: 'pending' | 'testing' | 'success' | 'failed';
}

export function DownloadModal({
  isOpen,
  onClose,
  file,
  gateways,
  customGateways,
  onDownload,
  onDownloadWithGateway,
  onTestGateways,
}: DownloadModalProps) {
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [gatewayStatuses, setGatewayStatuses] = useState<GatewayStatus[]>([]);
  const [bestGateway, setBestGateway] = useState<Gateway | null>(null);
  const [isMultiTesting, setIsMultiTesting] = useState(false);

  // 自动检测网关
  const autoDetectGateways = useCallback(async () => {
    if (!file) return;

    setIsAutoDetecting(true);
    try {
      const results = await gatewayApi.autoTestGateways(customGateways);
      const available = results.filter(g => g.available);
      if (available.length > 0) {
        const best = available.sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity))[0];
        setBestGateway(best);
      }
    } finally {
      setIsAutoDetecting(false);
    }
  }, [file, customGateways]);

  // 多网关竞速测试
  const startMultiGatewayTest = useCallback(async () => {
    if (!file || gateways.length === 0) return;

    setIsMultiTesting(true);
    setGatewayStatuses(gateways.filter(g => g.available).map(g => ({ gateway: g, status: 'pending' })));

    const result = await gatewayApi.multiGatewayDownload(
      file.cid,
      gateways,
      (gateway, status) => {
        setGatewayStatuses(prev =>
          prev.map(gs =>
            gs.gateway.name === gateway.name ? { ...gs, status } : gs
          )
        );
      }
    );

    if (result) {
      setBestGateway(result.gateway);
      // 自动开始下载
      setTimeout(() => {
        onDownloadWithGateway(file.cid, file.name, result.gateway);
        onClose();
      }, 500);
    }

    setIsMultiTesting(false);
  }, [file, gateways, onDownloadWithGateway, onClose]);

  // 当模态框打开时，自动检测网关
  useEffect(() => {
    if (isOpen && file) {
      if (gateways.length === 0) {
        // 如果没有网关数据，自动检测
        autoDetectGateways();
      } else {
        // 使用已有的网关数据，找出最优的
        const available = gateways.filter(g => g.available);
        if (available.length > 0) {
          const best = available.sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity))[0];
          setBestGateway(best);
        }
      }
    }
  }, [isOpen, file, gateways, autoDetectGateways]);

  if (!file) return null;

  const title = (
    <h3 className="text-lg font-semibold flex items-center">
      <Download className="h-5 w-5 mr-2" />
      选择下载网关
    </h3>
  );

  const availableGateways = gateways.filter((g) => g.available);
  const hasGateways = gateways.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        </div>

        {/* 自动检测状态 */}
        {(isAutoDetecting || isMultiTesting) && (
          <div className="p-3 bg-blue-50 rounded-lg flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">
              {isMultiTesting ? "正在测试所有网关响应速度..." : "正在自动检测可用网关..."}
            </span>
          </div>
        )}

        {/* 最优网关显示 */}
        {bestGateway && !isMultiTesting && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  推荐网关: {bestGateway.name}
                </span>
              </div>
              <span className="text-xs text-green-600">{bestGateway.latency}ms</span>
            </div>
          </motion.div>
        )}

        {/* 多网关测试状态 */}
        {isMultiTesting && gatewayStatuses.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground">网关测试进度:</p>
            {gatewayStatuses.map((gs) => (
              <div key={gs.gateway.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{gs.gateway.icon}</span>
                  <span className="text-xs">{gs.gateway.name}</span>
                </div>
                <div>
                  {gs.status === 'pending' && <span className="text-xs text-gray-400">等待中</span>}
                  {gs.status === 'testing' && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                  {gs.status === 'success' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  {gs.status === 'failed' && <XCircle className="h-3 w-3 text-red-500" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 可用网关列表 */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">可用网关:</p>
            {hasGateways && (
              <span className="text-xs text-muted-foreground">
                {availableGateways.length}/{gateways.length} 可用
              </span>
            )}
          </div>

          {!hasGateways ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">正在自动检测网关...</p>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            </div>
          ) : availableGateways.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">暂无可用网关</p>
              <Button size="sm" onClick={onTestGateways}>
                <RefreshCw className="h-4 w-4 mr-1" />
                重新检测
              </Button>
            </div>
          ) : (
            availableGateways
              .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity))
              .map((gateway, index) => (
                <motion.div
                  key={gateway.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Button
                    variant="ghost"
                    className={`w-full justify-between ${
                      bestGateway?.name === gateway.name ? 'bg-green-50 border-green-200' : ''
                    }`}
                    onClick={() => {
                      onDownloadWithGateway(file.cid, file.name, gateway);
                      onClose();
                    }}
                  >
                    <div className="flex items-center">
                      <span className="text-xl mr-2">{gateway.icon}</span>
                      <div className="text-left">
                        <p className="font-medium text-sm">{gateway.name}</p>
                        <p className="text-xs text-muted-foreground">{gateway.region}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-green-600 font-medium mr-2">{gateway.latency}ms</span>
                      <Download className="h-4 w-4" />
                    </div>
                  </Button>
                </motion.div>
              ))
          )}
        </div>

        {/* 操作按钮 */}
        <div className="space-y-2 pt-2 border-t">
          <Button
            variant="default"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            onClick={startMultiGatewayTest}
            disabled={isMultiTesting || availableGateways.length === 0}
          >
            {isMultiTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                智能选择中...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-1" />
                智能选择最快网关
              </>
            )}
          </Button>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onDownload(file.cid, file.name);
                onClose();
              }}
              disabled={isMultiTesting}
            >
              <Globe className="h-4 w-4 mr-1" />
              使用默认网关
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onTestGateways}
              disabled={isMultiTesting}
              title="重新检测所有网关"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
