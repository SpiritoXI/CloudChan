# Vercel 部署指南

本文档介绍如何将 CrustShare 项目部署到 Vercel 平台。

## 前置条件

- GitHub 账户（项目代码已托管到 GitHub）
- Vercel 账户
- [可选] CrustFiles.io 的 Access Token

## 部署步骤

### 1. 连接 Vercel 到 GitHub

1. 访问 [Vercel](https://vercel.com) 并登录
2. 点击 "Add New Project"
3. 导入你的 GitHub 仓库 `crustshare`
4. 点击 "Import"

### 2. 配置环境变量（关键步骤）

在 Vercel 项目配置页面，找到 **Environment Variables** 部分，添加以下环境变量：

#### 必须配置的环境变量

| 名称 | 值 | 环境 |
|------|-----|------|
| `PIN_CODE` | 你的 PIN 码（如：123456） | Production, Preview, Development |

#### 可选配置的环境变量

| 名称 | 值 | 环境 | 说明 |
|------|-----|------|------|
| `CRUSTFILES_ACCESS_TOKEN` | 你的 Access Token | Production, Preview | 文件上传功能需要 |
| `CRUSTFILES_BASE_URL` | `https://crustfiles.io` | Production, Preview | CrustFiles API 地址 |
| `UPSTASH_REDIS_REST_URL` | Redis URL | Production | 会话管理（可选） |
| `UPSTASH_REDIS_REST_TOKEN` | Redis Token | Production | 会话管理（可选） |

### 3. 构建配置

Vercel 会自动识别 Next.js 项目，无需额外配置。如果需要自定义，可以使用以下设置：

| 设置 | 值 |
|------|-----|
| Framework Preset | Next.js |
| Build Command | `pnpm run build` |
| Output Directory | `.next` |
| Install Command | `pnpm install` |

### 4. 部署应用

1. 点击 "Deploy" 按钮
2. 等待构建完成（通常需要 1-2 分钟）
3. 部署完成后，Vercel 会提供一个 URL（如 `https://crustshare.vercel.app`）

## 常见问题排查

### 问题 1：登录失败，提示 "PIN 码错误"

**原因**：环境变量 `PIN_CODE` 未正确配置或未生效

**解决方案**：

1. 检查 Vercel 项目设置中的 Environment Variables
   - 确保已添加 `PIN_CODE`
   - 确保名称完全匹配（大小写敏感）
   - 确保已勾选 Production, Preview, Development 环境

2. 重新部署项目
   - 进入项目 → Deployments
   - 点击最新的部署右侧的 "..." → "Redeploy"
   - 选择 "Redeploy" 并确认

3. 清除 Vercel 缓存（如果问题仍然存在）
   - 进入项目 → Settings → Functions
   - 点击 "Clear Build Cache"
   - 重新部署项目

### 问题 2：环境变量未生效

**原因**：环境变量添加后需要重新部署才能生效

**解决方案**：

1. 添加环境变量后，必须触发重新部署
2. 可以通过以下方式触发：
   - 提交新代码到 GitHub
   - 在 Vercel Dashboard 中手动重新部署
   - 使用 Vercel CLI 运行 `vercel --prod`

### 问题 3：文件上传失败

**原因**：缺少 `CRUSTFILES_ACCESS_TOKEN` 环境变量

**解决方案**：

1. 访问 [CrustFiles.io](https://crustfiles.io/)
2. 注册账户并获取 Access Token
3. 在 Vercel 项目设置中添加 `CRUSTFILES_ACCESS_TOKEN` 环境变量
4. 重新部署项目

## 调试技巧

### 查看部署日志

1. 进入项目 → Deployments
2. 点击任意部署记录
3. 查看 "Build Log" 和 "Function Logs"

### 查看环境变量

在 Vercel Dashboard 中，进入项目 → Settings → Environment Variables，可以看到所有配置的环境变量。

### 本地测试

在部署前，先在本地测试环境变量是否生效：

```bash
# 复制 .env.example 到 .env
cp .env.example .env

# 编辑 .env 文件，设置正确的 PIN_CODE
nano .env

# 启动开发服务器
pnpm dev
```

## 生产环境建议

1. **使用强 PIN 码**：生产环境请使用 6 位以上的随机数字
2. **配置 Redis**：生产环境建议配置 Upstash Redis 以获得更好的会话管理
3. **启用 HTTPS**：Vercel 默认提供 HTTPS，无需额外配置
4. **监控日志**：定期查看 Vercel 的 Function Logs 监控应用状态

## 更新项目

当项目代码更新后，只需：

1. 提交代码到 GitHub
2. Vercel 会自动检测更新并部署
3. 如果环境变量有变动，手动重新部署即可

## 参考资源

- [Vercel 官方文档](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [CrustFiles.io 文档](https://crustfiles.io/docs)
