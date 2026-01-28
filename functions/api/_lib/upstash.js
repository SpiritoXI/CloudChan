export async function upstashCommand(env, command) {
  const res = await fetch(env.UPSTASH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.UPSTASH_TOKEN}`
    },
    body: JSON.stringify(command)
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Upstash HTTP ${res.status}`);
  }
  if (!json || json.error) {
    throw new Error(json?.error || 'Upstash error');
  }
  return json.result;
}

export async function ensureKeyPersistent(env, key) {
  try {
    const ttl = await upstashCommand(env, ['TTL', key]);
    const n = Number(ttl);
    if (Number.isFinite(n) && n > 0) {
      await upstashCommand(env, ['PERSIST', key]);
    }
  } catch {}
}

