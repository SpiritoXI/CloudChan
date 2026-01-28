export async function onRequest(context) {
  const { env } = context;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');

  const body = {
    ok: true,
    runtime: 'cloudflare-pages-functions',
    hasEnv: {
      ADMIN_PASSWORD: Boolean(env.ADMIN_PASSWORD),
      UPSTASH_URL: Boolean(env.UPSTASH_URL),
      UPSTASH_TOKEN: Boolean(env.UPSTASH_TOKEN),
      CRUST_TOKEN: Boolean(env.CRUST_TOKEN)
    },
    now: new Date().toISOString()
  };

  return new Response(JSON.stringify(body), { status: 200, headers });
}
