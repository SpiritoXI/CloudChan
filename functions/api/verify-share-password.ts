import type { ApiResponse, Env, Context } from "../../types";

const SHARES_KEY = "crustshare_shares";

interface ShareInfo {
  cid: string;
  filename?: string;
  size?: number;
  password?: string;
  expiry?: string;
  createdAt: number;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// CORS 响应头
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// 处理 CORS 预检请求
function handleCors(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  return null;
}

async function upstashCommand<T = unknown>(
  upstashUrl: string,
  upstashToken: string,
  command: (string | number)[]
): Promise<T> {
  if (!upstashUrl || !upstashToken) {
    throw new Error("Upstash配置缺失");
  }

  const response = await fetch(upstashUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${upstashToken}`,
    },
    body: JSON.stringify(command),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || `Upstash错误: ${response.status}`);
  }

  return data.result;
}

// POST: 验证分享密码
export async function onRequestPost(context: Context): Promise<Response> {
  const { request, env } = context;

  // 处理 CORS 预检请求
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const body = await request.json() as { cid: string; password: string };
    const { cid, password } = body;

    if (!cid || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "缺少CID或密码" } as ApiResponse),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await upstashCommand<string | null>(
      env.UPSTASH_URL,
      env.UPSTASH_TOKEN,
      ["HGET", SHARES_KEY, cid]
    );

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: "分享不存在" } as ApiResponse),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const shareInfo: ShareInfo = JSON.parse(result);

    // 检查是否过期
    if (shareInfo.expiry && shareInfo.expiry !== "0") {
      const expiryDays = parseInt(shareInfo.expiry);
      const expiryTime = shareInfo.createdAt + expiryDays * 24 * 60 * 60 * 1000;
      if (Date.now() > expiryTime) {
        return new Response(
          JSON.stringify({ success: false, error: "分享已过期" } as ApiResponse),
          { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // 验证密码 - 使用哈希比较
    const hashedInputPassword = await hashPassword(password);
    if (shareInfo.password !== hashedInputPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "密码错误" } as ApiResponse),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 密码正确，返回完整分享信息
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          cid: shareInfo.cid,
          filename: shareInfo.filename,
          size: shareInfo.size,
          hasPassword: !!shareInfo.password,
          expiry: shareInfo.expiry,
        },
      } as ApiResponse),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "验证密码失败";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage } as ApiResponse),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}
