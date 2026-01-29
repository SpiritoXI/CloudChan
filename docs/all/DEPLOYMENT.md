# 部署文档

本文档详细介绍 CrustShare 的各种部署方式和配置指南。

## 目录

- [项目概述](#项目概述)
- [前置要求](#前置要求)
- [本地开发](#本地开发)
- [Vercel 部署（推荐）](#vercel-部署-推荐)
- [Docker 部署](#docker-部署)
- [云服务器部署](#云服务器部署)
- [Windows 环境部署](#windows-环境部署)
- [环境变量配置](#环境变量配置)
- [网关配置](#网关配置)
- [直连上传配置](#直连上传配置)
- [常见问题](#常见问题)
- [故障排除](#故障排除)

---

## 项目概述

CrustShare 是一个基于 Crust Network 和 IPFS 的去中心化文件存储平台，提供以下核心功能：

- **直连上传**：直接连接 CrustFiles.io，支持最大 1GB 文件上传
- **多网关智能调度**：国内网络优先使用 `https://gw.w3ipfs.org.cn`
- **文件夹管理**：支持文件夹层级和嵌套结构
- **标签系统**：灵活的文件标签分类和管理
- **版本控制**：文件版本历史记录和旧版本恢复
- **响应式设计**：完美适配桌面和移动设备

---

## 前置要求

### 必需

- Node.js 24.0 或更高版本
- pnpm 包管理器

### 可选

- Docker 和 Docker Compose
- Git
- 云服务器（用于生产部署）

---

## 本地开发

### 1. 克隆仓库

```bash
git clone https://github.com/SpiritoXI/crustshare.git
cd crustshare
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量（可选）

```bash
# 复制示例配置
cp .env.example .env
```

编辑 `.env` 文件，配置必要的变量（详见 [环境变量配置](#环境变量配置)）。

### 4. 启动开发服务器

```bash
pnpm dev
```

开发服务器将在 http://localhost:3000 启动。

### 5. 热更新

代码修改后会自动热更新，无需重启。

---

## Vercel 部署（推荐）

Vercel 是推荐的部署方式，提供最佳的集成体验和性能。

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

在 Vercel 项目设置中添加环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PIN_CODE` | `123456` | 登录 PIN 码（默认：123456） |
| `NODE_ENV` | `production` | 环境模式 |

### 4. 部署

点击 "Deploy" 按钮开始部署。部署完成后，Vercel 会提供访问 URL。

### 5. 配置域名（可选）

1. 在 Vercel 项目设置中添加自定义域名
2. 按照 Vercel 的指引配置 DNS 记录
3. 等待 DNS 生效后，启用 HTTPS

---

## Docker 部署

### 1. 创建 Dockerfile

在项目根目录创建 `Dockerfile`：

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
EXPOSE 3000

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
  -p 3000:3000 \
  --name crustshare \
  -e PIN_CODE=123456 \
  -e NODE_ENV=production \
  crustshare:latest
```

### 4. 使用 Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  crustshare:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PIN_CODE=123456
      - NODE_ENV=production
    restart: unless-stopped
```

启动：

```bash
docker-compose up -d
```

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
git clone https://github.com/SpiritoXI/crustshare.git
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
pm start

# 保存 PM2 配置
pm run start

# 设置开机自启
npm run start
```

### 7. 配置 Nginx 反向代理

创建 Nginx 配置文件 `/etc/nginx/sites-available/crustshare`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

## Windows 环境部署

### 1. 安装 Node.js

从 [Node.js 官网](https://nodejs.org/) 下载并安装 Node.js 24.0 或更高版本。

### 2. 安装 pnpm

```powershell
npm install -g pnpm
```

### 3. 克隆项目

使用 Git Bash 或 PowerShell 克隆项目：

```powershell
git clone https://github.com/SpiritoXI/crustshare.git
cd crustshare
```

### 4. 安装依赖

```powershell
pnpm install
```

### 5. 构建和启动

```powershell
# 构建项目
pnpm build

# 启动生产服务器
pnpm start
```

服务将在 http://localhost:3000 运行。

### 6. 注意事项

- Windows 环境下使用 `pnpm dev` 和 `pnpm build` 命令
- 避免使用 bash 脚本，直接使用 npm 命令

---

## 环境变量配置

### 必需的环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PIN_CODE` | `123456` | 登录 PIN 码，建议修改为自定义值 |

### 可选的环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `development` | 环境模式，生产环境设置为 `production` |
| `CRUSTFILES_ACCESS_TOKEN` | - | CrustFiles.io Access Token（用于代理模式） |
| `CRUSTFILES_BASE_URL` | `https://crustfiles.io` | CrustFiles 基础 URL |
| `UPSTASH_REDIS_REST_URL` | - | Upstash Redis REST URL（用于生产环境会话管理） |
| `UPSTASH_REDIS_REST_TOKEN` | - | Upstash Redis REST Token |

### 配置示例

```env
# PIN 码配置（用于用户认证）
PIN_CODE=123456

# CrustFiles.io 配置（可选，用于代理模式）
CRUSTFILES_ACCESS_TOKEN=your_crustfiles_access_token_here
CRUSTFILES_BASE_URL=https://crustfiles.io

# Upstash Redis 配置（可选，用于生产环境会话管理）
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# 环境模式
NODE_ENV=production
```

---

## 网关配置

### 网关优先级

CrustShare 使用以下网关优先级顺序：

1. **主用链路（国内优选）**：`https://gw.w3ipfs.org.cn`
2. **备用链路 1（官方主推）**：`https://gw.crustfiles.app`
3. **备用链路 2（开发者/海外兜底）**：`https://crustipfs.xyz`

### 自动故障切换

- 当当前网关上传失败时，自动尝试下一个网关
- 确保国内网络环境下的稳定上传
- 下载时自动选择响应速度最快的网关

---

## 直连上传配置

### 核心特性

- **上传接口**：`/api/v0/add`（CrustFiles 原生上传接口）
- **文件大小限制**：最大 1GB
- **认证方式**：使用 CrustFiles.io Access Token
- **网络优化**：国内优先使用 `https://gw.w3ipfs.org.cn`

### 配置步骤

1. **获取 Access Token**：
   - 访问 [CrustFiles.io](https://crustfiles.io/)
   - 注册或登录账户
   - 在用户设置中找到 API Access Token
   - 复制 Token

2. **配置 Access Token**：
   - 启动应用后，点击右上角的设置图标（⚙️）
   - 点击"配置 Access Token"
   - 粘贴你的 CrustFiles.io Access Token
   - 点击保存

3. **开始上传**：
   - 点击"上传文件"按钮或拖拽文件到上传区域
   - 系统会自动选择最优网关
   - 显示上传进度
   - 上传完成后生成 CID 并保存文件信息

---

## 常见问题

### Q1: 端口 3000 被占用怎么办？

使用环境变量修改端口：

```bash
PORT=8080 pnpm dev
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

生产环境（PM2）：

```bash
# PM2 日志
npm logs crustshare
```

### Q4: 如何更新项目？

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
pnpm install

# 重新构建
pnpm build

# 重启服务
pnpm start
```

### Q5: 文件上传失败怎么办？

检查以下几点：

1. **Access Token**：确保已配置有效的 CrustFiles.io Access Token
2. **文件大小**：确保文件不超过 1GB
3. **网络连接**：检查网络连接是否正常
4. **网关状态**：尝试刷新页面或重新上传

### Q6: Vercel 环境变量无法生效怎么办？

1. 确保已在 Vercel 项目设置中正确配置环境变量
2. 重新部署项目使环境变量生效
3. 检查环境变量名称是否正确
4. 尝试在构建命令中添加 `--force` 参数

---

## 故障排除

### 问题 1：服务启动失败

**症状**：运行 `pnpm start` 时服务无法启动

**可能原因**：
1. 端口被占用
2. 依赖未安装
3. 环境变量配置错误

**解决方案**：

```bash
# 检查端口占用
ss -tuln | grep :3000

# 终止占用进程
kill -9 $(lsof -ti:3000)

# 重新安装依赖
rm -rf node_modules .next
pnpm install

# 检查环境变量
cat .env
```

### 问题 2：登录失败

**症状**：输入正确 PIN 码但登录失败

**可能原因**：
1. PIN 码错误
2. 环境变量未加载
3. 前端缓存问题

**解决方案**：

```bash
# 检查 PIN_CODE 环境变量
echo $PIN_CODE

# 重启服务
pnpm dev

# 清除浏览器缓存和 localStorage
# F12 打开开发者工具 -> Application -> Local Storage -> 清除
```

### 问题 3：文件上传失败

**症状**：文件上传卡住或报错

**可能原因**：
1. Access Token 无效
2. 文件过大
3. 网络连接问题
4. 网关服务异常

**解决方案**：

1. 检查 Access Token 是否有效
2. 确保文件不超过 1GB
3. 检查网络连接
4. 尝试使用不同的浏览器
5. 查看浏览器控制台错误信息

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
# 清除 .next 缓存
rm -rf .next

# 强制刷新浏览器
Ctrl + Shift + R
```

---

## 性能优化

### 1. 启用 CDN

- 静态资源通过 CDN 分发
- 减少加载时间
- 提高全球访问速度

### 2. 启用缓存

Vercel 部署会自动启用智能缓存策略，无需额外配置。

### 3. 优化网关选择

- 系统会自动选择最优网关
- 国内用户优先使用 `https://gw.w3ipfs.org.cn`
- 网关故障时自动切换

---

## 安全建议

1. **HTTPS** - 生产环境必须使用 HTTPS
2. **PIN 码** - 修改默认 PIN 码为自定义值
3. **Access Token** - 通过应用内配置，不要硬编码
4. **依赖更新** - 定期更新依赖包
5. **环境变量** - 敏感信息通过环境变量管理

---

## 支持

如有问题，请：

- 提交 [GitHub Issue](https://github.com/SpiritoXI/crustshare/issues)
- 查看 [README](../README.md)
- 参考其他文档文件

---

最后更新：2026-01-29