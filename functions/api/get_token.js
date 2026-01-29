export async function onRequestGet(context) {
  const { request, env } = context;
  
  const authHeader = request.headers.get("x-auth-token");
  const expectedPassword = env.ADMIN_PASSWORD;

  if (!authHeader || authHeader !== expectedPassword) {
    return new Response(
      JSON.stringify({ error: "未授权" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const crustToken = env.CRUST_TOKEN;
  if (!crustToken) {
    return new Response(
      JSON.stringify({ error: "CRUST_TOKEN未配置" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ token: crustToken }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
