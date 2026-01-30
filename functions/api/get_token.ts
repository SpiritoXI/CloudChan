import type { ApiResponse } from "../../types";

interface Env {
  ADMIN_PASSWORD: string;
  CRUST_TOKEN: string;
}

interface Context {
  request: Request;
  env: Env;
}

export async function onRequestGet(context: Context): Promise<Response> {
  const { request, env } = context;

  const authHeader = request.headers.get("x-auth-token");
  const expectedPassword = env.ADMIN_PASSWORD;

  if (!authHeader || authHeader !== expectedPassword) {
    return new Response(
      JSON.stringify({ error: "未授权" } as ApiResponse),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const crustToken = env.CRUST_TOKEN;
  if (!crustToken) {
    return new Response(
      JSON.stringify({ error: "CRUST_TOKEN未配置" } as ApiResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data: { token: crustToken } } as ApiResponse<{ token: string }>),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
