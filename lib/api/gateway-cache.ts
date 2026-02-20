import { CONFIG } from "../config";
import type { Gateway, GatewayHealthTrend } from "@/types";

const HEALTH_TREND_CACHE_KEY = 'cc_gateway_health_trend_v1';
const MAX_TREND_HISTORY = 30;

export function getCachedResults(): Gateway[] | null {
  try {
    const cached = localStorage.getItem(CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY);
    if (!cached) return null;

    const { version, timestamp, gateways } = JSON.parse(cached);
    if (version !== CONFIG.GATEWAY_TEST.CACHE_VERSION) return null;
    if (Date.now() - timestamp > CONFIG.GATEWAY_TEST.CHECK_CACHE_EXPIRY) return null;

    return gateways;
  } catch {
    return null;
  }
}

export function cacheResults(gateways: Gateway[]): void {
  try {
    const maxGatewaysToCache = 50;
    const gatewaysToCache = gateways.slice(0, maxGatewaysToCache);
    
    const cacheData = {
      version: CONFIG.GATEWAY_TEST.CACHE_VERSION,
      timestamp: Date.now(),
      gateways: gatewaysToCache,
    };
    
    const cacheString = JSON.stringify(cacheData);
    
    const sizeInBytes = new Blob([cacheString]).size;
    const maxSize = 4 * 1024 * 1024;
    
    if (sizeInBytes > maxSize) {
      console.warn(`网关缓存数据过大(${(sizeInBytes / 1024 / 1024).toFixed(2)}MB)，跳过缓存`);
      return;
    }
    
    localStorage.setItem(CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY, cacheString);
  } catch (error) {
    console.warn("缓存网关结果失败，清理旧缓存:", error);
    try {
      localStorage.removeItem(CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY);
      localStorage.removeItem(CONFIG.GATEWAY_HEALTH.HEALTH_CACHE_KEY);
    } catch {
      // ignore
    }
  }
}

export function loadHealthHistory(): Record<string, Partial<Gateway>> {
  try {
    const stored = localStorage.getItem(CONFIG.GATEWAY_HEALTH.HEALTH_CACHE_KEY);
    if (!stored) return {};

    const data = JSON.parse(stored);
    if (Date.now() - data.timestamp > CONFIG.GATEWAY_HEALTH.HEALTH_CACHE_EXPIRY) {
      return {};
    }

    return data.history || {};
  } catch {
    return {};
  }
}

export function saveHealthHistory(gateways: Gateway[]): void {
  try {
    const maxHistoryEntries = 30;
    const gatewaysToSave = gateways.slice(0, maxHistoryEntries);
    
    const history: Record<string, Partial<Gateway>> = {};
    gatewaysToSave.forEach((g) => {
      history[g.name] = {
        healthScore: g.healthScore,
        failureCount: g.failureCount,
        consecutiveFailures: g.consecutiveFailures,
        lastSuccess: g.lastSuccess,
        lastChecked: g.lastChecked,
      };
    });

    const historyString = JSON.stringify({
      timestamp: Date.now(),
      history,
    });
    
    const sizeInBytes = new Blob([historyString]).size;
    const maxSize = 2 * 1024 * 1024;
    
    if (sizeInBytes > maxSize) {
      console.warn(`健康度历史数据过大(${(sizeInBytes / 1024).toFixed(2)}KB)，跳过保存`);
      return;
    }

    localStorage.setItem(CONFIG.GATEWAY_HEALTH.HEALTH_CACHE_KEY, historyString);
  } catch (error) {
    console.warn("保存健康度历史失败:", error);
    try {
      localStorage.removeItem(CONFIG.GATEWAY_HEALTH.HEALTH_CACHE_KEY);
    } catch {
      // ignore
    }
  }
}

export function loadHealthTrends(): Record<string, GatewayHealthTrend> {
  try {
    const stored = localStorage.getItem(HEALTH_TREND_CACHE_KEY);
    if (!stored) return {};

    const data = JSON.parse(stored);
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      return {};
    }

    return data.trends || {};
  } catch {
    return {};
  }
}

export function saveHealthTrends(trends: Record<string, GatewayHealthTrend>): void {
  try {
    const trendString = JSON.stringify({
      timestamp: Date.now(),
      trends,
    });
    
    const sizeInBytes = new Blob([trendString]).size;
    if (sizeInBytes > 2 * 1024 * 1024) {
      console.warn(`健康趋势数据过大，跳过保存`);
      return;
    }

    localStorage.setItem(HEALTH_TREND_CACHE_KEY, trendString);
  } catch (error) {
    console.warn("保存健康趋势失败:", error);
  }
}

export function updateHealthTrend(
  gateway: Gateway,
  trends: Record<string, GatewayHealthTrend>
): Record<string, GatewayHealthTrend> {
  const existing = trends[gateway.name] || {
    name: gateway.name,
    history: [],
    avgHealthScore: 0,
    avgLatency: 0,
    uptime: 0,
  };

  const newEntry = {
    timestamp: Date.now(),
    healthScore: gateway.healthScore || 0,
    latency: gateway.latency || Infinity,
    available: gateway.available || false,
  };

  const history = [...existing.history, newEntry].slice(-MAX_TREND_HISTORY);

  const availableCount = history.filter(h => h.available).length;
  const validLatencies = history.filter(h => h.latency !== Infinity).map(h => h.latency);

  const updated: GatewayHealthTrend = {
    name: gateway.name,
    history,
    avgHealthScore: Math.round(history.reduce((sum, h) => sum + h.healthScore, 0) / history.length),
    avgLatency: validLatencies.length > 0 
      ? Math.round(validLatencies.reduce((sum, l) => sum + l, 0) / validLatencies.length)
      : Infinity,
    uptime: history.length > 0 ? (availableCount / history.length) * 100 : 0,
  };

  return { ...trends, [gateway.name]: updated };
}

export function clearGatewayCache(): void {
  try {
    localStorage.removeItem(CONFIG.GATEWAY_TEST.CHECK_CACHE_KEY);
    localStorage.removeItem(CONFIG.GATEWAY_HEALTH.HEALTH_CACHE_KEY);
    localStorage.removeItem(HEALTH_TREND_CACHE_KEY);
  } catch {
    // ignore
  }
}
