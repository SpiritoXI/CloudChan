// 本地缓存工具

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl?: number; // 过期时间（毫秒）
}

class LocalCache {
  private prefix = 'crustshare_cache_';

  // 设置缓存
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(item));
  }

  // 获取缓存
  get<T>(key: string): T | null {
    const itemStr = localStorage.getItem(`${this.prefix}${key}`);
    if (!itemStr) return null;

    try {
      const item: CacheItem<T> = JSON.parse(itemStr);

      // 检查是否过期
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.remove(key);
        return null;
      }

      return item.data;
    } catch {
      return null;
    }
  }

  // 移除缓存
  remove(key: string): void {
    localStorage.removeItem(`${this.prefix}${key}`);
  }

  // 清空所有缓存
  clear(): void {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(this.prefix))
      .forEach((key) => localStorage.removeItem(key));
  }
}

export const cache = new LocalCache();

// 缓存键常量
export const CacheKeys = {
  GATEWAY_HEALTH: 'gateway_health',
  GATEWAY_STATE: 'gateway_state',
  GATEWAY_STATES: 'gateway_states',
  GATEWAY_MAPPING: 'gateway_mapping',
  FILE_METADATA: 'file_metadata',
};

// 缓存 TTL 常量（毫秒）
export const CacheTTL = {
  SHORT: 5 * 60 * 1000, // 5 分钟
  MEDIUM: 15 * 60 * 1000, // 15 分钟
  LONG: 60 * 60 * 1000, // 1 小时
  GATEWAY_STATE: 30 * 60 * 1000, // 30 分钟
  GATEWAY_MAPPING: 7 * 24 * 60 * 60 * 1000, // 7 天
};
