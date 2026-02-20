import type { ApiResponse, Env, Context } from "../../types";

const CRUST_UPLOAD_API = 'https://gw.crustfiles.app/api/v0/add?pin=true';
const CRUST_ORDER_API = 'https://gw.crustfiles.app/crust/api/v1/files';

async function verifyAuth(request: Request, env: Pick<Env, "ADMIN_PASSWORD">): Promise<boolean> {
  const authHeader = request.headers.get("x-auth-token");
  if (!authHeader) {
    return false;
  }
  return authHeader === env.ADMIN_PASSWORD;
}

export async function onRequestPost(context: Context): Promise<Response> {
  const { request, env } = context;

  if (!(await verifyAuth(request, env))) {
    return new Response(
      JSON.stringify({ success: false, error: "未授权" } as ApiResponse),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const crustToken = env.CRUST_TOKEN;
  if (!crustToken) {
    return new Response(
      JSON.stringify({ success: false, error: "CRUST_TOKEN未配置" } as ApiResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: "未找到上传文件" } as ApiResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const uploadResponse = await fetch(CRUST_UPLOAD_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${crustToken}`,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => '上传失败');
      return new Response(
        JSON.stringify({ success: false, error: `上传失败: ${errorText}` } as ApiResponse),
        { status: uploadResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const uploadResult = await uploadResponse.json();
    const cid = uploadResult.Hash || uploadResult.cid;
    const size = uploadResult.Size || file.size;

    const orderResponse = await fetch(`${CRUST_ORDER_API}/${cid}/order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${crustToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cid,
        size,
        months: 1200,
      }),
    });

    const orderCreated = orderResponse.ok;

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          cid, 
          size,
          hash: uploadResult.Hash,
          orderCreated 
        } 
      } as ApiResponse<{ cid: string; size: number; hash?: string; orderCreated: boolean }>),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "上传失败";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage } as ApiResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
