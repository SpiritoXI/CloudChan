import type { Gateway } from "@/types";

export const propagationApi = {
  async propagateToGateway(
    gateway: Gateway,
    cid: string,
    options: {
      timeout?: number;
      useRange?: boolean;
      rangeSize?: number;
    } = {}
  ): Promise<{
    success: boolean;
    cached: boolean;
    latency: number;
    error?: string;
  }> {
    const { timeout = 15000, useRange = true, rangeSize = 1024 } = options;
    const url = `${gateway.url}${cid}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const startTime = performance.now();

      let response: Response;

      if (useRange) {
        response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Range': `bytes=0-${rangeSize - 1}`,
            'Cache-Control': 'no-cache',
          },
        });
      } else {
        response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
      }

      const latency = Math.round(performance.now() - startTime);
      clearTimeout(timeoutId);

      if (response.ok || response.status === 206) {
        const contentLength = response.headers.get('content-length');
        const contentRange = response.headers.get('content-range');
        const cached = response.headers.get('x-ipfs-cached') === 'true' || 
                       response.headers.get('x-cache-status') === 'HIT';

        if (response.body) {
          const reader = response.body.getReader();
          const { done } = await reader.read();
          reader.cancel();
        }

        return {
          success: true,
          cached,
          latency,
        };
      } else if (response.status === 416) {
        const headResponse = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (headResponse.ok) {
          return {
            success: true,
            cached: false,
            latency: Math.round(performance.now() - startTime),
          };
        }
      }

      return {
        success: false,
        cached: false,
        latency,
        error: `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        cached: false,
        latency: Infinity,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async propagateToGateways(
    cid: string,
    gateways: Gateway[],
    options: {
      maxConcurrent?: number;
      timeout?: number;
      useRange?: boolean;
      onProgress?: (gateway: Gateway, status: 'pending' | 'success' | 'failed', result?: { cached: boolean; latency: number }) => void;
    } = {}
  ): Promise<{
    success: Gateway[];
    failed: Gateway[];
    total: number;
    details: Map<string, { success: boolean; cached: boolean; latency: number; error?: string }>;
  }> {
    const { maxConcurrent = 5, timeout = 15000, useRange = true, onProgress } = options;

    const availableGateways = gateways.filter(g => g.available);
    if (availableGateways.length === 0) {
      return { success: [], failed: [], total: 0, details: new Map() };
    }

    const success: Gateway[] = [];
    const failed: Gateway[] = [];
    const details = new Map<string, { success: boolean; cached: boolean; latency: number; error?: string }>();

    const queue = [...availableGateways];
    const executing: Set<Promise<void>> = new Set();

    const processGateway = async (gateway: Gateway): Promise<void> => {
      onProgress?.(gateway, 'pending');

      const result = await this.propagateToGateway(gateway, cid, { timeout, useRange });
      details.set(gateway.url, result);

      if (result.success) {
        success.push(gateway);
        onProgress?.(gateway, 'success', { cached: result.cached, latency: result.latency });
      } else {
        failed.push(gateway);
        onProgress?.(gateway, 'failed');
      }
    };

    while (queue.length > 0 || executing.size > 0) {
      while (executing.size < maxConcurrent && queue.length > 0) {
        const gateway = queue.shift()!;
        const promise = processGateway(gateway).finally(() => {
          executing.delete(promise);
        });
        executing.add(promise);
      }

      if (executing.size > 0) {
        await Promise.race(executing);
      }
    }

    return {
      success,
      failed,
      total: availableGateways.length,
      details,
    };
  },

  async smartPropagate(
    cid: string,
    gateways: Gateway[],
    options: {
      maxGateways?: number;
      timeout?: number;
      onProgress?: (gateway: Gateway, status: 'pending' | 'success' | 'failed', result?: { cached: boolean; latency: number }) => void;
    } = {}
  ): Promise<{
    success: Gateway[];
    failed: Gateway[];
    total: number;
    details: Map<string, { success: boolean; cached: boolean; latency: number; error?: string }>;
  }> {
    const { maxGateways = 8, timeout = 15000, onProgress } = options;

    const sortedGateways = gateways
      .filter(g => g.available)
      .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity))
      .slice(0, maxGateways);

    return this.propagateToGateways(cid, sortedGateways, {
      maxConcurrent: 5,
      timeout,
      useRange: true,
      onProgress,
    });
  },

  backgroundPropagate(
    cid: string,
    gateways: Gateway[],
    options: {
      maxGateways?: number;
      timeout?: number;
      onComplete?: (result: { success: Gateway[]; failed: Gateway[]; total: number; details: Map<string, { success: boolean; cached: boolean; latency: number; error?: string }> }) => void;
    } = {}
  ): void {
    setTimeout(() => {
      this.smartPropagate(cid, gateways, options).then((result) => {
        options.onComplete?.(result);
        const cachedCount = Array.from(result.details.values()).filter(d => d.cached).length;
        console.log(`[Propagation] CID ${cid.slice(0, 16)}... propagated to ${result.success.length}/${result.total} gateways (${cachedCount} cached)`);
      }).catch((error) => {
        console.error(`[Propagation] Failed for CID ${cid.slice(0, 16)}...:`, error);
      });
    }, 100);
  },

  async aggressivePropagate(
    cid: string,
    gateways: Gateway[],
    options: {
      rounds?: number;
      delayBetweenRounds?: number;
      onRoundComplete?: (round: number, result: { success: Gateway[]; failed: Gateway[]; total: number }) => void;
    } = {}
  ): Promise<{
    totalSuccess: number;
    totalAttempts: number;
    rounds: Array<{ success: Gateway[]; failed: Gateway[]; total: number }>;
  }> {
    const { rounds = 3, delayBetweenRounds = 5000, onRoundComplete } = options;
    const results: Array<{ success: Gateway[]; failed: Gateway[]; total: number }> = [];
    let totalSuccess = 0;
    const attemptedGateways = new Set<string>();

    for (let round = 1; round <= rounds; round++) {
      console.log(`[Propagation] Round ${round}/${rounds} for CID ${cid.slice(0, 16)}...`);

      const gatewaysToTry = gateways.filter(g => 
        g.available && !attemptedGateways.has(g.url)
      );

      if (gatewaysToTry.length === 0) {
        console.log(`[Propagation] All gateways already tried, stopping early`);
        break;
      }

      const result = await this.propagateToGateways(cid, gatewaysToTry, {
        maxConcurrent: 8,
        timeout: 20000,
        useRange: true,
      });

      result.success.forEach(g => attemptedGateways.add(g.url));
      totalSuccess += result.success.length;
      results.push(result);

      onRoundComplete?.(round, result);

      if (round < rounds) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRounds));
      }
    }

    return {
      totalSuccess,
      totalAttempts: attemptedGateways.size,
      rounds: results,
    };
  },
};
