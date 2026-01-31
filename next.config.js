/** @type {import('next').NextConfig} */
const nextConfig = {
  // 不使用 static export，以支持 API routes
  // output: "export",
  distDir: "dist",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
