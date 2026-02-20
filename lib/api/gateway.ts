import { CONFIG } from "../config";
import type { Gateway, GatewayTestProgress, GatewayFilter, GatewaySortField, GatewaySortOrder } from "@/types";
import { validateGatewayUrl, checkGatewayConnectivity, testGatewayMediaSupport } from "./gateway-validator";
import { 
  getCachedResults, 
  cacheResults, 
  loadHealthHistory, 
  saveHealthHistory,
  loadHealthTrends,
  saveHealthTrends,
  updateHealthTrend,
  clearGatewayCache
} from "./gateway-cache";
import {
  calculateHealthScore,
  createTestProgress,
  updateTestProgress,
  sortGateways,
  filterGateways
} from "./gateway-health";

export const gatewayApi = {
  validateGatewayUrl,
  checkGatewayConnectivity,
  testGatewayMediaSupport,

  async fetchPublicGateways(): Promise<Gateway[]> {
    const gateways: Gateway[] = [];
    const seenUrls = new Set<string>();

    for (const source of CONFIG.PUBLIC_GATEWAY_SOURCES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(source, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const urls: string[] = await response.json();

          urls.forEach((url, index) => {
            let gatewayUrl = url;
            if (!gatewayUrl.endsWith("/")) {
              gatewayUrl += "/";
            }
            if (!gatewayUrl.includes("/ipfs/")) {
              gatewayUrl += "ipfs/";
            }

            if (!seenUrls.has(gatewayUrl)) {
              seenUrls.add(gatewayUrl);

              const hostname = new URL(url).hostname;
              const isCN = hostname.includes("cn") ||
                hostname.includes("china") ||
                hostname.includes("aliyun") ||
                hostname.includes("tencent") ||
                hostname.includes("huawei");

              gateways.push({
                name: hostname,
                url: gatewayUrl,
                icon: "🌐",
                priority: index,
                region: isCN ? "CN" : "INTL",
                available: false,
                latency: Infinity,
              });
            }
          });

          break;
        }
      } catch (error) {
        console.warn(`获取公共网关列表失败 (${source}):`, error);
        continue;
      }
    }

    return gateways;
  },

  async testGateway(
    gateway: Gateway,
    options: {
      retries?: number;
      samples?: number;
      testCid?: string;
      signal?: AbortSignal;
    } = {}
  ): Promise<{
    available: boolean;
    latency: number;
    reliability: number;
    healthScore: number;
    rangeSupport?: boolean;
    corsEnabled?: boolean;
  }> {
    const { retries = 2, samples = 3, testCid = CONFIG.TEST_CID, signal } = options;

    if (signal?.aborted) {
      return { available: false, latency: Infinity, reliability: 0, healthScore: 0 };
    }

    const results: { success: boolean; latency: number; rangeSupport?: boolean; corsEnabled?: boolean }[] = [];

    for (let sample = 0; sample < samples; sample++) {
      if (signal?.aborted) {
        return { available: false, latency: Infinity, reliability: 0, healthScore: 0 };
      }

      let sampleSuccess = false;
      let sampleLatency = Infinity;
      let rangeSupport = false;
      let corsEnabled = false;

      for (let attempt = 0; attempt < retries; attempt++) {
        if (signal?.aborted) {
          return { available: false, latency: Infinity, reliability: 0, healthScore: 0 };
        }

        const testUrl = `${gateway.url}${testCid}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const startTime = performance.now();
          const response = await fetch(testUrl, {
            method: "HEAD",
            signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            sampleSuccess = true;
            sampleLatency = Math.round(performance.now() - startTime);

            if (response.status === 206 || response.headers.has("content-range")) {
              rangeSupport = true;
            }
            if (response.headers.has("access-control-allow-origin")) {
              corsEnabled = true;
            }

            break;
          }
        } catch {
          // 单次测试失败，继续尝试下一个样本
        }
      }

      if (sampleSuccess) {
        results.push({ success: true, latency: sampleLatency, rangeSupport, corsEnabled });
      }
    }

    if (results.length === 0) {
      return { available: false, latency: Infinity, reliability: 0, healthScore: 0 };
    }

    const successCount = results.filter(r => r.success).length;
    const reliability = (successCount / samples) * 100;
    const avgLatency = Math.round(
      results.reduce((sum, r) => sum + r.latency, 0) / results.length
    );
    const healthScore = calculateHealthScore(gateway, {
      available: true,
      latency: avgLatency,
      reliability,
    });

    const hasRangeSupport = results.some(r => r.rangeSupport);
    const hasCorsEnabled = results.some(r => r.corsEnabled);

    return {
      available: true,
      latency: avgLatency,
      reliability,
      healthScore,
      rangeSupport: hasRangeSupport,
      corsEnabled: hasCorsEnabled,
    };
  },

  async testAllGateways(
    gateways: Gateway[],
    options: {
      onProgress?: (gateway: Gateway, result: Gateway) => void;
      priorityRegions?: string[];
      signal?: AbortSignal;
    } = {}
  ): Promise<Gateway[]> {
    const { onProgress, priorityRegions, signal } = options;
    const results: Gateway[] = [];

    if (priorityRegions && priorityRegions.length > 0) {
      gateways.sort((a, b) => {
        const aPriority = priorityRegions.includes(a.region) ? 0 : 1;
        const bPriority = priorityRegions.includes(b.region) ? 0 : 1;
        return aPriority - bPriority;
      });
    }

    const batchSize = 5;
    for (let i = 0; i < gateways.length; i += batchSize) {
      if (signal?.aborted) {
        break;
      }

      const batch = gateways.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (gateway) => {
          if (signal?.aborted) {
            return { ...gateway, available: false };
          }

          const testResult = await this.testGateway(gateway, { signal });

          const result: Gateway = {
            ...gateway,
            available: testResult.available,
            latency: testResult.latency,
            reliability: testResult.reliability,
            healthScore: testResult.healthScore,
            rangeSupport: testResult.rangeSupport,
            corsEnabled: testResult.corsEnabled,
            lastChecked: Date.now(),
            failureCount: testResult.available ? 0 : (gateway.failureCount || 0) + 1,
            consecutiveFailures: testResult.available ? 0 : (gateway.consecutiveFailures || 0) + 1,
            lastSuccess: testResult.available ? Date.now() : gateway.lastSuccess,
          };

          onProgress?.(gateway, result);
          return result;
        })
      );

      results.push(...batchResults);
    }

    return results;
  },

  async testAllGatewaysWithProgress(
    gateways: Gateway[],
    options: {
      signal?: AbortSignal;
      onOverallProgress?: (progress: GatewayTestProgress) => void;
    } = {}
  ): Promise<Gateway[]> {
    const { signal, onOverallProgress } = options;
    const results: Gateway[] = [];
    let progress = createTestProgress(gateways.length);

    for (const gateway of gateways) {
      if (signal?.aborted) {
        break;
      }

      progress = { ...progress, currentGateway: gateway.name, status: 'testing' };
      onOverallProgress?.(progress);

      const testResult = await this.testGateway(gateway, { signal });

      const result: Gateway = {
        ...gateway,
        available: testResult.available,
        latency: testResult.latency,
        reliability: testResult.reliability,
        healthScore: testResult.healthScore,
        rangeSupport: testResult.rangeSupport,
        corsEnabled: testResult.corsEnabled,
        lastChecked: Date.now(),
        failureCount: testResult.available ? 0 : (gateway.failureCount || 0) + 1,
        consecutiveFailures: testResult.available ? 0 : (gateway.consecutiveFailures || 0) + 1,
        lastSuccess: testResult.available ? Date.now() : gateway.lastSuccess,
      };

      progress = updateTestProgress(progress, gateway.name, {
        status: result.available ? 'success' : (result.latency === Infinity ? 'timeout' : 'failed'),
        latency: result.latency ?? Infinity,
        reliability: result.reliability || 0,
        healthScore: result.healthScore || 0,
      });

      onOverallProgress?.(progress);
      results.push(result);
    }

    return results;
  },

  calculateHealthScore,
  createTestProgress,
  updateTestProgress,
  sortGateways,
  filterGateways,

  getCachedResults,
  cacheResults,
  loadHealthHistory,
  saveHealthHistory,
  loadHealthTrends,
  saveHealthTrends,
  updateHealthTrend,
  clearGatewayCache,

  async autoTestGateways(
    customGateways: Gateway[] = [],
    forceRefresh: boolean = false,
    options: {
      onProgress?: (gateway: Gateway, result: Gateway) => void;
      priorityRegions?: string[];
      signal?: AbortSignal;
    } = {}
  ): Promise<Gateway[]> {
    const { onProgress, priorityRegions, signal } = options;

    if (signal?.aborted) {
      return [];
    }

    const healthHistory = loadHealthHistory();

    if (!forceRefresh) {
      const cached = getCachedResults();
      if (cached && cached.length > 0) {
        const cachedUrls = new Set(cached.map((g) => g.url));
        const defaultUrls = CONFIG.DEFAULT_GATEWAYS.map((g) => g.url);
        const hasAllDefaults = defaultUrls.every((url) => cachedUrls.has(url));

        const cacheAge = Date.now() - (cached[0]?.lastChecked || 0);
        const cacheExpired = cacheAge > 5 * 60 * 1000;

        const availableCount = cached.filter((g) => g.available).length;
        if (availableCount > 0 && hasAllDefaults && !cacheExpired) {
          const merged = cached.map((g) => ({
            ...g,
            ...healthHistory[g.name],
          }));
          return merged;
        }
      }
    }

    const allGateways = [...CONFIG.DEFAULT_GATEWAYS];

    if (!signal?.aborted) {
      try {
        const publicGateways = await this.fetchPublicGateways();
        publicGateways.forEach((publicGateway) => {
          if (!allGateways.find((g) => g.url === publicGateway.url)) {
            allGateways.push(publicGateway);
          }
        });
      } catch {
        console.warn("获取公共网关列表失败，使用默认网关");
      }
    }

    if (signal?.aborted) {
      return [];
    }

    customGateways.forEach((custom) => {
      if (!allGateways.find((g) => g.url === custom.url)) {
        allGateways.push(custom);
      }
    });

    const gatewaysWithHistory = allGateways.map((g) => ({
      ...g,
      ...healthHistory[g.name],
    }));

    const results = await this.testAllGateways(gatewaysWithHistory, {
      onProgress,
      priorityRegions,
      signal,
    });

    if (signal?.aborted) {
      return results;
    }

    cacheResults(results);
    saveHealthHistory(results);

    return results;
  },

  async getBestGatewayUrl(
    customGateways: Gateway[] = [],
    options: {
      requireRangeSupport?: boolean;
      requireCors?: boolean;
      minHealthScore?: number;
    } = {}
  ): Promise<{ url: string; gateway: Gateway | null }> {
    const { requireRangeSupport = false, requireCors = false, minHealthScore = 30 } = options;

    const results = await this.autoTestGateways(customGateways);

    let availableGateways = results.filter((g) => g.available);

    if (requireRangeSupport) {
      availableGateways = availableGateways.filter((g) => g.rangeSupport);
    }
    if (requireCors) {
      availableGateways = availableGateways.filter((g) => g.corsEnabled);
    }
    if (minHealthScore > 0) {
      availableGateways = availableGateways.filter((g) => (g.healthScore || 0) >= minHealthScore);
    }

    if (availableGateways.length > 0) {
      const bestGateway = availableGateways.sort((a, b) => {
        const healthDiff = (b.healthScore || 0) - (a.healthScore || 0);
        if (healthDiff !== 0) return healthDiff;

        const reliabilityDiff = (b.reliability || 0) - (a.reliability || 0);
        if (reliabilityDiff !== 0) return reliabilityDiff;

        return (a.latency || Infinity) - (b.latency || Infinity);
      })[0];

      return { url: bestGateway.url, gateway: bestGateway };
    }

    const fallbackGateways = results.filter((g) => g.available);
    if (fallbackGateways.length > 0) {
      const best = fallbackGateways.sort(
        (a, b) => (a.latency || Infinity) - (b.latency || Infinity)
      )[0];
      return { url: best.url, gateway: best };
    }

    return { url: CONFIG.DEFAULT_GATEWAYS[0].url, gateway: null };
  },

  async multiGatewayDownload(
    cid: string,
    gateways: Gateway[],
    onProgress?: (gateway: Gateway, status: 'testing' | 'success' | 'failed') => void
  ): Promise<{ url: string; gateway: Gateway } | null> {
    if (!gateways || gateways.length === 0) {
      return null;
    }

    const availableGateways = gateways.filter(g => g.available);
    if (availableGateways.length === 0) {
      return null;
    }

    const sortedGateways = availableGateways.sort(
      (a, b) => (a.latency || Infinity) - (b.latency || Infinity)
    );

    return new Promise((resolve) => {
      let resolved = false;
      const batchSize = 3;
      const batches: Gateway[][] = [];
      for (let i = 0; i < sortedGateways.length; i += batchSize) {
        batches.push(sortedGateways.slice(i, i + batchSize));
      }

      const testBatch = async (batch: Gateway[]) => {
        const batchPromises = batch.map(async (gateway) => {
          if (resolved) return;

          onProgress?.(gateway, 'testing');

          const testUrl = `${gateway.url}${cid}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          try {
            const response = await fetch(testUrl, {
              method: 'HEAD',
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok && !resolved) {
              resolved = true;
              onProgress?.(gateway, 'success');
              resolve({ url: testUrl, gateway });
            }
          } catch {
            onProgress?.(gateway, 'failed');
          }
        });

        await Promise.all(batchPromises);
      };

      (async () => {
        for (const batch of batches) {
          if (resolved) break;
          await testBatch(batch);
          if (!resolved) {
            await new Promise(r => setTimeout(r, 100));
          }
        }

        if (!resolved) {
          const best = sortedGateways[0];
          if (best) {
            resolve({ url: `${best.url}${cid}`, gateway: best });
          } else {
            resolve(null);
          }
        }
      })();

      setTimeout(() => {
        if (!resolved) {
          const best = sortedGateways[0];
          if (best) {
            resolve({ url: `${best.url}${cid}`, gateway: best });
          } else {
            resolve(null);
          }
        }
      }, 30000);
    });
  },

  async getBestMediaGateway(
    gateways: Gateway[],
    preferRangeSupport: boolean = true
  ): Promise<Gateway | null> {
    const availableGateways = gateways.filter((g) => g.available);
    if (availableGateways.length === 0) return null;

    if (preferRangeSupport) {
      const mediaTests = await Promise.all(
        availableGateways.map(async (gateway) => {
          const result = await testGatewayMediaSupport(gateway);
          return { gateway, ...result };
        })
      );

      const withRangeSupport = mediaTests.filter((t) => t.supportsRange);
      if (withRangeSupport.length > 0) {
        return withRangeSupport.sort((a, b) => a.latency - b.latency)[0].gateway;
      }
    }

    return availableGateways.sort(
      (a, b) => (a.latency || Infinity) - (b.latency || Infinity)
    )[0];
  },
};
