"use client";

import { motion } from "framer-motion";
import { Globe, RefreshCw, Plus, ExternalLink, Trash2, Zap, Download, Play, Pause, Search, Filter, ArrowUpDown, Activity, Clock, Shield, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/common";
import type { Gateway, GatewayTestProgress, GatewayFilter, GatewaySortField, GatewayHealthTrend } from "@/types";
import { useState, useMemo } from "react";

interface GatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  gateways: Gateway[];
  customGateways: Gateway[];
  isTesting: boolean;
  isFetchingPublic: boolean;
  testProgress: GatewayTestProgress | null;
  healthTrends: Record<string, GatewayHealthTrend>;
  onRefresh: () => void;
  onAdd: () => void;
  onTest: (gateway: Gateway) => void;
  onRemove: (gateway: Gateway) => void;
  onUpdate: (gateways: Gateway[]) => void;
  onFetchPublic: () => void;
  onStartTest?: () => void;
  onPauseTest?: () => void;
}

function getHealthScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getHealthScoreBg(score: number): string {
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
  if (score >= 40) return "bg-orange-100 dark:bg-orange-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

function getLatencyColor(latency: number): string {
  if (latency < 500) return "text-green-600";
  if (latency < 1000) return "text-yellow-600";
  if (latency < 2000) return "text-orange-600";
  return "text-red-600";
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds}秒`;
}

function GatewayItem({ 
  gateway, 
  isCustom, 
  onTest, 
  onRemove,
  healthTrend 
}: { 
  gateway: Gateway; 
  isCustom: boolean;
  onTest: (gateway: Gateway) => void;
  onRemove: (gateway: Gateway) => void;
  healthTrend?: GatewayHealthTrend;
}) {
  const healthScore = gateway.healthScore || 0;
  const trend = healthTrend;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-md ${
        gateway.available
          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
          : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
      }`}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <span className="text-xl flex-shrink-0">{gateway.icon || "🌐"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{gateway.name}</p>
            {gateway.region === "CN" && (
              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded dark:bg-red-900/50 dark:text-red-400">
                国内
              </span>
            )}
            {isCustom && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded dark:bg-purple-900/50 dark:text-purple-400">
                自定义
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
            {gateway.url}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        {gateway.available ? (
          <>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span className={`text-xs font-medium ${getHealthScoreColor(healthScore)}`}>
                  {healthScore}分
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className={`text-xs font-medium ${getLatencyColor(gateway.latency || Infinity)}`}>
                  {gateway.latency}ms
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                {gateway.corsEnabled ? (
                  <span className="text-xs text-green-500 flex items-center gap-0.5">
                    <Shield className="h-3 w-3" /> CORS
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">无CORS</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {gateway.rangeSupport ? (
                  <span className="text-xs text-blue-500 flex items-center gap-0.5">
                    <Server className="h-3 w-3" /> Range
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">无Range</span>
                )}
              </div>
            </div>

            {trend && (
              <div className="flex flex-col items-end text-xs text-muted-foreground">
                <span>可用率 {trend.uptime}%</span>
                <span>均延迟 {trend.avgLatency === Infinity ? '∞' : `${trend.avgLatency}ms`}</span>
              </div>
            )}

            <div className={`px-2 py-1 rounded text-xs font-medium ${getHealthScoreBg(healthScore)}`}>
              {gateway.reliability}% 可靠
            </div>
          </>
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-xs text-red-500 font-medium">不可用</span>
            {gateway.lastChecked && (
              <span className="text-xs text-muted-foreground">
                {formatTime(Date.now() - gateway.lastChecked)}前检测
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onTest(gateway)}
            title="测试此网关"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <a
            href={gateway.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground p-1"
            title="访问网关"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          {isCustom && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onRemove(gateway)}
              title="删除自定义网关"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function GatewayModal({
  isOpen,
  onClose,
  gateways,
  customGateways,
  isTesting,
  isFetchingPublic,
  testProgress,
  healthTrends,
  onRefresh,
  onAdd,
  onTest,
  onRemove,
  onUpdate,
  onFetchPublic,
  onStartTest,
  onPauseTest,
}: GatewayModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRegion, setFilterRegion] = useState<"all" | "CN" | "INTL">("all");
  const [filterAvailable, setFilterAvailable] = useState<"all" | "available" | "unavailable">("all");
  const [sortField, setSortField] = useState<GatewaySortField>("healthScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);

  const customGatewayNames = useMemo(() => 
    new Set(customGateways.map(g => g.name)), 
    [customGateways]
  );

  const filteredGateways = useMemo(() => {
    let result = [...gateways];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(g => 
        g.name.toLowerCase().includes(query) || 
        g.url.toLowerCase().includes(query)
      );
    }

    if (filterRegion !== "all") {
      result = result.filter(g => g.region === filterRegion);
    }

    if (filterAvailable !== "all") {
      result = result.filter(g => 
        filterAvailable === "available" ? g.available : !g.available
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "latency":
          comparison = (a.latency || Infinity) - (b.latency || Infinity);
          break;
        case "healthScore":
          comparison = (b.healthScore || 0) - (a.healthScore || 0);
          break;
        case "reliability":
          comparison = (b.reliability || 0) - (a.reliability || 0);
          break;
        case "lastChecked":
          comparison = (b.lastChecked || 0) - (a.lastChecked || 0);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [gateways, searchQuery, filterRegion, filterAvailable, sortField, sortOrder]);

  const availableCount = gateways.filter(g => g.available).length;
  const highQualityCount = gateways.filter(g => g.available && (g.healthScore || 0) >= 70).length;

  const title = (
    <div>
      <h3 className="text-lg font-semibold flex items-center">
        <Globe className="h-5 w-5 mr-2" />
        网关可用性检测
      </h3>
      <p className="text-sm text-muted-foreground">
        可用: <span className="text-green-500 font-medium">{availableCount}</span> / 
        总数: <span className="font-medium">{gateways.length}</span>
        {highQualityCount > 0 && (
          <span className="ml-2">
            (<span className="text-blue-500 font-medium">{highQualityCount}</span> 个高质量)
          </span>
        )}
        {customGateways.length > 0 && (
          <span className="ml-2 text-purple-500">
            (含 {customGateways.length} 个自定义)
          </span>
        )}
      </p>
    </div>
  );

  const progressPercent = testProgress 
    ? Math.round((testProgress.completed / testProgress.total) * 100) 
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {isTesting ? (
              onPauseTest ? (
                <Button variant="default" size="sm" onClick={onPauseTest} className="bg-orange-500 hover:bg-orange-600">
                  <Pause className="h-4 w-4 mr-1" />
                  暂停检测
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={onRefresh} disabled>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  检测中...
                </Button>
              )
            ) : (
              onStartTest ? (
                <Button variant="default" size="sm" onClick={onStartTest} className="bg-cloudchan-purple hover:bg-cloudchan-purple/90">
                  <Play className="h-4 w-4 mr-1" />
                  开始检测
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={onRefresh} className="bg-cloudchan-purple hover:bg-cloudchan-purple/90">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  开始检测
                </Button>
              )
            )}
            <Button variant="outline" size="sm" onClick={onFetchPublic} disabled={isFetchingPublic || isTesting}>
              <Download className={`h-4 w-4 mr-1 ${isFetchingPublic ? "animate-spin" : ""}`} />
              获取公共网关
            </Button>
            <Button variant="outline" size="sm" onClick={onAdd} disabled={isTesting}>
              <Plus className="h-4 w-4 mr-1" />
              添加网关
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isTesting}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isTesting ? "animate-spin" : ""}`} />
              重新检测
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-muted" : ""}
          >
            <Filter className="h-4 w-4 mr-1" />
            筛选
          </Button>
        </div>

        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索网关名称或URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">区域:</span>
              <div className="flex gap-1">
                <Button 
                  variant={filterRegion === "all" ? "default" : "outline"} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setFilterRegion("all")}
                >
                  全部
                </Button>
                <Button 
                  variant={filterRegion === "CN" ? "default" : "outline"} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setFilterRegion("CN")}
                >
                  🇨🇳 国内
                </Button>
                <Button 
                  variant={filterRegion === "INTL" ? "default" : "outline"} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setFilterRegion("INTL")}
                >
                  🌍 国际
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">状态:</span>
              <div className="flex gap-1">
                <Button 
                  variant={filterAvailable === "all" ? "default" : "outline"} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setFilterAvailable("all")}
                >
                  全部
                </Button>
                <Button 
                  variant={filterAvailable === "available" ? "default" : "outline"} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setFilterAvailable("available")}
                >
                  可用
                </Button>
                <Button 
                  variant={filterAvailable === "unavailable" ? "default" : "outline"} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setFilterAvailable("unavailable")}
                >
                  不可用
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">排序:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as GatewaySortField)}
                className="h-7 text-xs border rounded px-2 bg-background"
              >
                <option value="healthScore">健康度</option>
                <option value="latency">延迟</option>
                <option value="reliability">可靠性</option>
                <option value="name">名称</option>
                <option value="lastChecked">检测时间</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        )}

        {isTesting && testProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                正在检测网关... ({testProgress.completed}/{testProgress.total})
              </span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cloudchan-blue to-cloudchan-purple"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {testProgress.currentGateway && (
              <p className="text-xs text-muted-foreground">
                当前: {testProgress.currentGateway}
              </p>
            )}
          </div>
        )}

        {isTesting && !testProgress ? (
          <div className="flex flex-col items-center justify-center h-32">
            <RefreshCw className="h-8 w-8 animate-spin text-cloudchan-purple" />
            <span className="mt-2 text-muted-foreground">正在检测网关...</span>
            <span className="text-xs text-muted-foreground mt-1">点击"暂停检测"可停止当前检测</span>
          </div>
        ) : filteredGateways.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {searchQuery || filterRegion !== "all" || filterAvailable !== "all"
                ? "没有符合筛选条件的网关"
                : "暂无网关数据"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">点击"开始检测"按钮开始检测网关可用性</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filteredGateways.map((gateway) => (
              <GatewayItem
                key={gateway.url}
                gateway={gateway}
                isCustom={customGatewayNames.has(gateway.name)}
                onTest={onTest}
                onRemove={onRemove}
                healthTrend={healthTrends[gateway.name]}
              />
            ))}
          </div>
        )}

        {filteredGateways.length > 0 && filteredGateways.length !== gateways.length && (
          <p className="text-xs text-muted-foreground text-center">
            显示 {filteredGateways.length} / {gateways.length} 个网关
          </p>
        )}
      </div>
    </Modal>
  );
}
