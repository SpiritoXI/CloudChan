import { CONFIG } from "../config";

export function validateGatewayUrl(url: string): { valid: boolean; normalizedUrl: string; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, normalizedUrl: '', error: 'URL 不能为空' };
  }

  let normalizedUrl = url.trim();

  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    
    if (!parsedUrl.hostname || parsedUrl.hostname.length < 2) {
      return { valid: false, normalizedUrl: '', error: '无效的主机名' };
    }

    if (!normalizedUrl.endsWith('/')) {
      normalizedUrl += '/';
    }

    if (!normalizedUrl.includes('/ipfs/')) {
      normalizedUrl += 'ipfs/';
    }

    return { valid: true, normalizedUrl };
  } catch (error) {
    console.warn("URL 验证失败:", error);
    return { valid: false, normalizedUrl: '', error: 'URL 格式无效' };
  }
}

export async function checkGatewayConnectivity(url: string, timeout: number = 5000): Promise<{
  reachable: boolean;
  latency: number;
  error?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const startTime = performance.now();
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors',
    });
    const latency = Math.round(performance.now() - startTime);
    clearTimeout(timeoutId);

    return { reachable: true, latency };
  } catch (error) {
    clearTimeout(timeoutId);
    const errorMessage = error instanceof Error ? error.message : '连接失败';
    return { reachable: false, latency: Infinity, error: errorMessage };
  }
}

export async function testGatewayMediaSupport(gateway: { url: string }): Promise<{
  supportsRange: boolean;
  supportsCors: boolean;
  latency: number;
}> {
  const testUrl = `${gateway.url}${CONFIG.TEST_CID}`;
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const rangeResponse = await fetch(testUrl, {
      method: "HEAD",
      headers: {
        Range: "bytes=0-1023",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const latency = Math.round(performance.now() - startTime);
    const supportsRange = rangeResponse.status === 206 || rangeResponse.headers.has("content-range");
    const supportsCors = rangeResponse.headers.has("access-control-allow-origin");

    return { supportsRange, supportsCors, latency };
  } catch {
    return { supportsRange: false, supportsCors: false, latency: Infinity };
  }
}
