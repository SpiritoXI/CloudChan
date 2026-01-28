import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import ClientApp from './ClientApp';

export const metadata: Metadata = {
  title: 'CrustShare - 安全的分布式文件存储平台',
  description: '基于 IPFS 和 Crust Network 的去中心化文件存储解决方案',
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <ClientApp />
      <Toaster position="top-right" />
    </main>
  );
}
