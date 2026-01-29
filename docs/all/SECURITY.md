# 安全政策

本文档描述 CrustShare 项目的安全政策和安全漏洞报告流程。

---

## 目录

- [支持版本](#支持版本)
- [报告漏洞](#报告漏洞)
- [安全最佳实践](#安全最佳实践)
- [已知安全限制](#已知安全限制)

---

## 支持版本

| 版本 | 支持状态 |
|------|---------|
| 1.0.x | ✅ 当前版本 |
| < 1.0.0 | ❌ 不再支持 |

我们只维护最新的稳定版本。旧版本不会收到安全更新。

---

## 报告漏洞

### 私密报告流程

我们非常重视安全问题。如果你发现安全漏洞，**请不要公开 Issue**。

**正确做法**：

1. **发送私密邮件**：
   - 邮箱：security@crustshare.com
   - 标题：`[Security] CrustShare 漏洞报告`

2. **包含以下信息**：
   - 漏洞描述
   - 受影响的版本
   - 复现步骤
   - 潜在影响
   - 建议的修复方案（如有）

3. **等待确认**：
   - 我们会在 48 小时内确认收到报告
   - 在 7 天内提供初步评估
   - 在 30 天内发布修复版本

### 漏洞处理流程

1. **接收报告**：安全团队接收并评估漏洞
2. **确认漏洞**：验证漏洞的真实性和影响范围
3. **开发修复**：开发安全补丁
4. **测试验证**：内部测试确保修复有效
5. **发布更新**：发布安全更新版本
6. **公开披露**：在修复后公开漏洞详情（需报告者同意）

### 漏洞严重级别

| 级别 | 定义 | 响应时间 |
|------|------|---------|
| 严重 | 可以远程执行任意代码、完全控制服务器 | 24 小时内 |
| 高 | 数据泄露、权限提升、认证绕过 | 72 小时内 |
| 中 | 功能受限、信息泄露 | 7 天内 |
| 低 | 轻微问题、用户体验影响 | 14 天内 |

### 奖励机制

对于负责任的漏洞披露，我们提供：

- 🏆 **漏洞披露证书**
- 📜 **贡献者认可**
- 🌟 **GitHub 安全徽章**
- 💬 **与安全团队直接交流的机会**

---

## 安全最佳实践

### 部署安全

#### 1. 使用 HTTPS

**必须**在生产环境使用 HTTPS：

```nginx
# Nginx 配置示例
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private-key.pem;

    location / {
        proxy_pass http://localhost:5000;
    }
}
```

#### 2. 配置防火墙

限制不必要的端口访问：

```bash
# 仅开放必要端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### 3. 定期更新

保持系统和依赖最新：

```bash
# 更新系统
sudo apt update && sudo apt upgrade

# 更新依赖
pnpm update
```

### 环境变量安全

#### 1. 保护敏感信息

```env
# ✅ 正确：使用环境变量
PASSWORD_HASH=<SHA-256 哈希值>
JWT_SECRET=<随机密钥>
UPSTASH_REDIS_REST_TOKEN=<Redis 令牌>

# ❌ 错误：不要硬编码敏感信息
# const PASSWORD = "crustshare"
# const API_KEY = "sk-..."
```

#### 2. 生成强密码

```bash
# 生成强密码（至少 16 字符）
openssl rand -base64 24

# 生成密码哈希
echo -n "your_strong_password" | sha256sum
```

#### 3. 轮换密钥

定期（建议每 90 天）轮换：
- JWT 密钥
- Redis 令牌
- API 密钥

### 认证安全

#### 1. 使用强密码哈希

我们使用 SHA-256 哈希算法：

```typescript
// ✅ 使用 SHA-256 哈希
import { sha256Hash } from '@/lib/auth';

const passwordHash = sha256Hash('your_password');
```

#### 2. 设置合理的会话时长

```typescript
// 会话时长：24 小时（可调整）
const SESSION_TTL = 86400; // 秒
```

#### 3. 实施速率限制

防止暴力破解攻击：

```typescript
// 建议实施登录速率限制
// 例如：每 IP 每分钟最多 5 次登录尝试
```

### 数据安全

#### 1. 定期备份

```bash
# 备份环境变量
cp .env .env.backup

# 备份数据库（如果使用）
pg_dump your_database > backup.sql
```

#### 2. 加密敏感数据

敏感数据应使用加密存储：

```typescript
// 建议加密敏感文件内容
// 使用 AES-256 加密
```

### API 安全

#### 1. 使用 CORS

限制 API 访问来源：

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
        ],
      },
    ];
  },
};
```

#### 2. 验证输入

所有 API 请求应验证输入：

```typescript
// ✅ 验证输入
if (!password || password.length < 8) {
  throw new Error('密码长度至少 8 字符');
}

// ❌ 不要直接使用未验证的输入
```

#### 3. 限制文件上传

```typescript
// 限制文件大小（例如：100MB）
const MAX_FILE_SIZE = 100 * 1024 * 1024;

if (file.size > MAX_FILE_SIZE) {
  throw new Error('文件过大');
}
```

### 依赖安全

#### 1. 使用安全依赖

```bash
# 检查依赖漏洞
npm audit
pnpm audit

# 自动修复
pnpm audit --fix
```

#### 2. 锁定依赖版本

```bash
# 使用 pnpm-lock.yaml 锁定版本
# 不要手动修改 lockfile
```

#### 3. 审计第三方代码

使用新依赖前应：
- 检查维护状态
- 查看已知漏洞
- 评估代码质量

### 监控和日志

#### 1. 记录安全事件

```typescript
// 记录登录尝试
console.log(`[AUTH] Login attempt: ${username}, Success: ${success}`);

// 记录文件操作
console.log(`[FILE] Upload: ${filename}, User: ${userId}`);
```

#### 2. 监控异常行为

监控以下指标：
- 异常登录频率
- 大文件上传尝试
- API 调用频率异常
- 错误率突然上升

#### 3. 设置警报

配置安全警报：
- 登录失败次数过多
- 异常 IP 访问
- 服务器资源异常

---

## 已知安全限制

### 当前版本限制

1. **多租户支持**
   - 当前版本仅支持单用户和管理员
   - 缺少细粒度用户隔离

2. **会话管理**
   - 默认使用 localStorage（可被清除）
   - 未实施会话固定保护

3. **文件访问控制**
   - 文件通过 IPFS 公开访问
   - 缺少访问权限验证

4. **速率限制**
   - API 未实施速率限制
   - 易受暴力破解攻击

### 未来改进

计划在以下版本中改进：

- [ ] 实施完整的用户系统
- [ ] 添加会话固定保护
- [ ] 实施文件访问控制
- [ ] 添加 API 速率限制
- [ ] 支持 2FA（双因素认证）
- [ ] 添加审计日志
- [ ] 实施内容加密

---

## 安全资源

### 学习资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Security Guidelines](https://cheatsheetseries.owasp.org/)
- [Web Security Academy](https://portswigger.net/web-security)

### 安全工具

- [npm audit](https://docs.npmjs.com/cli/audit.html)
- [Snyk](https://snyk.io/)
- [Dependabot](https://github.com/features/security)
- [CodeQL](https://codeql.github.com/)

### 报告平台

- [HackerOne](https://www.hackerone.com/)
- [Bugcrowd](https://www.bugcrowd.com/)

---

## 免责声明

本软件按"原样"提供，不提供任何明示或暗示的保证。我们不对因使用本软件而造成的任何损失负责。

---

## 联系方式

- **安全邮箱**：security@crustshare.com
- **PGP 密钥**：[下载](./security.asc)
- **GitHub**：https://github.com/SpiritoXI/crustshare

---

<div align="center">

**安全第一，共同构建更安全的 Web**

Made with ❤️ by CrustShare Security Team

</div>
