# 部署文档

本文档详细介绍 CrustShare 的各种部署方式。

## 目录

- [前置要求](#前置要求)
- [本地开发](#本地开发)
- [Coze CLI 部署](#coze-cli-部署)
- [Docker 部署](#docker-部署)
- [Vercel 部署](#vercel-部署)
- [云服务器部署](#云服务器部署)
- [环境变量配置](#环境变量配置)
- [常见问题](#常见问题)

---

## 前置要求

### 必需

- Node.js 24.0 或更高版本
- pnpm 包管理器

### 可选

- Docker 和 Docker Compose
- Git

---

## 本地开发

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/crustshare.git
cd crustshare
```

### 2. 安装依赖

```bash
pnpm install
```

### 2.5. 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 使用脚本生成配置
node scripts/generate-config.js
```

编辑 `.env` 文件，配置必要的变量：

```env
# Upstash Redis 配置（可选，用于生产环境）
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# 密码配置（必须）
PASSWORD_HASH=your_password_hash
ADMIN_PASSWORD_HASH=your_admin_password_hash

# JWT 配置（必须）
CRUST_JWT_SECRET=your_jwt_secret
```

### 3. 启动开发服务器

```bash
pnpm dev
```

开发服务器将在 http://localhost:5000 启动。

### 4. 热更新

代码修改后会自动热更新，无需重启。

---

## Coze CLI 部署

Coze CLI 是推荐的部署方式，提供最佳的集成体验。

### 1. 安装 Coze CLI

Coze CLI 已内置在沙箱环境中，无需额外安装。

### 2. 构建项目

```bash
pnpm build
```

### 3. 启动生产服务器

```bash
pnpm start
```

服务将在 http://localhost:5000 运行。

### 4. .coze 配置文件

项目根目录的 `.coze` 文件定义了构建和运行方式：

```toml
[project]
entrypoint = "index.html"
requires = ["nodejs-24"]

[dev]
build = ["pnpm", "install"]
run = ["pnpm", "dev"]

[deploy]
build = ["bash", "-c", "pnpm install && pnpm run build"]
run = ["pnpm", "run", "start"]
```

**注意**：不要手动修改 `.coze` 文件，由 CLI 自动管理。

---

## Docker 部署

### 1. 创建 Dockerfile

```dockerfile
FROM node:24-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制项目文件
COPY . .

# 构建项目
RUN pnpm build

# 暴露端口
EXPOSE 5000

# 启动应用
CMD ["pnpm", "start"]
```

### 2. 构建 Docker 镜像

```bash
docker build -t crustshare:latest .
```

### 3. 运行容器

```bash
docker run -d \
  -p 5000:5000 \
  --name crustshare \
  crustshare:latest
```

### 4. 使用 Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  crustshare:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

启动：

```bash
docker-compose up -d
```

---

## Vercel 部署

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. 在 Vercel 中导入项目

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New Project"
3. 选择你的 GitHub 仓库
4. 配置项目设置：
   - Framework Preset: Next.js
   - Build Command: `pnpm build`
   - Output Directory: `.next`

### 3. 配置环境变量

在 Vercel 项目设置中添加环境变量（如需要）。

### 4. 部署

点击 "Deploy" 按钮开始部署。

---

## 云服务器部署

### 1. 准备服务器

推荐配置：
- CPU: 2 核心以上
- 内存: 2GB 以上
- 磁盘: 20GB 以上
- 操作系统: Ubuntu 20.04+ / CentOS 7+

### 2. 安装 Node.js

```bash
# 使用 nvm 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
```

### 3. 安装 pnpm

```bash
npm install -g pnpm
```

### 4. 克隆项目

```bash
git clone https://github.com/your-username/crustshare.git
cd crustshare
```

### 5. 安装依赖并构建

```bash
pnpm install
pnpm build
```

### 6. 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "crustshare" -- start

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

### 7. 配置 Nginx 反向代理

创建 Nginx 配置文件 `/etc/nginx/sites-available/crustshare`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/crustshare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. 配置 SSL（可选）

使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 环境变量配置

### 必需的环境变量

在部署前，必须配置以下环境变量：

```env
# Upstash Redis 配置（推荐生产环境）
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# 密码配置（必须 - SHA-256 哈希值）
PASSWORD_HASH=5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
ADMIN_PASSWORD_HASH=8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918

# JWT 配置（必须）
CRUST_JWT_SECRET=your-jwt-secret-key-here
```

### 可选的环境变量

```env
# 应用配置
NEXT_PUBLIC_APP_NAME=CrustShare
NEXT_PUBLIC_APP_URL=https://your-domain.com

# 环境模式
NODE_ENV=production
```

### 生成配置

使用提供的脚本快速生成配置：

```bash
node scripts/generate-config.js
```

脚本将引导你：
1. 输入用户和管理员密码
2. 自动生成 SHA-256 哈希值
3. 生成随机 JWT 密钥

### Upstash Redis 配置

Upstash Redis 用于：
- 会话管理
- 文件元数据持久化
- 缓存管理

**获取 Redis 配置**：

1. 访问 [Upstash Console](https://console.upstash.com/)
2. 创建新的 Redis 数据库
3. 复制 REST URL 和 Token

**注意**：如果未配置 Upstash Redis，应用将使用 localStorage（仅适用于开发/单用户场景）。

### 重要说明

- `.env` 文件不会提交到 Git（已在 `.gitignore` 中）
- 生产环境应该通过云平台的环境变量配置
- API 密钥、密码哈希等敏感信息必须通过环境变量管理
- 定期轮换 JWT 密钥和密码

---

## 常见问题

### Q1: 端口 5000 被占用怎么办？

修改 `.coze` 文件中的端口配置，或使用环境变量：

```bash
PORT=3000 pnpm dev
```

### Q2: 构建失败怎么办？

检查以下几点：

1. Node.js 版本是否为 24+
2. 依赖是否完整安装：`pnpm install`
3. TypeScript 类型错误：`pnpm tsc --noEmit`
4. 清理缓存：`rm -rf .next node_modules && pnpm install`

### Q3: 如何查看日志？

开发环境：

```bash
# 日志输出在控制台
pnpm dev
```

生产环境：

```bash
# PM2 日志
pm2 logs crustshare

# 系统日志
tail -f /var/log/crustshare/app.log
```

### Q4: 如何更新项目？

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
pnpm install

# 重新构建
pnpm build

# 重启服务（使用 PM2）
pm2 restart crustshare
```

### Q5: 如何备份数据？

CrustShare 使用 localStorage 存储数据：

1. 浏览器导出 localStorage
2. 或定期导出用户的浏览器数据
3. 建议实现后端数据库以支持数据备份

---

## 性能优化

### 1. 启用 CDN

- 静态资源通过 CDN 分发
- 减少加载时间

### 2. 启用缓存

```bash
# .coze 文件中配置缓存策略
[deploy]
build = ["bash", "-c", "pnpm install && pnpm run build"]
run = ["pnpm", "run", "start"]
cache = ["node_modules", ".next"]
```

### 3. 压缩资源

```bash
# 启用 gzip 压缩
npm install compression
```

---

## 监控和日志

### 1. 健康检查

```bash
curl http://localhost:5000
```

### 2. 性能监控

集成监控工具：
- Vercel Analytics（Vercel 部署）
- PM2 Plus（服务器部署）

### 3. 错误跟踪

推荐集成：
- Sentry
- LogRocket

---

## 故障排除

### 问题 1：服务启动失败

**症状**：运行 `pnpm start` 或 `coze dev` 时服务无法启动

**可能原因**：
1. 端口被占用
2. 依赖未安装
3. 环境变量配置错误

**解决方案**：

```bash
# 检查端口占用
ss -tuln | grep :5000

# 终止占用进程
kill -9 $(lsof -ti:5000)

# 重新安装依赖
rm -rf node_modules .next
pnpm install

# 检查环境变量
cat .env
```

### 问题 2：登录失败

**症状**：输入正确密码但登录失败

**可能原因**：
1. 密码哈希不匹配
2. 环境变量未加载
3. 前端缓存问题

**解决方案**：

```bash
# 重新生成密码哈希
echo -n "your_password" | sha256sum

# 更新 .env 文件
# PASSWORD_HASH=<新的哈希值>

# 重启服务
pnpm dev

# 清除浏览器缓存和 localStorage
```

### 问题 3：文件上传失败

**症状**：文件上传卡住或报错

**可能原因**：
1. 网络连接问题
2. 文件过大
3. Crust Network 服务异常

**解决方案**：

```bash
# 检查网络连接
ping ipfs.io

# 测试 IPFS 网关
curl https://ipfs.io/ipfs/QmQqzMTavQgT4f4T5v6P7p6yv9N3Z1v6M7v8N9v8Q9zR

# 检查浏览器控制台错误
# F12 打开开发者工具
```

### 问题 4：构建失败

**症状**：运行 `pnpm build` 时出现错误

**可能原因**：
1. TypeScript 类型错误
2. 依赖版本冲突
3. 缓存损坏

**解决方案**：

```bash
# 检查 TypeScript 类型
pnpm tsc --noEmit

# 清理缓存
rm -rf .next node_modules

# 重新安装依赖
pnpm install

# 重新构建
pnpm build
```

### 问题 5：页面样式错乱

**症状**：页面显示异常，样式未加载

**可能原因**：
1. Tailwind CSS 配置问题
2. 静态资源路径错误
3. 浏览器缓存

**解决方案**：

```bash
# 检查 Tailwind 配置
cat tailwind.config.ts

# 清除 .next 缓存
rm -rf .next

# 强制刷新浏览器
Ctrl + Shift + R
```

### 问题 6：会话丢失

**症状**：频繁需要重新登录

**可能原因**：
1. localStorage 被清除
2. 会话过期
3. 浏览器隐私设置

**解决方案**：

```bash
# 检查 localStorage
# F12 打开开发者工具
# Application -> Local Storage

# 配置 Upstash Redis
# 在 .env 中添加：
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# 重启服务
pnpm dev
```

### 问题 7：API 请求失败

**症状**：API 调用返回 500 或超时

**可能原因**：
1. 服务器错误
2. 网络问题
3. API 路由配置错误

**解决方案**：

```bash
# 检查服务器日志
tail -n 20 /app/work/logs/bypass/app.log

# 测试 API
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"crustshare","isAdmin":false}'

# 检查 API 路由
ls -la src/app/api/
```

### 问题 8：内存溢出

**症状**：服务运行一段时间后崩溃

**可能原因**：
1. 内存泄漏
2. 文件缓存过大
3. 并发请求过多

**解决方案**：

```bash
# 使用 PM2 增加内存限制
pm2 start npm --name "crustshare" -- start --max-memory-restart 1G

# 清理缓存
rm -rf .next/cache

# 优化文件上传大小限制
# 在 next.config.js 中配置：
{
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}
```

---

## 安全建议

1. **HTTPS** - 生产环境必须使用 HTTPS
2. **API 密钥** - 通过环境变量管理，不要硬编码
3. **依赖更新** - 定期更新依赖包
4. **CORS** - 配置合理的 CORS 策略
5. **速率限制** - 防止 API 滥用

---

## 支持

如有问题，请：

- 提交 [GitHub Issue](../../issues)
- 查看 [README](README.md)
- 联系技术支持

---

最后更新：2025-01-29
