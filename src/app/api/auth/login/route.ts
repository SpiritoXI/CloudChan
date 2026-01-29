import { NextRequest, NextResponse } from 'next/server';
import { verifyPinCode } from '@/lib/auth';

/**
 * 登录 API 路由
 * 验证用户 PIN 码
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      console.error('[Login API] 请求体中缺少 pin 参数');
      return NextResponse.json(
        { success: false, error: 'PIN 码不能为空' },
        { status: 400 }
      );
    }

    console.log(`[Login API] 收到登录请求，PIN 码长度: ${pin.length}`);

    // 验证 PIN 码
    const isValid = verifyPinCode(pin);

    if (isValid) {
      console.log('[Login API] 登录成功');
      return NextResponse.json({
        success: true,
        message: '登录成功',
      });
    } else {
      console.error('[Login API] PIN 码验证失败');
      return NextResponse.json(
        { success: false, error: 'PIN 码错误，请重试' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('[Login API] 服务器错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
