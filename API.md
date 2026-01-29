# API 文档

本文档详细描述 CrustShare 的所有 API 接口。

---

## 目录

- [认证 API](#认证-api)
- [文件上传 API (CrustFiles.io)](#文件上传-api-crustfilesio)
- [文件上传 API (Crust Network)](#文件上传-api-crust-network)
- [存储状态 API](#存储状态-api)
- [错误处理](#错误处理)

---

## 认证 API

### 用户登录

验证用户或管理员密码并创建会话。

**端点**: `POST /api/auth/login`

**请求头**:
```http
Content-Type: application/json
```

**请求体**:
```json
{
  "password": "string",    // 用户密码
  "isAdmin": boolean      // 是否为管理员（可选，默认 false）
}
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "登录成功" | "管理员登录成功",
  "role": "user" | "admin"
}
```

**错误响应** (400):
```json
{
  "success": false,
  "error": "密码不能为空"
}
```

**错误响应** (401):
```json
{
  "success": false,
  "error": "密码错误"
}
```

**错误响应** (500):
```json
{
  "success": false,
  "error": "服务器错误"
}
```

**示例**:

```bash
# 普通用户登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "password": "crustshare",
    "isAdmin": false
  }'

# 管理员登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "password": "admin",
    "isAdmin": true
  }'
```

---

## 文件上传 API

### 上传文件到 Crust Network

将文件上传到 Crust Network（基于 IPFS）并获取 CID。

**端点**: `POST /api/crust/upload`

**请求头**:
```http
Content-Type: multipart/form-data
```

**请求体**:
- `file` (File): 要上传的文件

**成功响应** (200):
```json
{
  "success": true,
  "cid": "Qm...",           // IPFS CID
  "name": "example.pdf",    // 文件名
  "size": 1024,             // 文件大小（字节）
  "url": "https://ipfs.io/ipfs/Qm..."  // IPFS 网关 URL
}
```

**错误响应** (400):
```json
{
  "success": false,
  "error": "未找到文件"
}
```

**错误响应** (500):
```json
{
  "success": false,
  "error": "上传失败"
}
```

**示例**:

```bash
curl -X POST http://localhost:5000/api/crust/upload \
  -F "file=@/path/to/file.pdf"
```

---

## 存储状态 API

### 获取存储状态

获取当前的存储使用情况和配额信息。

**端点**: `GET /api/crust/status`

**请求头**:
```http
Content-Type: application/json
```

**成功响应** (200):
```json
{
  "success": true,
  "status": {
    "totalStorage": 10737418240,  // 总存储空间（字节）
    "usedStorage": 536870912,     // 已使用存储（字节）
    "availableStorage": 10219547328, // 可用存储（字节）
    "fileCount": 25,              // 文件数量
    "lastUpdated": "2024-01-29T02:35:21.000Z"
  }
}
```

**错误响应** (500):
```json
{
  "success": false,
  "error": "获取存储状态失败"
}
```

**示例**:

```bash
curl http://localhost:5000/api/crust/status
```

---

## 错误处理

所有 API 遵循统一的错误响应格式。

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权/密码错误 |
| 404 | 资源未找到 |
| 500 | 服务器内部错误 |

### 常见错误

#### 1. 未授权 (401)

```json
{
  "success": false,
  "error": "密码错误"
}
```

**解决方法**：检查密码是否正确，使用环境变量中的密码哈希。

#### 2. 参数错误 (400)

```json
{
  "success": false,
  "error": "未找到文件"
}
```

**解决方法**：确保请求体中包含必需的参数。

#### 3. 服务器错误 (500)

```json
{
  "success": false,
  "error": "上传失败"
}
```

**解决方法**：
- 检查服务器日志
- 确认网络连接正常
- 验证文件大小限制

---

## 认证机制

当前版本使用简单的密码认证：

1. **密码哈希验证**
   - 使用 SHA-256 哈希算法
   - 密码哈希存储在环境变量中
   - 支持用户和管理员两种角色

2. **会话管理**
   - 使用 localStorage 存储会话
   - 可选集成 Upstash Redis 进行集中会话管理
   - 默认会话时长：24 小时

3. **JWT 支持**
   - 支持使用 JWT 进行会话验证
   - JWT 密钥通过环境变量配置
   - 令牌签名：HS256

---

## 未来功能

计划在未来版本中添加的 API：

- [ ] 文件下载 API
- [ ] 文件删除 API
- [ ] 文件元数据管理 API
- [ ] 文件夹管理 API
- [ ] 标签管理 API
- [ ] 权限管理 API
- [ ] 版本历史 API
- [ ] 分享链接生成 API

---

## 使用示例

### 完整的上传流程

```javascript
// 1. 登录获取会话
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: 'crustshare',
    isAdmin: false
  })
});

const loginData = await loginResponse.json();
if (!loginData.success) {
  throw new Error('登录失败');
}

// 2. 上传文件
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const uploadResponse = await fetch('/api/crust/upload', {
  method: 'POST',
  body: formData
});

const uploadData = await uploadResponse.json();
if (uploadData.success) {
  console.log('上传成功，CID:', uploadData.cid);
}
```

### 获取存储状态

```javascript
const statusResponse = await fetch('/api/crust/status');
const statusData = await statusResponse.json();

if (statusData.success) {
  const { totalStorage, usedStorage, fileCount } = statusData.status;
  const usedPercent = ((usedStorage / totalStorage) * 100).toFixed(2);
  console.log(`已使用: ${usedPercent}% (${fileCount} 个文件)`);
}
```

---

## 安全建议

1. **使用 HTTPS**
   - 生产环境必须使用 HTTPS
   - 保护密码和会话令牌

2. **定期更新密码**
   - 定期轮换用户和管理员密码
   - 使用强密码策略

3. **保护 JWT 密钥**
   - 不要在代码中硬编码 JWT 密钥
   - 使用环境变量管理敏感信息

4. **限制文件大小**
   - 设置合理的文件大小限制
   - 防止恶意大文件上传

5. **监控和日志**
   - 记录所有 API 调用
   - 监控异常行为

---

## 技术支持

如有问题或建议，请通过以下方式联系：

- GitHub Issues: https://github.com/SpiritoXI/crustshare/issues
- 文档: https://github.com/SpiritoXI/crustshare/blob/main/README.md
