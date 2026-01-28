export function normalizePassword(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

export function readPasswordFromRequest(request) {
  return normalizePassword(
    request.headers.get('x-auth-token') ||
      request.headers.get('x-admin-password') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  );
}

export function verifyAdminPassword(request, env) {
  const expectedPassword = normalizePassword(env.ADMIN_PASSWORD);
  if (!expectedPassword) {
    return { ok: false, error: '系统错误：环境变量未配置（ADMIN_PASSWORD）', status: 500 };
  }

  const userPassword = readPasswordFromRequest(request);
  if (!userPassword || userPassword !== expectedPassword) {
    return { ok: false, error: '未授权：密码错误或缺失', status: 401 };
  }

  return { ok: true };
}

