function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');
  if (!headers.has('Access-Control-Allow-Origin')) headers.set('Access-Control-Allow-Origin', '*');
  if (!headers.has('Access-Control-Allow-Methods')) headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (!headers.has('Access-Control-Allow-Headers')) headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function normalizeCid(cid) {
  if (typeof cid !== 'string') return '';
  const trimmed = cid.trim();
  if (!trimmed) return '';
  if (trimmed.length > 120) return '';
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) return '';
  return trimmed;
}

const DEFAULT_GATEWAYS = [
  { name: 'Cloudflare-CN', base: 'https://cf-ipfs.com/ipfs/', region: 'CN' },
  { name: 'IPFSScan-CN', base: 'https://cdn.ipfsscan.io/ipfs/', region: 'CN' },
  { name: '4EVERLAND', base: 'https://4everland.io/ipfs/', region: 'CN' },
  { name: 'Lighthouse', base: 'https://gateway.lighthouse.storage/ipfs/', region: 'CN' },
  { name: 'IPFS.io', base: 'https://ipfs.io/ipfs/', region: 'INTL' },
  { name: 'DWeb Link', base: 'https://dweb.link/ipfs/', region: 'INTL' },
  { name: 'Cloudflare-IPFS', base: 'https://cloudflare-ipfs.com/ipfs/', region: 'INTL' },
  { name: 'W3S Link', base: 'https://w3s.link/ipfs/', region: 'INTL' },
  { name: 'Pinata Gateway', base: 'https://gateway.pinata.cloud/ipfs/', region: 'INTL' },
  { name: 'NFT Storage', base: 'https://nftstorage.link/ipfs/', region: 'INTL' },
  { name: 'Infura', base: 'https://ipfs.infura.io/ipfs/', region: 'INTL' },
  { name: 'Crust Websites', base: 'https://crustwebsites.net/ipfs/', region: 'INTL' },
  { name: 'Jorropo', base: 'https://ipfs.jorropo.com/ipfs/', region: 'INTL' },
  { name: 'Trust IPFS', base: 'https://trustipfs.io/ipfs/', region: 'INTL' },
  { name: 'Via IPFS', base: 'https://via.ipfs.io/ipfs/', region: 'INTL' },
  { name: 'Fleek', base: 'https://ipfs.fleek.co/ipfs/', region: 'INTL' },
  { name: 'Web3.Storage', base: 'https://web3.storage/ipfs/', region: 'INTL' },
  { name: 'IPFS TTL', base: 'https://ipfs.eternum.io/ipfs/', region: 'INTL' },
  { name: 'Akasha', base: 'https://ipfs.akasha.link/ipfs/', region: 'INTL' },
  { name: 'Protocol Labs', base: 'https://ipfs.runfission.com/ipfs/', region: 'INTL' },
  { name: 'Cafe', base: 'https://cafe.cloud.ipfs.team/ipfs/', region: 'INTL' }
];

function getGatewayList(profile) {
  const seen = new Set();
  const normalized = [];
  const p = String(profile || 'AUTO').toUpperCase();
  const baseList = (p === 'INTL')
    ? [...DEFAULT_GATEWAYS.filter(g => g.region !== 'CN'), ...DEFAULT_GATEWAYS.filter(g => g.region === 'CN')]
    : DEFAULT_GATEWAYS;
  for (const g of baseList) {
    const base = typeof g?.base === 'string' ? g.base : '';
    if (!base || !base.includes('/ipfs/')) continue;
    if (seen.has(base)) continue;
    seen.add(base);
    normalized.push({ name: String(g?.name || 'Gateway'), base, region: g.region });
  }
  return normalized;
}

