import type { ApiResponse } from "../../types";

interface Env {
  ADMIN_PASSWORD_HASH: string;
}

interface Context {
  request: Request;
  env: Env;
}

interface VerifyPasswordBody {
  password: string;
}

export async function onRequestPost(context: Context): Promise<Response> {
  const { request, env } = context;

  try {
    const body = (await request.json()) as VerifyPasswordBody;
    const { password } = body;
    const expectedPassword = env.ADMIN_PASSWORD_HASH;

    if (!expectedPassword) {
      return new Response(
        JSON.stringify({ error: "服务器配置错误" } as ApiResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (password === expectedPassword) {
      return new Response(
        JSON.stringify({ success: true } as ApiResponse),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "密码错误" } as ApiResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "请求处理失败" } as ApiResponse),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
