import type { ApiResponse, Env, Context } from "../../types";

// CORS 响应头
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-auth-token",
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * 验证文件固定状态 API
 * 
 * 通过多种方式验证文件是否已被成功固定：
 * 1. 查询 Crust 链上存储状态
 * 2. 通过多个 IPFS 网关验证文件可用性
 * 
 * 参数:
 * - cid: 文件 CID
 */
export async function onRequestGet(context: Context): Promise<Response> {
  const { request, env } = context;

  // 解析请求参数
  const url = new URL(request.url);
  const cid = url.searchParams.get("cid");
  
  if (!cid) {
    return new Response(
      JSON.stringify({ success: false, error: "缺少必要参数 cid" } as ApiResponse),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  console.log(`[verify_pin] 开始验证文件固定状态: CID=${cid}`);

  // 验证结果
  const result = {
    cid,
    pinned: false,
    availableOnGateways: [] as string[],
    crustOrderExists: false,
    lastChecked: new Date().toISOString(),
  };

  // 1. 尝试从多个 IPFS 网关验证文件可用性
  const gateways = [
    { name: 'Cloudflare-CN', url: `https://cf-ipfs.com/ipfs/${cid}` },
    { name: '4EVERLAND', url: `https://4everland.io/ipfs/${cid}` },
    { name: 'IPFSScan-CN', url: `https://cdn.ipfsscan.io/ipfs/${cid}` },
    { name: 'Crust', url: `https://crustwebsites.net/ipfs/${cid}` },
    { name: 'IPFS.io', url: `https://ipfs.io/ipfs/${cid}` },
    { name: 'DWeb', url: `https://dweb.link/ipfs/${cid}` },
  ];

  // 并行检查所有网关
  const gatewayChecks = gateways.map(async (gateway) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(gateway.url, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { name: gateway.name, available: true };
      }
    } catch {
      // 忽略错误
    }
    return { name: gateway.name, available: false };
  });

  const gatewayResults = await Promise.all(gatewayChecks);
  result.availableOnGateways = gatewayResults
    .filter(g => g.available)
    .map(g => g.name);

  // 2. 查询 Crust 链上存储状态
  const crustToken = env.CRUST_ACCESS_TOKEN;
  if (crustToken) {
    const crustEndpoints = [
      `https://gw.crustfiles.app/crust/api/v1/files/${cid}`,
      `https://gw.decoo.io/crust/api/v1/files/${cid}`,
    ];

    for (const endpoint of crustEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${crustToken}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log(`[verify_pin] Crust 链上数据:`, data);
          
          // 检查是否有有效的存储订单
          if (data && (data.order || data.replicas || data.size)) {
            result.crustOrderExists = true;
            break;
          }
        }
      } catch (error) {
        console.warn(`[verify_pin] 查询 Crust 端点失败:`, error);
      }
    }
  }

  // 3. 综合判断文件是否被固定
  // 如果文件在任意网关可用，说明文件已被固定到 IPFS 网络
  result.pinned = result.availableOnGateways.length > 0 || result.crustOrderExists;

  console.log(`[verify_pin] 验证结果:`, result);

  return new Response(
    JSON.stringify({
      success: true,
      data: result,
    } as ApiResponse),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
