'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Key } from 'lucide-react';
import useStore from '@/store/useStore';
import { toast } from 'sonner';

// 默认 Access Token（开发环境）
const DEFAULT_TOKEN = 'default-token-for-development-only';

export default function LoginPage() {
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const setIsAuthenticated = useStore((state) => state.setIsAuthenticated);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 调用登录 API 进行验证
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('crustshare_auth', 'true');
        toast.success('登录成功');
      } else {
        toast.error(data.error || 'Access Token 无效，请重试');
        setAccessToken('');
      }
    } catch (error) {
      console.error('登录错误:', error);
      toast.error('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(DEFAULT_TOKEN);
    toast.success('已复制默认 Token 到剪贴板');
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0icmdiYSg5OSwgMTAyLCAyNDEsIDAuMDUpIi8+PC9zdmc+')] opacity-20" />

      <Card className="relative w-full max-w-md crystal-card crystal-dialog">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/70 to-pink-500/70 text-white shadow-lg">
            <Key className="h-8 w-8" />
          </div>
          <CardTitle className="bg-gradient-to-r from-purple-600/80 to-pink-600/80 bg-clip-text text-2xl font-bold text-transparent">
            CrustShare
          </CardTitle>
          <CardDescription className="text-base">
            安全的分布式文件存储平台
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder="请输入 Access Token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="crystal-input h-12 text-base pr-24"
                  autoFocus
                />
                <Lock className="absolute right-12 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="crystal-button w-full h-12 text-base font-medium text-white"
              disabled={isLoading || !accessToken}
            >
              {isLoading ? '验证中...' : '登录'}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm text-muted-foreground">
            <p>请输入正确的 Access Token 以继续访问</p>

            <div className="rounded-lg bg-purple-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs">开发默认 Token:</span>
                <code className="flex-1 text-xs bg-white/60 px-2 py-1 rounded truncate">
                  {showToken ? DEFAULT_TOKEN : '••••••••••••••••••••••••••••'}
                </code>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyToken}
                className="h-7 text-xs w-full"
              >
                复制默认 Token
              </Button>
            </div>

            <p className="text-xs">
              生产环境请在环境变量中配置 <code className="bg-purple-50/60 px-2 py-1 rounded">ACCESS_TOKEN</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
