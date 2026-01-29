import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

/**
 * 登录 API 路由
 * 验证用户 Access Token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access Token 不能为空' },
        { status: 400 }
      );
    }

    // 验证 Access Token
    const isValid = verifyAccessToken(accessToken);

    if (isValid) {
      return NextResponse.json({
        success: true,
        message: '登录成功',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Access Token 无效' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
