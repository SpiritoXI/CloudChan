# CrustShare

<div align="center">

**基于 Crust Network 的去中心化文件存储与分享平台**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Crust Network](https://img.shields.io/badge/Crust-Network-orange)](https://crust.network/)

[English](./README_EN.md) | 简体中文

</div>

---

## 项目简介

CrustShare 是一个开源的去中心化文件存储和分享平台，利用 [Crust Network](https://crust.network/) 和 [IPFS](https://ipfs.tech/) 技术，为用户提供**免费、永久、安全**的文件存储解决方案。

### 核心特性

| 特性 | 说明 |
|------|------|
| 🆓 **免费永久存储** | 基于 crustfiles.io 开发者服务，无需支付任何费用 |
| 🔒 **去中心化存储** | 文件分布在 Crust 网络，永久保存，不会丢失 |
| 🌐 **智能网关** | 自动测试多个 IPFS 网关，选择最优节点加速访问 |
| 🔐 **密码保护** | 分享链接可设置访问密码，保护隐私 |
| 📁 **文件夹管理** | 支持创建文件夹，轻松组织文件 |
| 📦 **批量操作** | 批量移动、复制、删除文件 |
| 🎬 **多媒体支持** | 图片预览、视频/音频在线播放 |
| 📱 **响应式设计** | 完美适配桌面、平板、手机 |

## 快速开始

### 环境要求

- Node.js 18+
- pnpm（推荐）或 npm

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/SpiritoXI/CrustShare.git
cd CrustShare

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入必要的配置

# 启动开发服务器
pnpm dev
```

### 环境变量配置

```env
# Crust Access Token（必需）
# 从 https://crustfiles.io 获取 Developer Profile Access Token
CRUST_ACCESS_TOKEN=your_access_token_here

# Redis 配置（可选，用于数据持久化）
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## 获取 Access Token

1. 访问 [crustfiles.io](https://crustfiles.io)
2. 连接钱包（MetaMask、Coinbase Wallet 等）
3. 创建 Developer Profile
4. 复制 Access Token

> **注意**：Access Token 包含您的私钥，请妥善保管，不要泄露！

## 技术架构

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Next.js](https://nextjs.org/) | 14 | React 全栈框架 |
| [React](https://react.dev/) | 18 | UI 组件库 |
| [TypeScript](https://www.typescriptlang.org/) | 5 | 类型安全 |
| [Tailwind CSS](https://tailwindcss.com/) | 3 | 原子化 CSS |
| [shadcn/ui](https://ui.shadcn.com/) | - | UI 组件库 |
| [Zustand](https://github.com/pmndrs/zustand) | 4 | 状态管理 |
| [Framer Motion](https://www.framer.com/motion/) | 10 | 动画效果 |

### 后端服务

| 服务 | 用途 |
|------|------|
| [Crust Network](https://crust.network/) | 去中心化文件存储 |
| [IPFS](https://ipfs.tech/) | 分布式文件系统 |
| [Upstash Redis](https://upstash.com/) | 数据持久化（可选）|

## 目录结构

```
crustshare/
├── app/                    # Next.js 应用目录
│   ├── dashboard/         # 文件管理页面
│   ├── share/[cid]/       # 文件分享页面
│   └── api/               # API 路由
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 基础组件
│   ├── dashboard/        # 仪表板组件
│   └── share/            # 分享页面组件
├── lib/                   # 核心库
│   ├── api.ts            # API 封装
│   ├── config.ts         # 配置文件
│   ├── stores.ts         # 状态管理
│   └── utils.ts          # 工具函数
├── types/                 # TypeScript 类型定义
└── public/               # 静态资源
```

## 部署

### Cloudflare Pages（推荐）

```bash
# 构建项目
pnpm build

# 部署到 Cloudflare Pages
# 参考 DEPLOY.md 获取详细步骤
```

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SpiritoXI/CrustShare)

### Docker

```bash
docker build -t crustshare .
docker run -p 3000:3000 crustshare
```

## API 文档

详细 API 文档请参考 [docs/API.md](./docs/API.md)

### 核心 API

| API | 说明 |
|-----|------|
| `uploadToCrust(file, token)` | 上传文件到 Crust 网络 |
| `createStorageOrder(cid, size, token)` | 创建存储订单 |
| `fetchFromGateway(cid)` | 从网关获取文件 |

## 常见问题

<details>
<summary><b>文件存储是免费的吗？</b></summary>

是的！crustfiles.io 为 Developer Profile 提供**免费永久存储**服务，无需支付任何 CRU 代币。
</details>

<details>
<summary><b>文件会被永久保存吗？</b></summary>

是的，文件会被永久保存在 Crust 网络上。crustfiles.io 后端会自动处理文件存储和续期。
</details>

<details>
<summary><b>Access Token 泄露了怎么办？</b></summary>

如果 Access Token 泄露，请立即在 crustfiles.io 重新生成新的 Token。由于 Token 包含私钥，泄露可能导致他人访问您的文件。
</details>

## 贡献指南

欢迎提交 Issue 和 Pull Request！

请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

## 开源协议

本项目基于 [MIT](./LICENSE) 协议开源。

## 致谢

- [Crust Network](https://crust.network/) - 去中心化存储网络
- [IPFS](https://ipfs.tech/) - 分布式文件系统
- [crustfiles.io](https://crustfiles.io) - 免费永久存储服务
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 UI 组件库

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star！⭐**

</div>
