'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Shield } from 'lucide-react';
import useStore from '@/store/useStore';
import { toast } from 'sonner';

const CORRECT_PASSWORD = 'crustshare'; // 简单密码，生产环境应该使用更安全的方式

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setIsAuthenticated = useStore((state) => state.setIsAuthenticated);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 模拟验证过程
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('crustshare_auth', 'true');
      toast.success('登录成功');
    } else {
      toast.error('密码错误，请重试');
      setPassword('');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">CrustShare</CardTitle>
          <CardDescription className="text-base">
            安全的分布式文件存储平台
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="password"
                  placeholder="请输入访问密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-base pr-12"
                  autoFocus
                />
                <Shield className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isLoading || !password}
            >
              {isLoading ? '验证中...' : '登录'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>请输入正确的密码以继续访问</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
