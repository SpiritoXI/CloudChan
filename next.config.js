/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? "export" : undefined,
  distDir: "dist",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // 禁用 webpack 持久化缓存
  webpack: (config, { isServer }) => {
    config.cache = false;
    return config;
  },
  // 跳过类型检查以解决构建问题
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
