# 🔒 CloudChan 安全配置指南 - 隐藏数据库连接信息

## ⚠️ 为什么需要隐藏数据库连接？

如果把 Upstash 的 URL/Token 直接写进前端代码（例如 `config.js`），等同于把数据库钥匙发给所有访问者。

这存在以下安全风险：
1. ❌ 任何访问你网站的人都可以通过开发者工具看到连接信息
2. ❌ 代码提交到 GitHub 会暴露敏感信息
3. ❌ 恶意用户可以使用你的数据库进行操作

## ✅ 解决方案：使用 Cloudflare Pages 环境变量

### 架构说明

**优化前（不安全）：**
```
浏览器 → 直接连接 Upstash（暴露 Token）
```

**优化后（安全）：**
```
浏览器 → Cloudflare Functions (Proxy) → Upstash（隐藏 Token）
         ↑
    后端环境变量存储敏感信息
```

## 📝 配置步骤

### 步骤 1：在 Cloudflare Pages 设置环境变量

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入你的 **Pages** 项目
3. 点击 **Settings** → **Environment Variables**
4. 点击 **Add variable** 添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `UPSTASH_URL` | `https://你的数据库地址.upstash.io` | Upstash Redis URL |
| `UPSTASH_TOKEN` | `你的Upstash_REST_Token` | Upstash REST API Token |
| `ADMIN_PASSWORD` | `你的管理员密码` | 管理员登录密码 |
| `CRUST_TOKEN` | `Basic c3Vi...` | Crust 存储认证（含 Basic 前缀） |

### 步骤 2：部署后端代理接口

我已经为你创建了完整的后端代理接口，位于：
```
functions/api/db_proxy.js
```

这个接口提供了以下功能：
- ✅ 安全地加载数据库中的文件列表
- ✅ 安全地保存上传记录
- ✅ 安全地删除文件记录
- ✅ 所有数据库操作都在后端完成，Token 永不暴露

### 步骤 3：修改前端配置

修改 `cloudchan/config.js`：

```javascript
export const CONFIG = {
    // ✅ 不再需要在这里配置 Upstash 信息！
    // 环境变量已自动在后端配置

    // 后端代理接口
    API_DB_PROXY: '/api/db_proxy',
    API_GET_TOKEN: '/api/get_token',

    // 其他配置保持不变...
};
```

### 步骤 4：更新 functions 目录

确保你的项目结构如下：

```
CloudChan/
├── functions/
│   └── api/
│       ├── get_token.js       # 已有，获取 Crust Token
│       └── db_proxy.js        # 新增，数据库代理接口
├── cloudchan/
│   ├── index.html
│   ├── login.html
│   ├── app.js
│   ├── config.js          # 修改，移除敏感信息
│   └── ui.js
├── _headers
└── _redirects
```

### 步骤 5：重新部署

1. 将修改后的代码提交到 GitHub
2. Cloudflare Pages 会自动部署
3. **重要**：部署完成后，点击 **Retry deployment** 让环境变量生效

## 🔧 接口使用说明

### 后端代理接口：`/api/db_proxy`

所有数据库操作都通过这个接口完成：

#### 1. 加载文件列表
```javascript
const res = await fetch('/api/db_proxy?action=load_files', {
    method: 'GET',
    headers: {
        'x-auth-token': password  // 管理员密码
    }
});
```

#### 2. 保存文件记录
```javascript
const res = await fetch('/api/db_proxy?action=save_file', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-auth-token': password
    },
    body: JSON.stringify({
        id: Date.now(),
        name: 'file.pdf',
        size: 1024000,
        cid: 'QmXXX...',
        date: '2026-01-11'
    })
});
```

#### 3. 删除文件记录
```javascript
const res = await fetch('/api/db_proxy?action=delete_file', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-auth-token': password
    },
    body: JSON.stringify({
        fileId: 123  // 优先按 id 删除（避免分页/过滤导致索引错位）
    })
});
```

