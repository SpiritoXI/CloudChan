"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  RefreshCw,
  Loader2,
  Globe,
  Check,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Gateway } from "@/types";

interface PdfViewerProps {
  cid: string;
  filename: string;
  gateways: Gateway[];
  onDownload?: () => void;
}

export function PdfViewer({ cid, filename, gateways, onDownload }: PdfViewerProps) {
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGatewayMenu, setShowGatewayMenu] = useState(false);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const gatewayMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gatewayMenuRef.current && !gatewayMenuRef.current.contains(event.target as Node)) {
        setShowGatewayMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const availableGateways = gateways
    .filter((g) => g.available)
    .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity));

  const effectiveGateways = availableGateways.length > 0 ? availableGateways : gateways;

  const getCurrentPdfUrl = useCallback(() => {
    if (effectiveGateways.length === 0) return null;
    const gateway = effectiveGateways[currentGatewayIndex];
    return `${gateway.url}${cid}`;
  }, [effectiveGateways, currentGatewayIndex, cid]);

  const switchToGateway = useCallback((index: number) => {
    if (index === currentGatewayIndex) {
      setShowGatewayMenu(false);
      return;
    }

    setCurrentGatewayIndex(index);
    setError(null);
    setIsLoading(true);
    setShowGatewayMenu(false);
  }, [currentGatewayIndex]);

  const switchToNextGateway = useCallback(() => {
    if (effectiveGateways.length <= 1) {
      setError("所有网关都无法加载此 PDF");
      return;
    }

    const nextIndex = (currentGatewayIndex + 1) % effectiveGateways.length;
    switchToGateway(nextIndex);
  }, [effectiveGateways, currentGatewayIndex, switchToGateway]);

  const getSignalIcon = (latency: number | undefined) => {
    if (!latency || latency === Infinity) return <Signal className="h-3 w-3 text-slate-400" />;
    if (latency < 500) return <SignalHigh className="h-3 w-3 text-green-400" />;
    if (latency < 1500) return <SignalMedium className="h-3 w-3 text-yellow-400" />;
    return <SignalLow className="h-3 w-3 text-red-400" />;
  };

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const currentUrl = getCurrentPdfUrl();
  const currentGateway = effectiveGateways[currentGatewayIndex];

  if (!currentUrl) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">暂无可用网关</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-slate-900 rounded-xl overflow-hidden h-full"
    >
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm font-medium truncate max-w-md">
              {filename}
            </span>
            {currentGateway && (
              <span className="text-slate-400 text-xs">
                ({currentGateway.name})
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              className="text-white hover:bg-white/20"
              title="缩小"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="text-white text-sm min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              className="text-white hover:bg-white/20"
              title="放大"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="h-full flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-white text-sm">加载 PDF...</p>
              {currentGateway && (
                <p className="text-slate-400 text-xs mt-1">
                  通过 {currentGateway.name} 加载
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
            <div className="text-center p-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-white mb-2">{error}</p>
              <div className="flex space-x-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => {
                  setError(null);
                  setIsLoading(true);
                }}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  重试
                </Button>
                <Button variant="default" size="sm" onClick={switchToNextGateway}>
                  切换网关
                </Button>
              </div>
            </div>
          </div>
        )}

        <iframe
          src={`${currentUrl}#toolbar=0&navpanes=0&scrollbar=1&zoom=${scale * 100}`}
          className="w-full h-full border-0"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError("PDF 加载失败");
          }}
          title={filename}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <div className="text-slate-300 text-xs">
            PDF 文档预览
          </div>
          {effectiveGateways.length > 0 && (
            <div className="flex items-center space-x-2" ref={gatewayMenuRef}>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGatewayMenu(!showGatewayMenu)}
                  className="text-white hover:bg-white/20 text-xs flex items-center space-x-1"
                >
                  <Globe className="h-3 w-3" />
                  <span>{currentGateway?.name || `网关 ${currentGatewayIndex + 1}`}</span>
                  {currentGateway?.latency && currentGateway.latency !== Infinity && (
                    <span className="text-slate-400">({currentGateway.latency}ms)</span>
                  )}
                </Button>

                <AnimatePresence>
                  {showGatewayMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full right-0 mb-2 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden"
                    >
                      <div className="p-2 border-b border-slate-700">
                        <p className="text-xs text-slate-400 font-medium">选择网关</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {effectiveGateways.map((gateway, index) => (
                          <button
                            key={gateway.url}
                            onClick={() => switchToGateway(index)}
                            className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-700 transition-colors ${
                              index === currentGatewayIndex ? 'bg-slate-700/50' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{gateway.icon || '🌐'}</span>
                              <div>
                                <p className="text-sm text-white">{gateway.name}</p>
                                <p className="text-xs text-slate-400 truncate max-w-[120px]">
                                  {gateway.url.replace('/ipfs/', '')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {getSignalIcon(gateway.latency)}
                              {index === currentGatewayIndex && (
                                <Check className="h-3 w-3 text-blue-400 ml-1" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      {effectiveGateways.length > 1 && (
                        <div className="p-2 border-t border-slate-700">
                          <button
                            onClick={switchToNextGateway}
                            className="w-full px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors flex items-center justify-center space-x-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>自动切换下一个</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