function parseGatewayListParam(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (raw.length > 4000) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const seen = new Set();
  const list = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const base = typeof item.base === 'string' ? item.base.trim() : '';
    if (!base) continue;
    if (base.length > 240) continue;
    if (!base.startsWith('https://')) continue;
    if (!base.includes('/ipfs/')) continue;
    if (seen.has(base)) continue;
    seen.add(base);
    const name = typeof item.name === 'string' ? item.name.trim().slice(0, 50) : 'Gateway';
    list.push({ name: name || 'Gateway', base });
    if (list.length >= 15) break;
  }
  return list.length > 0 ? list : null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cf: { cacheTtl: 0 } });
    return { res, aborted: false };
  } catch (error) {
    return { error, aborted: error?.name === 'AbortError' };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function headCheck(base, cid, timeoutMs) {
  const url = `${base}${cid}`;
  const result = await fetchWithTimeout(url, { method: 'HEAD' }, timeoutMs);
  if (result.res) {
    return { ok: result.res.ok, status: result.res.status };
  }
  return { ok: false, error: result.error };
}

async function rangeCheck(base, cid, timeoutMs) {
  const url = `${base}${cid}`;
  const result = await fetchWithTimeout(
    url,
    { method: 'GET', headers: { Range: 'bytes=0-0' } },
    timeoutMs
  );
  if (result.res) {
    const ok = result.res.ok || result.res.status === 206;
    try {
      if (result.res.body) result.res.body.cancel();
    } catch {}
    return { ok, status: result.res.status };
  }
  return { ok: false, error: result.error };
}

async function parallelFirstSuccess(items, worker) {
  const errors = [];
  let resolved = false;
  let settled = 0;

  return await new Promise((resolve) => {
    for (const item of items) {
      void (async () => {
        const r = await worker(item);
        settled++;
        if (!resolved && r.ok) {
          resolved = true;
          resolve({ success: true, result: r });
          return;
        }

        const errMsg = r.error
          ? (r.error?.name === 'AbortError' ? '超时' : (r.error?.message || '错误'))
          : `HTTP ${r.status}`;
        errors.push(`${item.name}: ${errMsg}`);

        if (settled === items.length && !resolved) {
          resolve({ success: false, errors });
        }
      })();
    }
  });
}

function pickGateways(gateways, attempt, parallel) {
  if (gateways.length <= parallel) return gateways;
  const offset = ((attempt - 1) * parallel) % gateways.length;
  const picked = [];
  for (let i = 0; i < parallel; i++) {
    picked.push(gateways[(offset + i) % gateways.length]);
  }
  return picked;
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return jsonResponse({ ok: true }, { status: 204 });
  if (request.method !== 'GET') return jsonResponse({ success: false, error: 'Method not allowed' }, { status: 405 });

  const url = new URL(request.url);
  const cid = normalizeCid(url.searchParams.get('cid'));
  if (!cid) return jsonResponse({ success: false, error: 'Invalid CID' }, { status: 400 });

  const method = String(url.searchParams.get('method') || 'auto').toLowerCase();
  const maxRetries = Math.max(1, Math.min(3, Number(url.searchParams.get('maxRetries') || '2') || 2));
  const timeoutMs = Math.max(1500, Math.min(15000, Number(url.searchParams.get('timeoutMs') || '8000') || 8000));
  const parallel = Math.max(1, Math.min(8, Number(url.searchParams.get('parallel') || '4') || 4));
  const rangeFallback = url.searchParams.get('rangeFallback') === '0' ? false : true;
  const rangeParallel = Math.max(1, Math.min(6, Number(url.searchParams.get('rangeParallel') || '2') || 2));

  const profile = String(url.searchParams.get('profile') || 'AUTO').toUpperCase();
  const customGateways = parseGatewayListParam(url.searchParams.get('gateways'));
  const gateways = customGateways || getGatewayList(profile);
  if (gateways.length === 0) {
    return jsonResponse({ success: false, error: 'No gateways configured' }, { status: 500 });
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const headGateways = pickGateways(gateways, attempt, parallel);
    const headResult = await parallelFirstSuccess(headGateways, async (g) => {
      const r = await headCheck(g.base, cid, timeoutMs);
      return { ...r, gateway: g };
    });
    if (headResult.success) {
      return jsonResponse({
        success: true,
        data: {
          method: 'head',
          gateway: headResult.result.gateway,
          status: headResult.result.status,
          attempt,
          maxRetries
        },
        message: `文件存在验证成功 (${headResult.result.gateway.name}, 尝试 ${attempt}/${maxRetries})`
      });
    }

    const allowRange = (method === 'range' || method === 'auto') && rangeFallback;
    if (allowRange) {
      const rangeGateways = pickGateways(gateways, attempt, Math.max(rangeParallel, parallel));
      const rangeResult = await parallelFirstSuccess(rangeGateways.slice(0, rangeParallel), async (g) => {
        const r = await rangeCheck(g.base, cid, timeoutMs);
        return { ...r, gateway: g };
      });
      if (rangeResult.success) {
        return jsonResponse({
          success: true,
          data: {
            method: 'range',
            gateway: rangeResult.result.gateway,
            status: rangeResult.result.status,
            attempt,
            maxRetries
          },
          message: `文件存在验证成功 (${rangeResult.result.gateway.name}, 尝试 ${attempt}/${maxRetries})`
        });
      }

      if (attempt === maxRetries) {
        const combined = [...(headResult.errors || []), ...(rangeResult.errors || [])];
        return jsonResponse(
          { success: false, error: `验证失败 (尝试 ${attempt}/${maxRetries})：${combined.slice(0, 8).join('；')}`, errors: combined },
          { status: 200 }
        );
      }
    } else if (attempt === maxRetries) {
      return jsonResponse(
        { success: false, error: `验证失败 (尝试 ${attempt}/${maxRetries})：${(headResult.errors || []).slice(0, 8).join('；')}`, errors: headResult.errors || [] },
        { status: 200 }
      );
    }

    await sleep(500);
  }

  return jsonResponse({ success: false, error: '验证失败：超过最大重试次数' }, { status: 200 });
}
