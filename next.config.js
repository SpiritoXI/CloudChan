/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  distDir: "dist",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // 在静态导出时排除 API 路由
  // 这些路由需要在 Cloudflare Pages Functions 中单独配置
};

module.exports = nextConfig;
