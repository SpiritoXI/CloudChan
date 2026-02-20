/**
 * 安全工具函数
 * 提供密码哈希、输入验证等安全相关功能
 */

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function isSafeFilename(filename: string): boolean {
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(filename)) {
    return false;
  }
  
  if (filename.includes('..') || filename.startsWith('/') || filename.startsWith('\\')) {
    return false;
  }
  
  if (filename.length === 0 || filename.length > 255) {
    return false;
  }
  
  return true;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\.\./g, '_')
    .trim();
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'image/bmp', 'image/tiff', 'image/avif',
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
  'video/x-msvideo', 'video/x-matroska',
  'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/mp4',
  'audio/ogg', 'audio/opus', 'audio/webm',
  'application/pdf', 'text/plain', 'text/markdown',
  'application/json', 'application/xml',
  'application/zip', 'application/x-rar-compressed',
  'application/x-7z-compressed', 'application/gzip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

export function isAllowedFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number]);
}

export function isValidFileSize(size: number, maxSize: number = 1024 * 1024 * 1024): boolean {
  return size > 0 && size <= maxSize;
}

export function isValidCID(cid: string): boolean {
  if (!cid || typeof cid !== 'string') return false;
  
  const trimmedCid = cid.trim();
  
  if (trimmedCid.length < 1 || trimmedCid.length > 128) {
    return false;
  }
  
  const cidV0Pattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  const cidV1Pattern = /^baf[a-z0-9]{52,58}$/;
  
  if (!cidV0Pattern.test(trimmedCid) && !cidV1Pattern.test(trimmedCid)) {
    return false;
  }
  
  if (trimmedCid.includes('..') || trimmedCid.includes('/') || trimmedCid.includes('\\')) {
    return false;
  }
  
  return true;
}
