export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { password } = await request.json();
    const expectedPassword = env.ADMIN_PASSWORD_HASH;

    if (!expectedPassword) {
      return new Response(
        JSON.stringify({ error: "服务器配置错误" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (password === expectedPassword) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "密码错误" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "请求处理失败" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
