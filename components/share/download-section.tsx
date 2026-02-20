"use client";

import { Download, Check, RefreshCw, Globe, ExternalLink, AlertCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Gateway } from "@/types";

interface DownloadSectionProps {
  selectedGateway: Gateway | null;
  isDownloading: boolean;
  isSmartSelecting: boolean;
  downloadProgress: number;
  gatewayTestStatus: Map<string, "pending" | "testing" | "success" | "failed">;
  gateways: Gateway[];
  onDownload: () => void;
  onSmartDownload: () => void;
  onOpenInIpfs: () => void;
  onRefreshGateways: () => void;
}

export function DownloadSection({
  selectedGateway,
  isDownloading,
  isSmartSelecting,
  downloadProgress,
  gatewayTestStatus,
  gateways,
  onDownload,
  onSmartDownload,
  onOpenInIpfs,
  onRefreshGateways,
}: DownloadSectionProps) {
  if (!selectedGateway) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
          <Download className="h-5 w-5 mr-2" />
          下载文件
        </h3>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            暂无可用网关，请刷新重试
          </p>
          <Button onClick={onRefreshGateways}>
            <RefreshCw className="h-4 w-4 mr-2" />
            重新检测
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
        <Download className="h-5 w-5 mr-2" />
        下载文件
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {selectedGateway.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedGateway.latency}ms · {selectedGateway.region}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-full">
            推荐
          </span>
        </div>

        {isDownloading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">下载进度</span>
              <span className="text-slate-900 dark:text-white">{downloadProgress}%</span>
            </div>
            <Progress value={downloadProgress} className="h-2" />
          </div>
        )}

        {isSmartSelecting && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              正在测试所有网关响应速度...
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {gateways
                .filter((g) => g.available)
                .map((gateway) => {
                  const status = gatewayTestStatus.get(gateway.name);
                  return (
                    <div key={gateway.name} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">{gateway.name}</span>
                      <span>
                        {status === "testing" && (
                          <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                        )}
                        {status === "success" && <Check className="h-3 w-3 text-green-500" />}
                        {status === "failed" && <WifiOff className="h-3 w-3 text-red-500" />}
                        {!status && <span className="text-gray-400">等待中</span>}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={onDownload}
            disabled={isDownloading || isSmartSelecting}
            className="flex-1"
            size="lg"
          >
            {isDownloading ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                下载中...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                立即下载
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={onSmartDownload}
            disabled={isDownloading || isSmartSelecting}
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 border-0"
          >
            {isSmartSelecting ? (
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Globe className="h-5 w-5 mr-2" />
            )}
            智能下载
          </Button>

          <Button variant="outline" onClick={onOpenInIpfs} size="lg">
            <ExternalLink className="h-5 w-5 mr-2" />
            IPFS打开
          </Button>
        </div>
      </div>
    </div>
  );
}
