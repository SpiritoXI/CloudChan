# CrustShare 项目介绍

<div align="center">

**基于 Crust Network 的去中心化文件存储与分享平台**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Crust Network](https://img.shields.io/badge/Crust-Network-orange)](https://crust.network/)
[![GitHub stars](https://img.shields.io/github/stars/SpiritoXI/CrustShare?style=social)](https://github.com/SpiritoXI/CrustShare/stargazers)

[English](./README_EN.md) | 简体中文

</div>

---

## 目录

- [项目简介](#项目简介)
- [核心特性](#核心特性)
- [功能预览](#功能预览)
- [快速开始](#快速开始)
- [技术架构](#技术架构)
- [目录结构](#目录结构)
- [部署](#部署)
- [API 文档](#api-文档)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [开源协议](#开源协议)
- [致谢](#致谢)

---

## 项目简介

CrustShare 是一个开源的去中心化文件存储和分享平台，利用 [Crust Network](https://crust.network/) 和 [IPFS](https://ipfs.tech/) 技术，为用户提供**免费、永久、安全**的文件存储解决方案。

### 为什么选择 CrustShare？

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
| ⚡ **性能优化** | React Context + 懒加载 + useMemo 优化 |
| 🚀 **智能下载** | 多网关自动切换，断点续传支持 |

## 功能预览

| 功能 | 说明 |
|------|------|
| 文件管理仪表板 | 文件列表、上传、批量操作、文件夹管理 |
| 文件分享页面 | 文件预览、下载、密码保护 |
| 网关管理 | 网关测试、健康度评分、自动选择最优网关 |
| 多媒体播放 | 图片预览、视频播放、音频播放 |

---

## 快速开始

### 环境要求

- Node.js 18.0 或更高版本
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

应用将在 `http://localhost:3000` 启动。

### 环境变量配置

创建 `.env.local` 文件并配置以下变量：

```env
# Crust Access Token（必需）
# 从 https://crustfiles.io 获取 Developer Profile Access Token
CRUST_ACCESS_TOKEN=your_access_token_here

# 管理员密码（必需）
# 用于登录后台管理文件，至少 8 个字符
ADMIN_PASSWORD=your_admin_password

# Redis 配置（可选，用于数据持久化）
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## 获取 Access Token

1. 访问 [crustfiles.io](https://crustfiles.io)
2. 连接钱包（MetaMask、Coinbase Wallet 等）
3. 创建 Developer Profile
4. 复制 Access Token

> ⚠️ **安全提示**：Access Token 包含您的私钥，请妥善保管，不要泄露或提交到公开仓库！

## 设置管理员密码

管理员密码用于登录后台管理文件，是必需的环境变量。

**要求：**
- 至少 8 个字符
- 建议包含大小写字母、数字和特殊符号

**示例：**
```
ADMIN_PASSWORD=MySecureP@ss123
```

> ⚠️ **安全提示**：请勿使用简单密码如 "admin123"，建议使用密码管理器生成随机密码！

---

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
| [TanStack Query](https://tanstack.com/query) | 5 | 数据请求管理 |

### 架构特点

| 特性 | 说明 |
|------|------|
| **React Context** | 使用 Context 替代深层 prop 传递，简化组件通信 |
| **组件懒加载** | 模态框等组件使用 React.lazy 延迟加载，优化首屏性能 |
| **类型模块化** | 类型定义按领域拆分，便于维护和复用 |
| **API 模块化** | Gateway API 拆分为验证、缓存、健康评分等模块 |
| **错误边界** | 全局错误捕获，防止渲染错误导致应用崩溃 |
| **安全验证** | Zod 运行时验证环境变量，输入清理防止 XSS |

### 后端服务

| 服务 | 用途 |
|------|------|
| [Crust Network](https://crust.network/) | 去中心化文件存储 |
| [IPFS](https://ipfs.tech/) | 分布式文件系统 |
| [Upstash Redis](https://upstash.com/) | 数据持久化（可选）|

---

## 目录结构

```
crustshare/
├── app/                      # Next.js App Router
│   ├── dashboard/           # 文件管理仪表板
│   │   └── page.tsx         # 仪表板页面（使用 Context）
│   ├── share/               # 文件分享页面
│   │   └── [cid]/           # 动态路由（CID）
│   ├── styles/              # 全局样式
│   ├── globals.css          # 全局 CSS 入口
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 首页
│   └── providers.tsx        # 全局 Provider（含 ErrorBoundary）
├── components/              # React 组件
│   ├── ui/                  # shadcn/ui 基础组件
│   ├── dashboard/           # 仪表板专用组件
│   │   ├── lazy-modals.tsx  # 懒加载模态框集合
│   │   ├── batch-toolbar.tsx
│   │   ├── dashboard-header.tsx
│   │   ├── preview-modal.tsx
│   │   └── upload-progress.tsx
│   ├── media/               # 媒体播放器模块
│   │   ├── index.ts         # 统一导出
│   │   ├── use-media-player.ts # 播放器 Hook
│   │   ├── audio-player.tsx # 音频播放器
│   │   ├── video-player.tsx # 视频播放器
│   │   └── gateway-selector.tsx # 网关选择器
│   ├── modals/              # 弹窗组件
│   ├── share/               # 分享页面专用组件
│   ├── error-boundary.tsx   # 错误边界
│   ├── file-list.tsx        # 文件列表（React.memo 优化）
│   ├── image-viewer.tsx     # 图片查看器
│   ├── media-player.tsx     # 媒体播放器入口
│   ├── sidebar.tsx          # 侧边栏
│   └── toast.tsx            # Toast 提示
├── contexts/                # React Context
│   └── dashboard-context.tsx # 仪表板上下文（统一状态管理）
├── functions/               # Cloudflare Functions
│   ├── api/                 # API 端点
│   └── share/               # 分享功能
├── hooks/                   # 自定义 Hooks
│   ├── use-dashboard.ts     # 仪表板 Hook（Context 包装器）
│   ├── use-dashboard-batch.ts # 批量操作
│   ├── use-dashboard-cid.ts # CID 管理
│   ├── use-dashboard-file.ts # 文件管理
│   ├── use-dashboard-folder.ts # 文件夹管理
│   ├── use-dashboard-gateway.ts # 网关管理
│   ├── use-gateway.ts       # 网关测试
│   ├── use-share-page.ts    # 分享页面逻辑
│   └── use-upload.ts        # 上传逻辑
├── lib/                     # 核心库
│   ├── api/                 # API 模块
│   │   ├── index.ts         # 统一导出
│   │   ├── base.ts          # 基础 API
│   │   ├── download.ts      # 下载 API
│   │   ├── file.ts          # 文件 API
│   │   ├── gateway.ts       # 网关 API（主入口）
│   │   ├── gateway-validator.ts # 网关验证
│   │   ├── gateway-cache.ts # 网关缓存
│   │   ├── gateway-health.ts # 健康评分
│   │   ├── propagation.ts   # 传播检测 API
│   │   ├── share.ts         # 分享 API
│   │   └── upload.ts        # 上传 API
│   ├── db/                  # 数据库模块
│   │   ├── index.ts         # 统一导出
│   │   └── upstash.ts       # Upstash Redis 操作
│   ├── utils/               # 工具函数模块
│   │   ├── index.ts         # 统一导出
│   │   ├── format.ts        # 格式化工具
│   │   ├── security.ts      # 安全工具
│   │   └── error.ts         # 错误处理
│   ├── api.ts               # API 统一入口
│   ├── config.ts            # 配置常量
│   ├── env.ts               # 环境变量验证（Zod）
│   ├── store.ts             # Zustand Store
│   ├── utils.ts             # 工具函数入口
│   └── index.ts             # lib 统一入口
├── types/                   # TypeScript 类型定义
│   ├── index.ts             # 统一导出
│   ├── api.ts               # API 类型
│   ├── download.ts          # 下载类型
│   ├── file.ts              # 文件类型
│   ├── folder.ts            # 文件夹类型
│   ├── gateway.ts           # 网关类型
│   ├── share.ts             # 分享类型
│   ├── ui.ts                # UI 类型
│   ├── upload.ts            # 上传类型
│   └── user.ts              # 用户类型
├── tests/                   # 测试脚本
│   ├── api/                 # API 测试
│   │   ├── crust-api.mjs    # Crust API 测试
│   │   └── propagation.mjs  # 传播功能测试
│   └── gateway/             # 网关测试
│       ├── test-gateways.mjs
│       ├── test-inbrowser-deep.mjs
│       ├── test-inbrowser-gateway.mjs
│       └── test-recommended-gateways.mjs
├── scripts/                 # 脚本工具
│   └── build/               # 构建脚本
│       ├── compress-image.js # 图片压缩
│       ├── generate-env.js   # 环境变量生成
│       └── generate-icons.js # 图标生成
├── public/                  # 静态资源
├── docs/                    # 文档
│   ├── INDEX.md            # 文档索引
│   ├── README.md           # 项目介绍（中文）
│   ├── README_EN.md        # 项目介绍（英文）
│   ├── API.md              # API 文档
│   ├── DEPLOY.md           # 部署指南
│   ├── CHANGELOG.md        # 更新日志
│   └── CONTRIBUTING.md     # 贡献指南
├── .env.example             # 环境变量示例
├── README.md                # 项目入口文档
├── LICENSE                  # 开源协议
├── next.config.js           # Next.js 配置
├── tailwind.config.ts       # Tailwind 配置
├── tsconfig.json            # TypeScript 配置
└── wrangler.toml            # Cloudflare 配置
```

---

## 部署

### Cloudflare Pages（推荐）

```bash
# 构建项目
pnpm build

# 部署到 Cloudflare Pages
wrangler pages deploy .next --project-name=crustshare
```

详细步骤请参考 [部署指南](./DEPLOY.md)

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SpiritoXI/CrustShare)

### Docker

```bash
# 构建镜像
docker build -t crustshare .

# 运行容器
docker run -p 3000:3000 -e CRUST_ACCESS_TOKEN=your_token crustshare
```

---

## API 文档

详细 API 文档请参考 [API.md](./API.md)

### 核心 API 概览

| API | 说明 |
|-----|------|
| `uploadApi.uploadToCrust(file)` | 上传文件到 Crust 网络 |
| `fileApi.loadFiles()` | 加载文件列表 |
| `gatewayApi.testAllGateways()` | 测试所有网关 |
| `shareApi.createShare(cid, options)` | 创建分享链接 |
| `downloadApi.downloadWithAutoSwitch()` | 自动切换网关下载 |
| `propagationApi.smartPropagate()` | 智能传播文件 |

---

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

<details>
<summary><b>支持哪些文件类型？</b></summary>

支持所有文件类型。对于常见格式（图片、视频、音频、PDF、文本），提供在线预览功能。
</details>

<details>
<summary><b>文件大小有限制吗？</b></summary>

默认支持最大 1GB 的文件上传。如需上传更大文件，可以修改配置。
</details>

<details>
<summary><b>如何选择最优网关？</b></summary>

系统会自动测试多个 IPFS 网关的延迟和可用性，智能选择最优节点。您也可以在设置中手动选择网关。
</details>

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

### 开发命令

```bash
# 启动开发服务器
pnpm dev

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 构建
pnpm build
```

---

## 开源协议

本项目基于 [MIT](../LICENSE) 协议开源。

---

## 致谢

- [Crust Network](https://crust.network/) - 去中心化存储网络
- [IPFS](https://ipfs.tech/) - 分布式文件系统
- [crustfiles.io](https://crustfiles.io) - 免费永久存储服务
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 UI 组件库

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star！⭐**

[报告问题](https://github.com/SpiritoXI/CrustShare/issues) · [功能建议](https://github.com/SpiritoXI/CrustShare/issues) · [贡献代码](https://github.com/SpiritoXI/CrustShare/pulls)

</div>
