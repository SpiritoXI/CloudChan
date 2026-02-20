# 部署指南

本文档详细说明如何将 CrustShare 部署到各种平台，适合新手阅读。

## 目录

- [部署前准备](#部署前准备)
- [方式一：Cloudflare Pages 部署（推荐）](#方式一cloudflare-pages-部署推荐)
- [方式二：Vercel 部署](#方式二vercel-部署)
- [方式三：Docker 部署](#方式三docker-部署)
- [方式四：自托管服务器部署](#方式四自托管服务器部署)
- [环境变量配置详解](#环境变量配置详解)
- [自定义域名配置](#自定义域名配置)
- [故障排查](#故障排查)

---

## 部署前准备

在开始部署之前，请确保您已完成以下准备工作：

### 1. 获取 Crust Access Token（必需）

这是部署 CrustShare 的**必需条件**，没有它应用无法正常工作。

**步骤：**

1. 打开浏览器，访问 [https://crustfiles.io](https://crustfiles.io)

2. 点击页面右上角的 **"Connect Wallet"** 按钮

3. 选择您的钱包类型（推荐 MetaMask）：
   - 如果您还没有安装 MetaMask，请先从 [metamask.io](https://metamask.io) 安装浏览器扩展
   - 创建或导入钱包账户

4. 连接钱包后，点击 **"Create Developer Profile"** 创建开发者配置

5. 在开发者配置页面，您会看到 **Access Token**，点击复制按钮

6. **重要**：将 Access Token 安全保存，不要泄露给任何人！

> ⚠️ **安全警告**：Access Token 包含您的私钥信息，泄露可能导致他人访问您的文件。请勿提交到 GitHub 或其他公开平台！

### 2. Fork 项目到您的 GitHub 账户

1. 登录您的 GitHub 账户

2. 访问项目地址：[https://github.com/SpiritoXI/CrustShare](https://github.com/SpiritoXI/CrustShare)

3. 点击页面右上角的 **"Fork"** 按钮

4. 在弹出的页面中，点击 **"Create fork"** 确认

5. Fork 完成后，您将在自己的账户下看到 `CrustShare` 仓库

### 3. 准备可选服务（推荐但非必需）

#### Upstash Redis（用于数据持久化）

1. 访问 [https://upstash.com](https://upstash.com)
2. 注册并登录
3. 创建一个新的 Redis 数据库
4. 复制 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`

> 💡 **提示**：如果不配置 Redis，应用会使用内存存储，重启后数据会丢失。

---

## 方式一：Cloudflare Pages 部署（推荐）

Cloudflare Pages 提供免费的静态网站托管，配合 Cloudflare Functions 可以运行服务端代码，是部署 CrustShare 的最佳选择。

### 为什么选择 Cloudflare Pages？

- ✅ 完全免费
- ✅ 全球 CDN 加速
- ✅ 自动 HTTPS
- ✅ 支持自定义域名
- ✅ 支持 Serverless Functions

### 详细部署步骤

#### 第一步：登录 Cloudflare

1. 打开浏览器，访问 [https://dash.cloudflare.com](https://dash.cloudflare.com)

2. 如果没有账户，点击 **"Sign up"** 注册一个新账户

3. 登录后，您会看到 Cloudflare 控制面板

#### 第二步：创建 Pages 项目

1. 在左侧菜单中，找到并点击 **"Workers & Pages"**

2. 点击右上角的 **"Create application"** 按钮

3. 选择 **"Pages"** 标签页

4. 点击 **"Connect to Git"** 按钮

#### 第三步：连接 GitHub 仓库

1. 如果是首次使用，需要授权 Cloudflare 访问您的 GitHub：
   - 点击 **"Connect GitHub"**
   - 在弹出的授权页面，点击 **"Authorize Cloudflare Pages"**
   - 选择 **"Only select repositories"**
   - 勾选您 Fork 的 `CrustShare` 仓库
   - 点击 **"Install"** 完成授权

2. 返回 Cloudflare 页面，您应该能看到 `CrustShare` 仓库

3. 点击该仓库旁边的 **"Begin setup"** 按钮

#### 第四步：配置构建设置

在项目设置页面，填写以下信息：

| 设置项 | 填写内容 | 说明 |
|--------|----------|------|
| **Project name** | `crustshare` | 项目名称，会作为默认域名 |
| **Production branch** | `main` | 生产分支 |
| **Framework preset** | `Next.js` | 框架预设 |
| **Build command** | `pnpm build` | 构建命令 |
| **Build output directory** | `.next` | 输出目录 |

#### 第五步：配置环境变量（关键步骤）

1. 在同一页面，找到 **"Environment variables"** 部分

2. 点击 **"Add variable"** 添加以下变量：

   **变量 1（必需）：**
   - Variable name: `CRUST_ACCESS_TOKEN`
   - Value: 您之前复制的 Access Token
   - 选择 **"Encrypt"** 加密存储

   **变量 2（可选）：**
   - Variable name: `UPSTASH_REDIS_REST_URL`
   - Value: 您的 Upstash Redis URL

   **变量 3（可选）：**
   - Variable name: `UPSTASH_REDIS_REST_TOKEN`
   - Value: 您的 Upstash Redis Token

#### 第六步：开始部署

1. 确认所有设置正确后，点击 **"Save and Deploy"** 按钮

2. 等待构建完成（通常需要 2-5 分钟）

3. 构建过程中，您可以点击 **"View build log"** 查看详细日志

4. 看到 **"Success! Your site is live"** 表示部署成功

#### 第七步：访问您的应用

1. 部署成功后，点击 **"Continue to project"**

2. 在项目概览页面，您会看到一个类似 `crustshare.pages.dev` 的域名

3. 点击该域名即可访问您的 CrustShare 应用

### 后续更新部署

当您修改代码并推送到 GitHub 后，Cloudflare Pages 会自动重新部署：

```bash
# 在本地修改代码后
git add .
git commit -m "更新功能"
git push origin main

# Cloudflare Pages 会自动检测并重新部署
```

---

## 方式二：Vercel 部署

Vercel 是 Next.js 的官方托管平台，部署体验极佳。

### 一键部署（最简单）

1. 点击下方按钮：

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SpiritoXI/CrustShare)

2. 登录您的 Vercel 账户（可使用 GitHub 登录）

3. 在 **"Create a Git Repository"** 页面：
   - 选择 **"Create a private repository"**（推荐私有仓库）
   - 点击 **"Create"**

4. 等待项目创建和初始化

5. 在 **"Configure Project"** 页面：
   - 展开 **"Environment Variables"**
   - 添加 `CRUST_ACCESS_TOKEN` 变量
   - 点击 **"Deploy"**

6. 等待部署完成（约 2-3 分钟）

7. 点击 **"Go to Dashboard"** 查看您的应用

### 通过 CLI 部署

如果您更喜欢命令行操作：

```bash
# 第一步：安装 Vercel CLI
npm install -g vercel

# 第二步：登录 Vercel
vercel login
# 选择您的登录方式（GitHub 推荐）

# 第三步：克隆项目
git clone https://github.com/YOUR_USERNAME/CrustShare.git
cd CrustShare

# 第四步：安装依赖
pnpm install

# 第五步：配置环境变量
# 创建 .env.local 文件并添加 CRUST_ACCESS_TOKEN

# 第六步：部署到预览环境
vercel
# 按照提示操作，首次会询问项目名称等

# 第七步：部署到生产环境
vercel --prod
```

### 配置环境变量

部署后，您需要在 Vercel 控制台配置环境变量：

1. 进入项目 Dashboard

2. 点击 **"Settings"** 标签

3. 在左侧菜单点击 **"Environment Variables"**

4. 添加变量：
   - Name: `CRUST_ACCESS_TOKEN`
   - Value: 您的 Access Token
   - Environment: 选择 Production, Preview, Development

5. 点击 **"Save"**

6. 重新部署项目使环境变量生效：
   - 点击 **"Deployments"** 标签
   - 找到最新的部署
   - 点击右侧的 **"..."** 菜单
   - 选择 **"Redeploy"**

---

## 方式三：Docker 部署

适合有自己的服务器或熟悉 Docker 的用户。

### 前置要求

- 已安装 Docker（[安装教程](https://docs.docker.com/get-docker/)）
- 已安装 Docker Compose（可选，但推荐）

### 快速开始

#### 第一步：创建项目目录

```bash
# 创建目录
mkdir crustshare && cd crustshare

# 创建环境变量文件
cat > .env << 'EOF'
CRUST_ACCESS_TOKEN=your_access_token_here
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
EOF
```

#### 第二步：创建 Docker Compose 配置

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  crustshare:
    image: node:18-alpine
    working_dir: /app
    ports:
      - "3000:3000"
    environment:
      - CRUST_ACCESS_TOKEN=${CRUST_ACCESS_TOKEN}
      - UPSTASH_REDIS_REST_URL=${UPSTASH_REDIS_REST_URL}
      - UPSTASH_REDIS_REST_TOKEN=${UPSTASH_REDIS_REST_TOKEN}
      - NODE_ENV=production
    command: sh -c "
      npm install -g pnpm &&
      pnpm install --prod &&
      pnpm build &&
      pnpm start
    "
    volumes:
      - ./:/app
    restart: unless-stopped
```

#### 第三步：启动服务

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 使用预构建镜像

如果您想使用预构建的 Docker 镜像：

#### 第一步：创建 Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目
RUN pnpm build

# 运行阶段
FROM node:18-alpine AS runner

WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production

# 安装 pnpm
RUN npm install -g pnpm

# 复制构建产物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# 安装生产依赖
RUN pnpm install --prod

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["pnpm", "start"]
```

#### 第二步：构建和运行

```bash
# 构建镜像
docker build -t crustshare:latest .

# 运行容器
docker run -d \
  --name crustshare \
  -p 3000:3000 \
  -e CRUST_ACCESS_TOKEN=your_token_here \
  --restart unless-stopped \
  crustshare:latest

# 查看日志
docker logs -f crustshare

# 停止容器
docker stop crustshare

# 删除容器
docker rm crustshare
```

---

## 方式四：自托管服务器部署

适合有自己服务器（VPS）的用户。

### 服务器要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 1 核 | 2 核+ |
| 内存 | 1 GB | 2 GB+ |
| 存储 | 10 GB | 20 GB+ |
| 系统 | Ubuntu 20.04+ | Ubuntu 22.04 |

### 详细部署步骤

#### 第一步：连接服务器

```bash
# 使用 SSH 连接服务器
ssh root@your_server_ip

# 或使用用户名
ssh username@your_server_ip
```

#### 第二步：安装 Node.js

```bash
# 更新软件包列表
sudo apt update

# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version   # 应显示 v18.x.x
npm --version    # 应显示 9.x.x 或更高

# 安装 pnpm
npm install -g pnpm

# 验证 pnpm
pnpm --version
```

#### 第三步：安装 PM2（进程管理器）

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 验证安装
pm2 --version
```

#### 第四步：克隆项目

```bash
# 创建应用目录
sudo mkdir -p /var/www
cd /var/www

# 克隆项目
sudo git clone https://github.com/YOUR_USERNAME/CrustShare.git

# 进入项目目录
cd CrustShare

# 设置目录权限
sudo chown -R $USER:$USER /var/www/CrustShare
```

#### 第五步：配置环境变量

```bash
# 创建环境变量文件
nano .env.local
```

在编辑器中输入：

```env
CRUST_ACCESS_TOKEN=your_access_token_here
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

按 `Ctrl + O` 保存，按 `Ctrl + X` 退出。

#### 第六步：安装依赖并构建

```bash
# 安装依赖
pnpm install

# 构建项目
pnpm build
```

#### 第七步：使用 PM2 启动

```bash
# 启动应用
pm2 start pnpm --name "crustshare" -- start

# 查看应用状态
pm2 status

# 查看日志
pm2 logs crustshare

# 设置开机自启
pm2 startup
# 按照提示执行输出的命令

# 保存 PM2 配置
pm2 save
```

#### 第八步：配置 Nginx 反向代理

```bash
# 安装 Nginx
sudo apt install -y nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/crustshare
```

输入以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名或服务器 IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 上传文件大小限制（1GB）
        client_max_body_size 1024M;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/crustshare /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### 第九步：配置 HTTPS（推荐）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 按照提示输入邮箱并同意条款

# 测试自动续期
sudo certbot renew --dry-run
```

### 常用管理命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs crustshare

# 重启应用
pm2 restart crustshare

# 停止应用
pm2 stop crustshare

# 更新代码后重新部署
cd /var/www/CrustShare
git pull
pnpm install
pnpm build
pm2 restart crustshare
```

---

## 环境变量配置详解

### 必需变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `CRUST_ACCESS_TOKEN` | Crust 访问令牌，用于上传文件到 IPFS | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

### 可选变量

| 变量名 | 说明 | 默认值 | 示例值 |
|--------|------|--------|--------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST API 地址 | - | `https://us1-xxxxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis 访问令牌 | - | `AXXXXX...` |
| `NEXT_PUBLIC_APP_URL` | 应用公开访问地址 | 自动检测 | `https://crustshare.example.com` |
| `NEXT_PUBLIC_APP_NAME` | 应用名称 | `CrustShare` | `我的文件分享站` |

### 变量作用说明

```
┌─────────────────────────────────────────────────────────────┐
│                      环境变量作用图                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CRUST_ACCESS_TOKEN (必需)                                  │
│  │                                                          │
│  ├── 上传文件到 IPFS                                        │
│  ├── 创建存储订单                                           │
│  └── 访问 Crust 网络资源                                    │
│                                                             │
│  UPSTASH_REDIS_REST_URL / TOKEN (可选)                      │
│  │                                                          │
│  ├── 存储文件元数据                                         │
│  ├── 存储文件夹结构                                         │
│  ├── 存储分享链接信息                                       │
│  └── 缓存网关健康状态                                       │
│                                                             │
│  如果不配置 Redis：                                          │
│  └── 使用内存存储（重启后数据丢失）                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 自定义域名配置

### Cloudflare Pages 配置自定义域名

1. 进入您的 Cloudflare Pages 项目

2. 点击 **"Settings"** > **"Custom domains"**

3. 点击 **"Set up a custom domain"**

4. 输入您的域名（如 `share.yourdomain.com`）

5. 点击 **"Activate domain"**

6. 按照提示在您的域名 DNS 设置中添加 CNAME 记录：
   - 名称: `share`
   - 目标: `crustshare.pages.dev`

7. 等待 DNS 生效（通常几分钟到几小时）

### Vercel 配置自定义域名

1. 进入您的 Vercel 项目

2. 点击 **"Settings"** > **"Domains"**

3. 输入您的域名并点击 **"Add"**

4. 按照提示配置 DNS 记录：
   - 如果使用子域名（如 `share.yourdomain.com`）：添加 CNAME 记录
   - 如果使用根域名：添加 A 记录

5. 等待 SSL 证书自动配置完成

---

## 故障排查

### 问题 1：部署后页面显示 500 错误

**可能原因**：环境变量未配置或配置错误

**解决步骤**：

```bash
# 检查环境变量是否正确设置
# Cloudflare Pages: Settings > Environment variables
# Vercel: Settings > Environment Variables

# 确认 CRUST_ACCESS_TOKEN 已添加且值正确
```

### 问题 2：文件上传失败

**可能原因**：Access Token 无效或过期

**解决步骤**：

1. 访问 [crustfiles.io](https://crustfiles.io)
2. 检查 Developer Profile 状态
3. 如果需要，重新生成 Access Token
4. 更新部署平台的环境变量
5. 重新部署应用

### 问题 3：文件大小超过限制

**说明**：CrustShare 支持最大 1GB 的文件上传

**解决步骤**：

- 确保文件大小不超过 1GB
- 如果使用 Nginx 反向代理，确保 `client_max_body_size` 设置正确
- 检查网络稳定性，大文件上传需要较长时间

### 问题 4：数据丢失

**可能原因**：未配置 Redis，使用内存存储

**解决步骤**：

1. 注册 Upstash 账户并创建 Redis 数据库
2. 获取 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`
3. 在部署平台添加这两个环境变量
4. 重新部署应用

### 问题 5：构建失败

**可能原因**：依赖安装失败或 Node.js 版本不兼容

**解决步骤**：

```bash
# 检查 Node.js 版本（需要 18+）
node --version

# 清除缓存重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 重新构建
pnpm build
```

### 问题 6：自定义域名无法访问

**可能原因**：DNS 未生效或配置错误

**解决步骤**：

```bash
# 检查 DNS 解析
nslookup share.yourdomain.com

# 或使用 dig
dig share.yourdomain.com

# 确认 DNS 记录类型和值正确
```

### 问题 7：网关测试失败

**可能原因**：网络问题或网关暂时不可用

**解决步骤**：

1. 检查网络连接
2. 尝试刷新网关列表
3. 使用默认网关列表
4. 检查防火墙设置

### 获取帮助

如果以上方法都无法解决问题：

1. 查看应用日志：
   - Cloudflare Pages: Deployments > 点击部署 > View build log
   - Vercel: Deployments > 点击部署 > Runtime Logs
   - Docker: `docker logs crustshare`
   - PM2: `pm2 logs crustshare`

2. 在 GitHub 提交 Issue：[https://github.com/SpiritoXI/CrustShare/issues](https://github.com/SpiritoXI/CrustShare/issues)

---

## 相关链接

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Vercel 文档](https://vercel.com/docs)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Docker 文档](https://docs.docker.com/)
- [PM2 文档](https://pm2.keymetrics.io/)
- [Crust Network 文档](https://wiki.crust.network/)
