"use client";

import { Wifi, WifiOff, RefreshCw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Gateway } from "@/types";

interface GatewaySelectorProps {
  gateways: Gateway[];
  selectedGateway: Gateway | null;
  isTesting: boolean;
  onSelect: (gateway: Gateway) => void;
  onRefresh: () => void;
}

export function GatewaySelector({
  gateways,
  selectedGateway,
  isTesting,
  onSelect,
  onRefresh,
}: GatewaySelectorProps) {
  const availableCount = gateways.filter((g) => g.available).length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
          <Globe className="h-5 w-5 mr-2" />
          网关选择
        </h3>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isTesting}>
          <RefreshCw className={`h-4 w-4 ${isTesting ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {gateways.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <WifiOff className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">暂无网关数据</p>
          </div>
        ) : (
          gateways.map((gateway) => (
            <button
              key={gateway.name}
              onClick={() => gateway.available && onSelect(gateway)}
              disabled={!gateway.available}
              className={`w-full p-3 rounded-xl border text-left transition-all ${
                selectedGateway?.name === gateway.name
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : gateway.available
                  ? "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700"
                  : "border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {gateway.available ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white">
                      {gateway.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {gateway.region}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {gateway.available ? (
                    <>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        {gateway.latency}ms
                      </p>
                      <p className="text-xs text-green-500">可用</p>
                    </>
                  ) : (
                    <p className="text-xs text-red-500">不可用</p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {gateways.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            共 {gateways.length} 个网关 · {availableCount} 个可用
          </p>
        </div>
      )}
    </div>
  );
}
