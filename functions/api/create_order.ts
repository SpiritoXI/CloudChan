import type { ApiResponse, Env, Context } from "../../types";

// CORS 响应头
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-auth-token",
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * 创建存储订单 API
 * 
 * 通过后端代理调用 Crust API 创建存储订单，绕过 CORS 限制
 * 
 * 参数:
 * - cid: 文件 CID
 * - size: 文件大小（字节）
 */
export async function onRequestPost(context: Context): Promise<Response> {
  const { request, env } = context;

  // 验证用户认证
  const authHeader = request.headers.get("x-auth-token");
  if (!authHeader || authHeader !== env.ADMIN_PASSWORD) {
    return new Response(
      JSON.stringify({ success: false, error: "未授权" } as ApiResponse),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // 检查 CRUST_ACCESS_TOKEN 是否已配置
  if (!env.CRUST_ACCESS_TOKEN) {
    return new Response(
      JSON.stringify({ success: false, error: "CRUST_ACCESS_TOKEN未配置" } as ApiResponse),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // 解析请求参数
  const url = new URL(request.url);
  const cid = url.searchParams.get("cid");
  const sizeStr = url.searchParams.get("size");
  
  if (!cid || !sizeStr) {
    return new Response(
      JSON.stringify({ success: false, error: "缺少必要参数 cid 或 size" } as ApiResponse),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
  
  const size = parseInt(sizeStr, 10);
  if (isNaN(size)) {
    return new Response(
      JSON.stringify({ success: false, error: "size 参数必须是数字" } as ApiResponse),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // 多个端点用于创建订单
  const orderEndpoints = [
    {
      name: 'crustfiles-app',
      url: `https://gw.crustfiles.app/crust/api/v1/files/${cid}/order`,
    },
    {
      name: 'decoo-main',
      url: `https://gw.decoo.io/crust/api/v1/files/${cid}/order`,
    },
    {
      name: 'decoo-hk',
      url: `https://ipfs-hk.decoo.io/crust/api/v1/files/${cid}/order`,
    },
    {
      name: 'crust-gateway',
      url: `https://crustgateway.com/crust/api/v1/files/${cid}/order`,
    },
  ];

  const errors: string[] = [];

  // 依次尝试每个端点
  for (const endpoint of orderEndpoints) {
    try {
      console.log(`[create_order] 尝试端点 ${endpoint.name}: ${endpoint.url}`);
      
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CRUST_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cid,
          size,
          months: 1200, // 永久存储
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[create_order] 端点 ${endpoint.name} 订单创建成功:`, result);
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { 
              orderCreated: true, 
              endpoint: endpoint.name,
              result 
            } 
          } as ApiResponse),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        const errorText = await response.text();
        errors.push(`${endpoint.name}: HTTP ${response.status} - ${errorText}`);
        console.warn(`[create_order] 端点 ${endpoint.name} 失败: HTTP ${response.status}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`${endpoint.name}: ${errorMsg}`);
      console.error(`[create_order] 端点 ${endpoint.name} 异常:`, errorMsg);
    }
  }

  // 所有端点都失败
  console.error(`[create_order] 所有端点都失败:`, errors);
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: "创建存储订单失败",
      details: errors.join('; ')
    } as ApiResponse),
    { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
