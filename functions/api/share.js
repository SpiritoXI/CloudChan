/**
 * CloudChan 分享 API
 * 用于创建和访问分享链接
 * @version 2.2.1
 */

export async function onRequest(context) {
    const { request, env } = context;

    // 辅助函数：JSON 响应
    function jsonResponse(body, init = {}) {
        const headers = new Headers(init.headers);
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        if (!headers.has('Cache-Control')) {
            headers.set('Cache-Control', 'no-store');
        }
        return new Response(JSON.stringify(body), { ...init, headers });
    }

    // 解析 URL 路径
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const shareIndex = pathParts.indexOf('share');

    if (shareIndex === -1) {
        return jsonResponse({ error: 'Invalid URL' }, { status: 400 });
    }

    // 获取分享 ID（如果存在）
    let shareId = null;
    if (shareIndex + 1 < pathParts.length) {
        shareId = pathParts[shareIndex + 1];
    }

    // 检查环境变量
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
        return jsonResponse({ error: '系统错误：环境变量未配置' }, { status: 500 });
    }

    try {
        // 处理不同的 HTTP 方法和路径
        if (request.method === 'POST' && !shareId) {
            // 创建分享链接
            return await createShareLink(request, env);
        } else if (request.method === 'GET' && shareId) {
            // 访问分享链接
            return await getShareInfo(shareId, env);
        } else if (request.method === 'DELETE' && shareId) {
            // 删除分享链接（需要认证）
            return await deleteShareLink(shareId, request, env);
        } else {
            return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
        }
    } catch (error) {
        console.error('Share API error:', error);
        return jsonResponse({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * 创建分享链接
 */
async function createShareLink(request, env) {
    try {
        const body = await request.json();
        const { fileId, duration } = body;

        if (!fileId) {
            return { error: '缺少文件 ID' };
        }

        if (!duration || duration < 1 || duration > 365) {
            return { error: '无效的分享时长' };
        }

        // 获取文件信息
        const fileResponse = await fetch(`${env.UPSTASH_REDIS_REST_URL}/GET/file:${fileId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`
            }
        });

        if (!fileResponse.ok) {
            return { error: '获取文件信息失败' };
        }

        const fileData = await fileResponse.json();
        if (!fileData.result) {
            return { error: '文件不存在' };
        }

        const file = JSON.parse(fileData.result);

        // 生成分享 ID
        const shareId = generateShareId();

        // 计算过期时间
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + duration);

        // 创建分享信息
        const shareInfo = {
            id: shareId,
            fileId: fileId,
            cid: file.cid,
            name: file.name,
            size: file.size,
            type: file.type,
            createdAt: new Date().toISOString(),
            expiry: expiry.toISOString()
        };

        // 保存分享信息
        const shareKey = `share:${shareId}`;
        const saveResponse = await fetch(`${env.UPSTASH_REDIS_REST_URL}/SET/${shareKey}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shareInfo)
        });

        if (!saveResponse.ok) {
            return { error: '保存分享信息失败' };
        }

        // 设置过期时间
        const ttl = duration * 24 * 60 * 60; // 转换为秒
        await fetch(`${env.UPSTASH_REDIS_REST_URL}/EXPIRE/${shareKey}/${ttl}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`
            }
        });

        // 返回分享链接
        const origin = new URL(request.url).origin;
        const shareUrl = `${origin}/share/${shareId}`;

        return {
            success: true,
            data: {
                shareId: shareId,
                shareUrl: shareUrl,
                expiry: expiry.toISOString()
            }
        };
    } catch (error) {
        console.error('创建分享链接失败:', error);
        return { error: '创建分享链接失败' };
    }
}

/**
 * 获取分享信息
 */
async function getShareInfo(shareId, env) {
    try {
        // 获取分享信息
        const response = await fetch(`${env.UPSTASH_REDIS_REST_URL}/GET/share:${shareId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`
            }
        });

        if (!response.ok) {
            return {
                success: false,
                error: '获取分享信息失败'
            };
        }

        const data = await response.json();

        if (!data.result) {
            return {
                success: false,
                error: '分享不存在'
            };
        }

        const shareInfo = JSON.parse(data.result);

        // 检查是否过期
        const now = new Date();
        const expiry = new Date(shareInfo.expiry);

        if (now > expiry) {
            // 删除过期的分享
            await fetch(`${env.UPSTASH_REDIS_REST_URL}/DEL/share:${shareId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`
                }
            });

            return {
                success: false,
                error: '分享已过期'
            };
        }

        // 返回分享信息
        return {
            success: true,
            data: {
                id: shareInfo.id,
                cid: shareInfo.cid,
                name: shareInfo.name,
                size: shareInfo.size,
                type: shareInfo.type,
                expiry: shareInfo.expiry
            }
        };
    } catch (error) {
        console.error('获取分享信息失败:', error);
        return {
            success: false,
            error: '获取分享信息失败'
        };
    }
}

/**
 * 删除分享链接
 */
async function deleteShareLink(shareId, request, env) {
    // 验证管理员密码
    const authHeader = request.headers.get('authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-admin-password');

    if (!authHeader || authHeader !== env.ADMIN_PASSWORD) {
        return { error: '未授权' };
    }

    try {
        // 删除分享信息
        const response = await fetch(`${env.UPSTASH_REDIS_REST_URL}/DEL/share:${shareId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`
            }
        });

        if (!response.ok) {
            return { error: '删除分享失败' };
        }

        return {
            success: true,
            message: '分享已删除'
        };
    } catch (error) {
        console.error('删除分享失败:', error);
        return { error: '删除分享失败' };
    }
}

/**
 * 生成分享 ID
 */
function generateShareId() {
    // 生成一个简短的、唯一的分享 ID
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}