#### 4. 批量删除文件记录（推荐）
```javascript
const res = await fetch('/api/db_proxy?action=delete_files', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-auth-token': password
    },
    body: JSON.stringify({
        fileIds: [123, 456, 789]
    })
});
```

## 🎯 验证配置

### 方法 1：检查环境变量

在 Cloudflare Pages 的 **Environment Variables** 页面确认所有变量已添加。

### 方法 2：测试 API

使用 Postman 或 curl 测试：

```bash
# 测试加载文件列表
curl -X GET https://your-domain.pages.dev/api/db_proxy?action=load_files \
  -H "x-auth-token: 你的密码"

# 测试保存文件
curl -X POST https://your-domain.pages.dev/api/db_proxy?action=save_file \
  -H "Content-Type: application/json" \
  -H "x-auth-token: 你的密码" \
  -d '{"id":123,"name":"test.pdf","size":1024,"cid":"QmXXX","date":"2026-01-11"}'
```

### 方法 3：前端测试

1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 执行上传/删除操作
4. 检查 API 请求，确认没有直接访问 Upstash URL

## 🔒 安全最佳实践

### ✅ DO（应该做的）
1. 使用强密码（至少 16 位，包含大小写字母、数字、特殊字符）
2. 定期更换 Upstash Token（在 Upstash 控制台操作）
3. 定期更换管理员密码
4. 启用 Cloudflare Access（可选，额外保护）
5. 限制 API 调用频率（在 Cloudflare 配置）

### ❌ DON'T（不应该做的）
1. ❌ 不要将 `.env` 文件提交到 Git
2. ❌ 不要在代码中硬编码 Token
3. ❌ 不要使用弱密码（如 "123456"、"password"）
4. ❌ 不要在公共场合分享你的域名和密码

## 📋 环境变量清单

部署前请确认已配置以下变量：

- [ ] `UPSTASH_URL` - Upstash Redis URL
- [ ] `UPSTASH_TOKEN` - Upstash REST API Token
- [ ] `ADMIN_PASSWORD` - 管理员登录密码
- [ ] `CRUST_TOKEN` - Crust 存储认证

## 🚨 故障排查

### 问题 1：API 返回 500 错误
**原因**：环境变量未配置或配置错误
**解决**：
1. 检查 Cloudflare Pages 的环境变量是否全部配置
2. 点击 **Retry deployment** 重新部署

### 问题 2：API 返回 401 错误
**原因**：密码错误或未传递密码
**解决**：
1. 确认前端传递了正确的密码
2. 检查 `ADMIN_PASSWORD` 环境变量是否正确

### 问题 3：上传成功但列表为空
**原因**：数据库操作失败
**解决**：
1. 检查 `UPSTASH_URL` 和 `UPSTASH_TOKEN` 是否正确
2. 在 Upstash 控制台手动测试连接

### 问题 4：修改配置后不生效
**原因**：Cloudflare 缓存或环境变量未生效
**解决**：
1. 清除浏览器缓存
2. 在 Cloudflare Pages 点击 **Retry deployment**
3. 等待 1-2 分钟后刷新页面

## 📚 相关文档

- [Cloudflare Pages 环境变量文档](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)
- [Upstash REST API 文档](https://upstash.com/docs/redis/overall/restapi)
- [Cloudflare Functions 文档](https://developers.cloudflare.com/pages/functions/)

## ✅ 配置完成检查清单

- [ ] 已在 Cloudflare Pages 配置所有环境变量
- [ ] 已部署 db_proxy.js 后端接口
- [ ] 已修改 config.js 移除敏感信息
- [ ] 已重新部署项目（点击 Retry deployment）
- [ ] 已测试加载文件列表功能
- [ ] 已测试上传文件功能
- [ ] 已测试删除文件功能
- [ ] 已验证浏览器 Network 不再显示 Upstash URL

---

**配置完成后，你的 CloudChan 将拥有企业级的安全性！🎉**
