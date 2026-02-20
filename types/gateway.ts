export type GatewayRegion = 'CN' | 'INTL';

export interface Gateway {
  name: string;
  url: string;
  icon: string;
  priority: number;
  region: GatewayRegion;
  latency?: number;
  available?: boolean;
  reliability?: number;
  corsEnabled?: boolean;
  rangeSupport?: boolean;
  healthScore?: number;
  lastChecked?: number;
  failureCount?: number;
  consecutiveFailures?: number;
  lastSuccess?: number;
}

export interface GatewayHealth {
  name: string;
  healthScore: number;
  failureCount: number;
  consecutiveFailures: number;
  lastSuccess: number;
  lastChecked: number;
}

export type GatewayTestStatus = 'pending' | 'testing' | 'success' | 'failed' | 'timeout';

export interface GatewayTestProgress {
  total: number;
  completed: number;
  currentGateway: string | null;
  status: GatewayTestStatus;
  startTime: number;
  results: Map<string, {
    status: GatewayTestStatus;
    latency: number;
    reliability: number;
    healthScore: number;
  }>;
}

export interface GatewayHealthTrend {
  name: string;
  history: {
    timestamp: number;
    healthScore: number;
    latency: number;
    available: boolean;
  }[];
  avgHealthScore: number;
  avgLatency: number;
  uptime: number;
}

export type GatewaySortField = 'name' | 'latency' | 'healthScore' | 'reliability' | 'lastChecked';
export type GatewaySortOrder = 'asc' | 'desc';

export interface GatewayFilter {
  region?: GatewayRegion;
  available?: boolean;
  minHealthScore?: number;
  maxLatency?: number;
  searchQuery?: string;
}
