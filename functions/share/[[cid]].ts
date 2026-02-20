// Cloudflare Pages Function - 处理分享页面的动态路由
// 这个函数处理 /share/{cid} 路由，确保返回正确的页面

export async function onRequest(context: { 
  request: Request; 
  env: unknown;
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);

  // 获取 CID 从路径中
  const pathParts = url.pathname.split('/').filter(Boolean);
  const cid = pathParts[pathParts.length - 1];

  // 构建到 placeholder 页面的 URL
  const placeholderUrl = new URL('/share/placeholder/index.html', url.origin);
  
  try {
    // 获取 placeholder 页面
    const response = await fetch(placeholderUrl, {
      headers: request.headers,
    });
    
    if (!response.ok) {
      return new Response('Not Found', { status: 404 });
    }

    // 读取 HTML 内容
    let html = await response.text();
    
    // 注入 CID 到页面中，供客户端 JavaScript 使用
    html = html.replace(
      '</head>',
      `<script>window.__SHARE_CID__ = "${cid}";</script></head>`
    );

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving share page:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
