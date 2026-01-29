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

### .env.local

在项目根目录创建 `.env.local` 文件：

```bash
# Crust Network API（可选）
CRUST_API_KEY=your_api_key
CRUST_API_ENDPOINT=https://api.crust.network

# 应用配置
NEXT_PUBLIC_APP_NAME=CrustShare
NEXT_PUBLIC_APP_URL=https://your-domain.com

# 环境模式
NODE_ENV=production
```

### 重要说明

- `.env.local` 文件不会提交到 Git
- 生产环境应该通过云平台的环境变量配置
- API 密钥等敏感信息必须通过环境变量管理

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
