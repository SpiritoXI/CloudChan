export async function onRequest(context) {
  const { request, env } = context;

  function jsonResponse(body, init = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('Cache-Control')) {
      headers.set('Cache-Control', 'no-store');
    }
    return new Response(JSON.stringify(body), { ...init, headers });
  }

  function normalizePassword(value) {
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

  // 1. 获取前端传来的管理员密码
  const userPassword = normalizePassword(
    request.headers.get('x-auth-token') ||
      request.headers.get('x-admin-password') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  );

  // 2. 检查环境变量是否配置（ADMIN_PASSWORD / CRUST_TOKEN）
  const expectedPassword = normalizePassword(env.ADMIN_PASSWORD);
  if (!expectedPassword || !env.CRUST_TOKEN) {
    return jsonResponse({ error: '系统错误：环境变量未配置' }, { status: 500 });
  }

  // 3. 验证密码
  if (!userPassword || userPassword !== expectedPassword) {
    return jsonResponse({ error: '未授权：密码错误或缺失' }, { status: 401 });
  }

  // 4. 验证通过，返回 Crust Token
  return jsonResponse({ token: env.CRUST_TOKEN });
}
