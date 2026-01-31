# Cloudflare Pages 部署指南

## 自动环境变量配置

本项目支持在 Cloudflare Pages 部署时自动从环境变量生成 `.env.local` 文件。

### 部署步骤

#### 1. Fork/上传代码到 GitHub

将代码推送到 GitHub 仓库。

#### 2. 在 Cloudflare Dashboard 创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** → **Create a project**
3. 选择 **Connect to Git**
4. 选择你的 GitHub 仓库

#### 3. 配置构建设置

在构建设置页面填写：

| 配置项 | 值 |
|--------|-----|
| **Framework preset** | Next.js (Static HTML Export) |
| **Build command** | `pnpm run build` |
| **Build output directory** | `dist` |

#### 4. 配置环境变量 ⭐重要

在 **Environment variables** 部分添加以下变量：

**必需变量：**

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `UPSTASH_URL` | Upstash Redis URL | `https://your-url.upstash.io` |
| `UPSTASH_TOKEN` | Upstash Redis Token | `your-token` |
| `ADMIN_PASSWORD` | 管理员密码（明文） | `your-secure-password` |
| `CRUST_TOKEN` | Crust Network Token | `your-crust-token` |

**可选变量：**

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_APP_VERSION` | 应用版本号 | Git commit SHA |
| `NEXT_PUBLIC_BUILD_TIME` | 构建时间 | 当前时间 |

#### 5. 密码说明

本项目使用**明文密码**进行验证，直接在 `ADMIN_PASSWORD` 环境变量中设置您的密码即可。

#### 6. 保存并部署

点击 **Save and Deploy**，Cloudflare Pages 会自动：

1. 运行 `prebuild` 脚本生成 `.env.local`
2. 运行 `build` 构建项目
3. 部署到全球 CDN

### 环境变量优先级

1. **Cloudflare Pages Dashboard** 中设置的环境变量（生产环境）
2. **本地 `.env.local`** 文件（本地开发）
3. **`.env.example`** 文件（默认值）

### 多环境配置

Cloudflare Pages 支持多个部署环境：

- **Production** (生产环境): 主分支部署
- **Preview** (预览环境): 其他分支/pull request

可以为不同环境设置不同的环境变量。

### 故障排除

#### 构建失败：环境变量未找到

检查 Cloudflare Dashboard 中是否正确设置了所有必需的环境变量。

#### 运行时错误：无法连接数据库

确认 `UPSTASH_URL` 和 `UPSTASH_TOKEN` 正确无误。

#### 登录失败

确认 `ADMIN_PASSWORD` 和 `ADMIN_PASSWORD_HASH` 匹配。

### 本地开发

本地开发时，手动创建 `.env.local` 文件：

```bash
cp .env.example .env.local
# 编辑 .env.local 填入你的配置
```

然后运行：

```bash
pnpm dev
```

### 安全注意事项

1. **永远不要将 `.env.local` 提交到 Git**
2. **定期轮换 Upstash Token 和 Crust Token**
3. **使用强密码并定期更换**
4. **启用 Cloudflare 的 Access 控制保护预览环境**

### 相关文件

- `scripts/generate-env.js` - 环境变量生成脚本
- `package.json` - 构建脚本配置
- `wrangler.toml` - Cloudflare 部署配置
