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
  Copy,
  Download,
  WrapText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isCodeFile, getFileLanguage } from "@/lib/utils";
import type { Gateway } from "@/types";

interface TextViewerProps {
  cid: string;
  filename: string;
  gateways: Gateway[];
  onDownload?: () => void;
}

export function TextViewer({ cid, filename, gateways, onDownload }: TextViewerProps) {
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [showGatewayMenu, setShowGatewayMenu] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [copied, setCopied] = useState(false);
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

  const getCurrentUrl = useCallback(() => {
    if (effectiveGateways.length === 0) return null;
    const gateway = effectiveGateways[currentGatewayIndex];
    return `${gateway.url}${cid}`;
  }, [effectiveGateways, currentGatewayIndex, cid]);

  const fetchContent = useCallback(async () => {
    const url = getCurrentUrl();
    if (!url) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      setContent(text);
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to fetch text content:", err);
      setError("加载文件内容失败");
      setIsLoading(false);
    }
  }, [getCurrentUrl]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const switchToGateway = useCallback((index: number) => {
    if (index === currentGatewayIndex) {
      setShowGatewayMenu(false);
      return;
    }

    setCurrentGatewayIndex(index);
    setShowGatewayMenu(false);
    fetchContent();
  }, [currentGatewayIndex, fetchContent]);

  const switchToNextGateway = useCallback(() => {
    if (effectiveGateways.length <= 1) {
      setError("所有网关都无法加载此文件");
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

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [content]);

  const currentGateway = effectiveGateways[currentGatewayIndex];
  const isCode = isCodeFile(filename);
  const language = getFileLanguage(filename);

  const lineCount = content.split("\n").length;

  if (!getCurrentUrl()) {
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
      className="relative bg-slate-900 rounded-xl overflow-hidden h-full flex flex-col"
    >
      <div className="flex-shrink-0 p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm font-medium truncate max-w-md">
              {filename}
            </span>
            <span className="text-slate-400 text-xs bg-slate-700 px-2 py-0.5 rounded">
              {language}
            </span>
            <span className="text-slate-500 text-xs">
              {lineCount} 行
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
              onClick={() => setWordWrap(!wordWrap)}
              className={`text-white hover:bg-white/20 ${wordWrap ? 'bg-white/10' : ''}`}
              title={wordWrap ? "取消自动换行" : "自动换行"}
            >
              <WrapText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyToClipboard}
              className="text-white hover:bg-white/20"
              title="复制内容"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {onDownload && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDownload}
                className="text-white hover:bg-white/20"
                title="下载"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-white text-sm">加载文件内容...</p>
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
                <Button variant="outline" size="sm" onClick={fetchContent}>
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

        {!isLoading && !error && (
          <div className="h-full overflow-auto">
            <div className="flex">
              <div className="flex-shrink-0 bg-slate-800/50 text-slate-500 text-right select-none border-r border-slate-700">
                <div className="p-4 font-mono text-xs leading-6">
                  {content.split("\n").map((_, index) => (
                    <div key={index} className="px-2">
                      {index + 1}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <pre
                  className={`p-4 font-mono text-sm leading-6 text-slate-300 ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}
                  style={{ tabSize: 2 }}
                >
                  {isCode ? (
                    <code className={`language-${language}`}>
                      {content}
                    </code>
                  ) : (
                    content
                  )}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="text-slate-300 text-xs">
            {isCode ? "代码文件预览" : "文本文件预览"} · {content.length} 字符
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
