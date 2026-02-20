/**
 * 环境变量类型定义
 * 用于 Cloudflare Functions
 */

export interface Env {
  // Upstash Redis 配置
  UPSTASH_URL: string;
  UPSTASH_TOKEN: string;

  // 管理员密码（明文）
  ADMIN_PASSWORD: string;

  // Crust Network Token
  CRUST_TOKEN: string;
}

export interface Context {
  request: Request;
  env: Env;
}
