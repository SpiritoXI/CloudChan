# 部署指南

本文档说明如何将 CrustShare 部署到各种平台。

## 目录

- [环境变量配置](#环境变量配置)
- [Cloudflare Pages 部署](#cloudflare-pages-部署)
- [Vercel 部署](#vercel-部署)
- [Docker 部署](#docker-部署)
- [自托管部署](#自托管部署)

---

## 环境变量配置

### 必需变量

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `CRUST_ACCESS_TOKEN` | Crust Access Token | 从 [crustfiles.io](https://crustfiles.io) 获取 |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | - |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis Token | - |

### 获取 Access Token

1. 访问 [crustfiles.io](https://crustfiles.io)
2. 点击 "Connect Wallet" 连接钱包
3. 创建 Developer Profile
4. 复制 Access Token

> ⚠️ **安全提示**：Access Token 包含私钥，请勿泄露或提交到公开仓库！

---

## Cloudflare Pages 部署

### 方法一：通过 Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** > **Create a project**
3. 连接 GitHub 仓库
4. 配置构建设置：
   - **Framework preset**: Next.js
   - **Build command**: `pnpm build`
   - **Build output directory**: `.next`
5. 添加环境变量
6. 点击 **Save and Deploy**

### 方法二：通过 Wrangler CLI

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 构建项目
pnpm build

# 部署
wrangler pages deploy .next --project-name=crustshare
```

---

## Vercel 部署

### 方法一：一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SpiritoXI/CrustShare)

### 方法二：通过 CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

### 环境变量配置

1. 进入项目 Dashboard
2. 点击 **Settings** > **Environment Variables**
3. 添加 `CRUST_ACCESS_TOKEN`

---

## Docker 部署

### 使用 Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

RUN npm install -g pnpm && pnpm install --prod

EXPOSE 3000
CMD ["pnpm", "start"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t crustshare .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e CRUST_ACCESS_TOKEN=your_token \
  --name crustshare \
  crustshare
```

### 使用 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  crustshare:
    build: .
    ports:
      - "3000:3000"
    environment:
      - CRUST_ACCESS_TOKEN=${CRUST_ACCESS_TOKEN}
      - UPSTASH_REDIS_REST_URL=${UPSTASH_REDIS_REST_URL}
      - UPSTASH_REDIS_REST_TOKEN=${UPSTASH_REDIS_REST_TOKEN}
    restart: unless-stopped
```

```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

---

## 自托管部署

### 前置要求

- Node.js 18+
- pnpm 或 npm
- PM2（推荐用于进程管理）

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/SpiritoXI/CrustShare.git
cd CrustShare

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local

# 构建
pnpm build

# 使用 PM2 启动
pm2 start pnpm --name "crustshare" -- start
pm2 save
pm2 startup
```

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 故障排查

### 常见问题

**1. 上传失败**

- 检查 `CRUST_ACCESS_TOKEN` 是否正确
- 检查网络连接
- 查看控制台错误信息

**2. 环境变量未生效**

- 确保变量名正确
- 重新部署应用
- 清除构建缓存

**3. Redis 连接失败**

- 检查 Upstash Redis 配置
- 应用会自动降级到内存模式

---

## 相关链接

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Vercel 文档](https://vercel.com/docs)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
