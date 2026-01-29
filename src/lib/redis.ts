/**
 * Upstash Redis 客户端
 * 用于会话管理和临时数据存储
 */

// Redis 键前缀
const SESSION_PREFIX = 'crustshare:session:';
const FILE_PREFIX = 'crustshare:file:';

/**
 * Redis REST API 客户端
 */
class RedisClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = process.env.UPSTASH_REDIS_REST_URL || '';
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN || '';

    if (!this.baseUrl || !this.token) {
      console.warn('Upstash Redis 配置未完成，某些功能可能不可用');
    }
  }

  /**
   * 检查 Redis 是否已配置
   */
  isConfigured(): boolean {
    return !!(this.baseUrl && this.token);
  }

  /**
   * 执行 Redis 命令
   */
  private async executeCommand(args: Array<string | number>): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Redis 未配置');
    }

    const response = await fetch(`${this.baseUrl}/${args.join('/')}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Redis 命令执行失败: ${error}`);
    }

    return response.json();
  }

  /**
   * 设置键值对
   */
  async set(key: string, value: string, ex?: number): Promise<void> {
    const args: Array<string | number> = ['SET', key, value];
    if (ex) {
      args.push('EX', String(ex));
    }
    await this.executeCommand(args);
  }

  /**
   * 获取键值
   */
  async get(key: string): Promise<string | null> {
    const result = await this.executeCommand(['GET', key]);
    return result?.result || null;
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<void> {
    await this.executeCommand(['DEL', key]);
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<void> {
    await this.executeCommand(['EXPIRE', key, String(seconds)]);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.executeCommand(['EXISTS', key]);
    return result?.result === 1;
  }

  /**
   * 获取所有匹配的键
   */
  async keys(pattern: string): Promise<string[]> {
    const result = await this.executeCommand(['KEYS', pattern]);
    return result?.result || [];
  }
}

// 创建单例实例
const redis = new RedisClient();

/**
 * 会话管理工具
 */
export const sessionManager = {
  /**
   * 创建会话
   */
  async create(sessionId: string, data: any, ttl: number = 86400): Promise<void> {
    if (!redis.isConfigured()) {
      // 如果未配置 Redis，使用 localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          SESSION_PREFIX + sessionId,
          JSON.stringify({ data, expiresAt: Date.now() + ttl * 1000 })
        );
      }
      return;
    }

    await redis.set(SESSION_PREFIX + sessionId, JSON.stringify(data), ttl);
  },

  /**
   * 获取会话
   */
  async get(sessionId: string): Promise<any | null> {
    if (!redis.isConfigured()) {
      // 如果未配置 Redis，使用 localStorage
      if (typeof window !== 'undefined') {
        const value = localStorage.getItem(SESSION_PREFIX + sessionId);
        if (!value) return null;

        const session = JSON.parse(value);
        if (Date.now() > session.expiresAt) {
          localStorage.removeItem(SESSION_PREFIX + sessionId);
          return null;
        }
        return session.data;
      }
      return null;
    }

    const value = await redis.get(SESSION_PREFIX + sessionId);
    return value ? JSON.parse(value) : null;
  },

  /**
   * 删除会话
   */
  async destroy(sessionId: string): Promise<void> {
    if (!redis.isConfigured()) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_PREFIX + sessionId);
      }
      return;
    }

    await redis.del(SESSION_PREFIX + sessionId);
  },
};

/**
 * 文件元数据存储工具
 */
export const fileMetadata = {
  /**
   * 保存文件元数据
   */
  async save(fileId: string, metadata: any): Promise<void> {
    if (!redis.isConfigured()) {
      console.warn('Redis 未配置，文件元数据未持久化');
      return;
    }

    await redis.set(FILE_PREFIX + fileId, JSON.stringify(metadata));
  },

  /**
   * 获取文件元数据
   */
  async get(fileId: string): Promise<any | null> {
    if (!redis.isConfigured()) {
      return null;
    }

    const value = await redis.get(FILE_PREFIX + fileId);
    return value ? JSON.parse(value) : null;
  },

  /**
   * 删除文件元数据
   */
  async delete(fileId: string): Promise<void> {
    if (!redis.isConfigured()) {
      return;
    }

    await redis.del(FILE_PREFIX + fileId);
  },
};

export default redis;
