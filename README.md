# CrustShare

<div align="center">

**基于 Crust Network 的去中心化文件存储与分享平台**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Crust Network](https://img.shields.io/badge/Crust-Network-orange)](https://crust.network/)

[文档中心](./docs/INDEX.md) | [快速开始](#快速开始) | [部署指南](./docs/DEPLOY.md) | [API 文档](./docs/API.md)

</div>

---

## 项目简介

CrustShare 是一个开源的去中心化文件存储和分享平台，利用 Crust Network 和 IPFS 技术，提供**免费、永久、安全**的文件存储解决方案。

### 核心特性

| 特性 | 说明 |
|------|------|
| 🆓 免费永久存储 | 基于 crustfiles.io 开发者服务 |
| 🔒 去中心化存储 | 文件永久保存在 Crust 网络 |
| 🌐 智能网关 | 自动选择最优 IPFS 网关 |
| 🔐 密码保护 | 分享链接可设置访问密码 |
| 📁 文件夹管理 | 支持创建文件夹组织文件 |
| 🎬 多媒体支持 | 图片预览、视频/音频在线播放 |

---

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/SpiritoXI/CrustShare.git
cd CrustShare

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local

# 启动开发服务器
pnpm dev
```

应用将在 `http://localhost:3000` 启动。

### 环境变量

```env
# 必需：从 https://crustfiles.io 获取
CRUST_ACCESS_TOKEN=your_access_token_here

# 必需：管理员登录密码（至少8位）
ADMIN_PASSWORD=your_admin_password

# 可选：用于数据持久化
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 获取 Access Token

1. 访问 [crustfiles.io](https://crustfiles.io)
2. 连接钱包（MetaMask、Coinbase Wallet 等）
3. 创建 Developer Profile
4. 复制 Access Token

> ⚠️ **安全警告**：Access Token 包含私钥，请妥善保管，不要提交到公开仓库！

### 设置管理员密码

管理员密码用于登录管理后台。

**要求：**
- 至少 8 个字符
- 建议使用大小写字母、数字、特殊字符的组合

**示例：**
```
ADMIN_PASSWORD=MySecureP@ss123
```

> ⚠️ **安全警告**：不要使用简单密码（如 "admin123"），建议使用密码管理器生成随机密码！

---

## 部署

### Cloudflare Pages（推荐）

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/SpiritoXI/CrustShare)

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SpiritoXI/CrustShare)

详细部署步骤请参考 [部署指南](./docs/DEPLOY.md)

---

## 文档

| 文档 | 说明 |
|------|------|
| [📚 文档中心](./docs/INDEX.md) | 所有文档的入口 |
| [📖 项目介绍](./docs/README.md) | 详细的项目介绍和功能说明 |
| [🚀 部署指南](./docs/DEPLOY.md) | 详细的部署教程 |
| [📝 API 文档](./docs/API.md) | 完整的 API 接口文档 |
| [🤝 贡献指南](./docs/CONTRIBUTING.md) | 如何参与项目开发 |
| [📋 更新日志](./docs/CHANGELOG.md) | 版本更新记录 |

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14 | React 全栈框架 |
| React | 18 | UI 组件库 |
| TypeScript | 5 | 类型安全 |
| Tailwind CSS | 3 | 原子化 CSS |
| Zustand | 4 | 状态管理 |
| Crust Network | - | 去中心化存储 |
| IPFS | - | 分布式文件系统 |

---

## 常见问题

<details>
<summary><b>文件存储是免费的吗？</b></summary>

是的！crustfiles.io 为 Developer Profile 提供免费永久存储服务。
</details>

<details>
<summary><b>文件大小有限制吗？</b></summary>

默认支持最大 1GB 的文件上传。
</details>

<details>
<summary><b>如何获取 Access Token？</b></summary>

访问 [crustfiles.io](https://crustfiles.io)，连接钱包，创建 Developer Profile，即可获取 Access Token。
</details>

---

## 贡献

欢迎提交 Issue 和 Pull Request！

请查看 [贡献指南](./docs/CONTRIBUTING.md) 了解详情。

```bash
# 开发命令
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm lint         # 代码检查
pnpm typecheck    # 类型检查
```

---

## 许可证

本项目基于 [MIT](./LICENSE) 协议开源。

---

## 致谢

- [Crust Network](https://crust.network/) - 去中心化存储网络
- [IPFS](https://ipfs.tech/) - 分布式文件系统
- [crustfiles.io](https://crustfiles.io) - 免费永久存储服务
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star！⭐**

[报告问题](https://github.com/SpiritoXI/CrustShare/issues) · [功能建议](https://github.com/SpiritoXI/CrustShare/issues) · [贡献代码](https://github.com/SpiritoXI/CrustShare/pulls)

</div>
