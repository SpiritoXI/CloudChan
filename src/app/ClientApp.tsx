'use client';

import { useEffect, useState } from 'react';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

export default function ClientApp() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // 检查 localStorage 中的认证状态
    const auth = localStorage.getItem('crustshare_auth') === 'true';
    setIsAuthenticated(auth);
  }, []);

  // 监听认证状态变化
  useEffect(() => {
    const checkAuth = () => {
      const auth = localStorage.getItem('crustshare_auth') === 'true';
      setIsAuthenticated(auth);
    };

    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  if (!isMounted) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Dashboard />;
}
