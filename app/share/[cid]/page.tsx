import SharePageClient from './SharePage';

// 为静态导出生成参数 - 返回空数组，依赖 dynamicParams 允许客户端路由
export function generateStaticParams() {
  return [];
}

// 允许访问未预生成的动态路由
export const dynamicParams = true;

export default function SharePage() {
  return <SharePageClient />;
}
