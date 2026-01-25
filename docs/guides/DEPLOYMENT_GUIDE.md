# 🚀 CloudChan 完整部署指南

本指南将帮助你从零开始部署 CloudChan，并正确配置所有安全设置。

## 📋 前置准备

在开始部署之前，请确保你已经准备好：

### 1. 必需的账号
- ✅ [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费）
- ✅ [GitHub 账号](https://github.com/signup)（免费）
- ✅ [Upstash 账号](https://upstash.com/login)（免费）
- ✅ [Crust Files 账号](https://crustfiles.io)（免费）

### 2. 需要的密钥和 Token
- ✅ Upstash Redis 数据库 URL 和 REST Token
- ✅ Crust Network Auth Token
- ✅ 一个强密码（至少 16 位，用于管理员登录）

---

## 📝 步骤 1：准备 Upstash 数据库

### 1.1 创建 Redis 数据库

1. 登录 [Upstash Console](https://console.upstash.com/)
2. 点击 **Create Database**
3. 选择 **Global** 区域（推荐）或 **Regional**
4. 给数据库命名，例如：`cloudchan-db`
5. 点击 **Create**

### 1.2 获取连接信息

1. 进入刚创建的数据库详情页
2. 找到 **REST API** 部分
3. 复制以下信息：
   - **UPSTASH_URL**: 类似 `https://hip-ringtail-23686.upstash.io`
   - **UPSTASH_TOKEN**: 类似 `AVyGAAIncDI3NTI0MDZmMTFlM2U0N2ZkODg5NjY0OTI5NTE3OTE5ZXAyMjM2ODY`

⚠️ **重要**：妥善保管这些信息，不要分享给他人！

---

## 📝 步骤 2：获取 Crust Token

### 2.1 注册 Crust Files

1. 访问 [Crust Files](https://crustfiles.io)
2. 注册/登录账号
3. 进入 **Settings** → **API Keys**

### 2.2 创建 API Token

1. 点击 **Create New Key**
2. 给 Token 命名，例如：`cloudchan`
3. 点击 **Create**
4. 复制生成的 **Basic Auth** 字符串

⚠️ **注意**：这个字符串应该已经包含 `Basic ` 前缀，例如：`Basic c3ViaW...`

---

## 📝 步骤 3：设置 GitHub 仓库

### 3.1 Fork 项目

1. 访问你的 CloudChan 项目仓库
2. 点击右上角的 **Fork** 按钮
3. 选择你的 GitHub 账号作为目标

### 3.2 验证文件结构

确保你的仓库包含以下文件：

```
CloudChan/
├── functions/
│   └── api/
│       ├── get_token.js       # ✅ 已存在
│       └── db_proxy.js        # ✅ 已添加（数据库代理）
├── cloudchan/
│   ├── index.html
│   ├── login.html
│   ├── clear-cache.html
│   ├── app.js
│   ├── config.js
│   ├── ui.js
│   └── style.css
├── _headers                   # ✅ Cloudflare Pages 头部规则
└── README.md
```

---

## 📝 步骤 4：连接 Cloudflare Pages

### 4.1 创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **Create application**
3. 选择 **Pages** → **Connect to Git**
4. 选择你 Fork 的仓库
5. 点击 **Begin setup**

### 4.2 配构建设置

在 **Build settings** 部分：

| 配置项 | 值 |
|--------|-----|
| **Project name** | `cloudchan`（或你喜欢的名字） |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Build command** | （留空） |
| **Build output directory** | （留空） |

> 如果你部署后访问根路径（例如 `https://xxx.pages.dev/`）显示 “找不到内容 / 404”，请优先检查这里：
> - **Framework preset** 必须是 `None`
> - **Build output directory** 保持留空（使用仓库根目录），不要填 `dist` / `public` 等不存在的目录
> - **Root directory（根目录）** 必须是仓库根目录（留空或 `/`），不要填 `cloudchan`。否则 `functions/` 不会被识别，`/api/*` 会返回 `text/html`（页面）而不是 `application/json`

### 4.3 开始部署

点击 **Save and Deploy**，Cloudflare 会自动开始部署。

⏱️ 首次部署大约需要 1-2 分钟。

---

## 📝 步骤 5：配置环境变量（关键步骤）

### 5.1 进入环境变量设置

1. 部署完成后，进入你的 Pages 项目
2. 点击 **Settings** → **Environment Variables**
3. 点击 **Add variable** 逐个添加以下变量：

### 5.2 添加环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `UPSTASH_URL` | `https://你的数据库地址.upstash.io` | 步骤 1.2 复制的 URL |
| `UPSTASH_TOKEN` | `你的Upstash_REST_Token` | 步骤 1.2 复制的 Token |
| `ADMIN_PASSWORD` | `你的管理员密码` | **强密码，至少 16 位** |
| `CRUST_TOKEN` | `Basic c3Vi...` | 步骤 2.2 复制的 Auth 字符串 |

### 5.3 验证环境变量

添加完成后，确认页面显示如下：

```
Production
├── UPSTASH_URL         ••••••••
├── UPSTASH_TOKEN       ••••••••••••••••••
├── ADMIN_PASSWORD      ••••••••
└── CRUST_TOKEN         ••••••••••••••••••
```

✅ 四个变量都显示在列表中！

---

## 📝 步骤 5.5：文件传播功能（默认启用）

CloudChan 内置了智能文件传播功能，会自动将上传的 IPFS 文件传播到全球主流公共网关，提高文件的访问速度和可靠性。

### 5.5.1 功能说明

文件传播功能无需任何配置，开箱即用：

- 🔄 **自动传播**：上传完成后，系统会自动将文件传播到全球多个公共网关
- 🌍 **多网关支持**：包括 Cloudflare、IPFS.io、DWeb Link、W3S Link 等主流网关
- 🚀 **智能缓存**：通过访问网关触发缓存机制，确保文件快速可用
- ✅ **无需 API 密钥**：完全免费，无需注册任何额外服务

### 5.5.2 使用传播功能

1. 在文件列表中点击传播按钮（📤 图标）
2. 系统会自动将文件传播到全球多个公共网关
3. 查看详细的传播结果和每个网关的访问状态

**提示**：
- 传播功能是默认启用的，无需进行任何配置
- 传播结果会实时显示在界面上，包括每个网关的状态
- 传播到更多网关可以提高文件的访问速度和可用性，特别是针对全球用户

---

## 📝 步骤 6：重新部署（让环境变量生效）

### 6.1 重试部署

1. 进入你的 Pages 项目
2. 点击 **Deployments** 标签
3. 找到最新的部署记录
4. 点击右侧的 **三个点 (⋮)**
5. 选择 **Retry deployment**

⚠️ **重要**：环境变量只在重新部署后才会生效！

### 6.2 等待部署完成

等待 1-2 分钟，确保部署状态显示为 **Success**。

---

## 📝 步骤 7：测试部署

### 7.1 访问你的网站（根站点模式）

在 Cloudflare Pages 项目首页，找到你的网站域名，例如：
```
https://cloudchan.pages.dev
```

### 7.2 测试登录

1. 打开网站（根路径即 CloudChan）
2. 应该会弹出密码输入框
3. 输入你在环境变量中设置的 `ADMIN_PASSWORD`
4. 点击确定

#### 7.2.1 先验证 Functions 是否生效（强烈推荐）

在浏览器直接打开：
- `https://你的域名/api/health`

正常情况会返回 `application/json`，并包含 `hasEnv` 字段（仅显示是否配置，不泄露具体值）。

如果你打开后看到的是网页 HTML（`text/html`），说明 **请求没有进入 Pages Functions**，通常是部署没有更新到最新版本，或项目构建设置导致 Functions 未被识别。此时请先修复 Functions 路由再测试密码验证。

✅ 如果登录成功，说明后端配置正确！

### 7.3 测试上传文件

1. 点击上传区域，选择一个测试文件（建议小于 10MB）
2. 点击"开始上传"
3. 观察上传进度条
4. 上传完成后，文件应该出现在列表中

### 7.4 测试下载文件

1. 点击文件的下载按钮
2. 应该弹出网关选择弹窗
3. 等待测速完成
4. 点击任意网关链接测试下载

### 7.5 测试删除文件

1. 点击文件的删除按钮
2. 确认删除操作
3. 文件应该从列表中消失

---

## 🔍 步骤 8：验证安全性

### 8.1 检查网络请求

1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 执行上传或删除操作
4. 查看请求列表

✅ 应该看到：
- ✅ `/api/get_token` - 获取 Crust Token
- ✅ `/api/db_proxy` - 数据库代理
- ❌ 不应该看到：直接的 Upstash URL

### 8.2 检查源代码

在开发者工具中查看源代码：

```javascript
// cloudchan/config.js
export const CONFIG = {
    // ✅ 不再包含 UPSTASH 配置（敏感信息只存在于后端环境变量）
    API_DB_PROXY: '/api/db_proxy',
    API_GET_TOKEN: '/api/get_token',
    // ...
};
```

✅ 确认没有数据库连接信息！

---

## 🎯 常见问题

### Q1: 部署后访问网站显示 500 错误

**原因**：环境变量未配置或配置错误

**解决**：
1. 检查 Cloudflare Pages 的环境变量是否全部配置
2. 确保 `ADMIN_PASSWORD` 不为空
3. 点击 **Retry deployment** 重新部署

### Q2: 登录时提示密码错误

**原因**：密码不匹配或环境变量未生效

**解决**：
1. 确认输入的密码与 `ADMIN_PASSWORD` 环境变量一致
2. 检查环境变量中 `ADMIN_PASSWORD` 是否有多余空格
3. 清除浏览器缓存，重试登录

### Q3: 上传文件失败

**原因**：Crust Token 配置错误或无效

**解决**：
1. 检查 `CRUST_TOKEN` 环境变量是否包含 `Basic ` 前缀
2. 确认 Crust Files Token 未过期
3. 在 Crust Files 控制台重新生成 Token

### Q4: 文件列表为空或加载失败

**原因**：Upstash 数据库连接失败

**解决**：
1. 检查 `UPSTASH_URL` 和 `UPSTASH_TOKEN` 是否正确
2. 在 Upstash 控制台测试数据库连接
3. 确认数据库未过期或被删除

### Q5: 点击重试部署后环境变量不生效

**原因**：Cloudflare 缓存

**解决**：
1. 等待 2-3 分钟让部署完成
2. 清除浏览器缓存（Ctrl+Shift+Delete）
3. 使用隐私模式/无痕模式测试

---

## 🔒 安全最佳实践

### ✅ 推荐做法

1. **使用强密码**
   ```
   推荐格式：至少 16 位，包含大小写字母、数字、特殊字符
   示例：Xk9#mP2$vL8@nQ5!
   ```

2. **定期更换 Token**
   - Upstash Token：每 3 个月更换一次
   - 管理员密码：每 1 个月更换一次

3. **启用 Cloudflare Access**（可选）
   - 额外的访问保护层
   - 可以限制只有特定用户才能访问

4. **监控使用情况**
   - 定期查看 Cloudflare Analytics
   - 检查是否有异常访问

### ❌ 禁止做法

1. ❌ 不要将环境变量写在 `.env` 文件中
2. ❌ 不要将环境变量提交到 Git
3. ❌ 不要使用弱密码（如 "123456"、"password"）
4. ❌ 不要在公共场合分享你的域名和密码

---

## 📚 相关文档

- [SECURITY_GUIDE.md](./SECURITY_GUIDE.md) - 详细的安全配置说明
- [SMART_GATEWAY_GUIDE.md](./SMART_GATEWAY_GUIDE.md) - 智能网关功能使用指南
- [SMART_CACHE_GUIDE.md](./SMART_CACHE_GUIDE.md) - 智能缓存功能使用指南
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Upstash REST API 文档](https://upstash.com/docs/redis/overall/restapi)
- [Crust Files 文档](https://docs.crust.network/)
- [Pinata 文档](https://docs.pinata.cloud/)

---

## ✅ 部署完成检查清单

部署完成后，请确认以下项目：

- [ ] Cloudflare Pages 项目创建成功
- [ ] GitHub 仓库已连接
- [ ] 网站可以正常访问
- [ ] 4 个环境变量全部配置（UPSTASH_URL, UPSTASH_TOKEN, ADMIN_PASSWORD, CRUST_TOKEN）
- [ ] 已点击 Retry deployment
- [ ] 管理员登录功能正常
- [ ] 文件上传功能正常
- [ ] 文件下载功能正常
- [ ] 文件删除功能正常
- [ ] 浏览器 Network 不显示 Upstash URL
- [ ] 源代码不包含数据库连接信息

---

## 🎉 恭喜！

如果以上检查项全部通过，恭喜你！你的 CloudChan 已经成功部署并拥有企业级的安全性！

现在你可以：
- 🚀 开始使用你的 Web3 个人网盘
- 📤 上传文件到 IPFS 网络
- 🌍 通过多个网关快速下载文件
- 🔒 享受安全的存储体验

---

**部署完成日期**：__________
**管理员密码**：__________（请妥善保管）
**网站域名**：__________

祝你使用愉快！🚀
