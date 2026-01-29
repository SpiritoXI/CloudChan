/**
 * 认证工具库
 * 提供 Access Token 认证功能
 */

/**
 * 从环境变量获取 Access Token
 * @returns Access Token
 */
export function getAccessToken(): string {
  const token = process.env.ACCESS_TOKEN;

  if (!token) {
    console.warn('ACCESS_TOKEN 未设置，使用默认值（仅用于开发）');
    return 'default-token-for-development-only';
  }

  return token;
}

/**
 * 验证 Access Token
 * @param inputToken - 用户输入的 Access Token
 * @returns 是否匹配
 */
export function verifyAccessToken(inputToken: string): boolean {
  const correctToken = getAccessToken();
  return inputToken === correctToken;
}

/**
 * 生成随机的 Access Token（用于配置）
 * @returns 随机的 Access Token
 */
export function generateAccessToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}
