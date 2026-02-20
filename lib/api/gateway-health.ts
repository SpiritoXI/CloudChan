import { CONFIG } from "../config";
import type { Gateway } from "@/types";

export function calculateHealthScore(
  gateway: Gateway,
  testResult: { available: boolean; latency: number; reliability: number }
): number {
  const { BASE_LATENCY_SCORE, MAX_LATENCY, SUCCESS_BONUS, FAILURE_PENALTY, CN_REGION_BONUS } =
    CONFIG.GATEWAY_HEALTH.SCORING;

  let score = gateway.healthScore || BASE_LATENCY_SCORE;

  if (testResult.available) {
    const latencyRatio = Math.min(testResult.latency / MAX_LATENCY, 1);
    const latencyScore = Math.round((1 - latencyRatio) * BASE_LATENCY_SCORE);

    const reliabilityBonus = Math.round((testResult.reliability / 100) * SUCCESS_BONUS);

    const regionBonus = gateway.region === "CN" ? CN_REGION_BONUS : 0;

    score = Math.round(latencyScore * 0.5 + reliabilityBonus * 0.3 + regionBonus * 0.2);

    if (gateway.consecutiveFailures === 0 && gateway.lastSuccess) {
      score = Math.min(score + 2, 100);
    }
  } else {
    score = Math.max(score - FAILURE_PENALTY * ((gateway.consecutiveFailures || 0) + 1), 0);
  }

  return Math.round(score);
}

export function createTestProgress(total: number): import("@/types").GatewayTestProgress {
  return {
    total,
    completed: 0,
    currentGateway: null,
    status: 'pending',
    startTime: Date.now(),
    results: new Map(),
  };
}

export function updateTestProgress(
  progress: import("@/types").GatewayTestProgress,
  gatewayName: string,
  result: {
    status: import("@/types").GatewayTestStatus;
    latency: number;
    reliability: number;
    healthScore: number;
  }
): import("@/types").GatewayTestProgress {
  const newResults = new Map(progress.results);
  newResults.set(gatewayName, result);

  const completed = Array.from(newResults.values()).filter(
    r => r.status === 'success' || r.status === 'failed' || r.status === 'timeout'
  ).length;

  const allCompleted = completed === progress.total;
  const hasSuccess = Array.from(newResults.values()).some(r => r.status === 'success');

  return {
    ...progress,
    completed,
    currentGateway: allCompleted ? null : gatewayName,
    status: allCompleted ? (hasSuccess ? 'success' : 'failed') : 'testing',
    results: newResults,
  };
}

export function sortGateways(
  gateways: Gateway[],
  field: import("@/types").GatewaySortField = 'healthScore',
  order: import("@/types").GatewaySortOrder = 'desc'
): Gateway[] {
  return [...gateways].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'latency':
        comparison = (a.latency || Infinity) - (b.latency || Infinity);
        break;
      case 'healthScore':
        comparison = (b.healthScore || 0) - (a.healthScore || 0);
        break;
      case 'reliability':
        comparison = (b.reliability || 0) - (a.reliability || 0);
        break;
      case 'lastChecked':
        comparison = (b.lastChecked || 0) - (a.lastChecked || 0);
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });
}

export function filterGateways(
  gateways: Gateway[],
  filter: import("@/types").GatewayFilter
): Gateway[] {
  return gateways.filter(gateway => {
    if (filter.region && gateway.region !== filter.region) return false;
    if (filter.available !== undefined && gateway.available !== filter.available) return false;
    if (filter.minHealthScore !== undefined && (gateway.healthScore || 0) < filter.minHealthScore) return false;
    if (filter.maxLatency !== undefined && (gateway.latency || Infinity) > filter.maxLatency) return false;
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      if (!gateway.name.toLowerCase().includes(query) && 
          !gateway.url.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });
}
