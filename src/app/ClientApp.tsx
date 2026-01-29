'use client';

import { useEffect, useState } from 'react';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';
import useStore from '@/store/useStore';

export default function ClientApp() {
  const [isMounted, setIsMounted] = useState(false);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const setIsAuthenticated = useStore((state) => state.setIsAuthenticated);

  useEffect(() => {
    setIsMounted(true);

    // 初始化时检查 localStorage 中的认证状态
    const auth = localStorage.getItem('crustshare_auth') === 'true';
    setIsAuthenticated(auth);
  }, [setIsAuthenticated]);

  if (!isMounted) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Dashboard />;
}
