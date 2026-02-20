import type { Env } from "@/types";

export async function upstashCommand<T = unknown>(
  upstashUrl: string,
  upstashToken: string,
  command: (string | number)[],
  retryCount = 3
): Promise<T> {
  if (!upstashUrl || !upstashToken) {
    throw new Error("Upstash配置缺失");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
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
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < retryCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Upstash命令执行失败");
}

export async function verifyAuth(request: Request, env: Pick<Env, "ADMIN_PASSWORD">): Promise<boolean> {
  const authHeader = request.headers.get("x-auth-token");
  if (!authHeader) {
    return false;
  }
  return authHeader === env.ADMIN_PASSWORD;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-auth-token",
};

export function handleCors(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  return null;
}
