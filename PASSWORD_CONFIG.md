# CrustShare 密码配置参考

## 预设密码选项

### 选项 A：中等强度（推荐用于测试环境）

```env
# 用户密码: CrustShare2024!
PASSWORD_HASH=3d853f948c0451211d468c10d0acae9db5ef5fbfa580fcee1854a512da92e1ad

# 管理员密码: Admin2024!Secure
ADMIN_PASSWORD_HASH=a007ad64c5a01b46f330672b69a3c55ee126c2b85a523cc4fb23c7b93457bc6a
```

---

### 选项 B：高强度（推荐用于生产环境）

```env
# 用户密码: MyCrustShare@Secure2024
PASSWORD_HASH=0d392f732e15e559ec47251f2e45db8b8ab325a45db8805669e8aada43edbfc7

# 管理员密码: MasterAdmin@2024#Secure
ADMIN_PASSWORD_HASH=449a875047e8f0826dc298a19c303aaa1ddea5fbdc3ac1f177961a99dec5869a
```

---

### 选项 C：极高强度（最高安全级别）

```env
# 用户密码: CrustShare_Pa$$w0rd_2024!Secure
PASSWORD_HASH=fe7ff6424fac5514b94bc5cccace3b639533169baeb318f07521e20ce02d02e0

# 管理员密码: 5uper@dm1n_2024!CrustShare
ADMIN_PASSWORD_HASH=76117645a566fbc3b735d5863415d1dd743223ffe88496236f66e374a06eb4be
```

---

### 选项 D：简单易记（仅用于开发）

```env
# 用户密码: secure123
PASSWORD_HASH=b5692500175fad6bb2b306aa20ff58423c79b130ef310fb3caa924e0f28bc61d

# 管理员密码: admin456
ADMIN_PASSWORD_HASH=becf77f3ec82a43422b7712134d1860e3205c6ce778b08417a7389b43f2b4661
```

---

## 如何使用

### 方法 1：使用交互式脚本（推荐）

```bash
node scripts/update-password.js
```

然后输入你想要的密码，脚本会自动生成哈希并更新 `.env` 文件。

### 方法 2：手动复制预设密码

1. 选择上面的一个选项
2. 复制密码和哈希到 `.env` 文件
3. 重启开发服务器

```bash
# 停止服务器（Ctrl + C）
pnpm dev
```

### 方法 3：生成自己的密码

```bash
# 生成密码哈希
echo -n "your_password" | sha256sum

# 例如：
echo -n "MySecurePassword2024" | sha256sum
```

然后将生成的哈希复制到 `.env` 文件：

```env
PASSWORD_HASH=生成的哈希值
ADMIN_PASSWORD_HASH=生成的哈希值
```

---

## 更新 Vercel 环境变量

如果你已经部署到 Vercel，需要同步更新环境变量：

1. 访问 Vercel Dashboard
2. 进入你的项目
3. 点击 `Settings` → `Environment Variables`
4. 更新 `PASSWORD_HASH` 和 `ADMIN_PASSWORD_HASH`
5. 点击 `Save`
6. 进入 `Deployments` → 点击最新部署右侧的 `...` → `Redeploy`

---

## 密码安全建议

### 好密码的特点

✅ 至少 12 个字符
✅ 包含大小写字母
✅ 包含数字
✅ 包含特殊符号（!@#$%^&*）
✅ 不包含个人信息
✅ 定期更换

### 坏密码的特征

❌ 纯数字或纯字母
❌ 常用词（password, 123456）
❌ 包含个人信息（生日、名字）
❌ 与其他网站使用相同密码

---

## 生成安全的 JWT 密钥

除了密码哈希，还需要生成安全的 JWT 密钥：

```bash
# 生成随机 JWT 密钥
openssl rand -base64 32
```

然后在 `.env` 文件中更新：

```env
CRUST_JWT_SECRET=生成的JWT密钥
```

---

## 测试新密码

更新密码后，测试登录：

### 测试用户登录

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_new_password","isAdmin":false}'
```

### 测试管理员登录

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_new_admin_password","isAdmin":true}'
```

---

## 忘记密码了？

如果你忘记了自定义密码，可以：

1. 查看 `.env` 文件中的哈希值
2. 或者重新生成新的密码：

```bash
node scripts/update-password.js
```

或者直接重置为默认密码：

```env
# 默认密码: crustshare
PASSWORD_HASH=cd24acfe451d3457457f98bce96d48102e406f5e07f70ff5a20713a0686aa25f

# 默认管理员密码: admin
ADMIN_PASSWORD_HASH=8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
```

---

## 安全提示

⚠️ **重要安全提示**：

1. 不要将 `.env` 文件提交到 Git
2. 不要分享你的密码
3. 生产环境务必使用强密码
4. 定期更换密码（建议每 90 天）
5. 在 Vercel 等平台上配置环境变量时，确保使用强密码

---

## 快速参考

生成密码哈希的命令：

```bash
# 用户密码
echo -n "your_password" | sha256sum

# 管理员密码
echo -n "your_admin_password" | sha256sum

# JWT 密钥
openssl rand -base64 32
```

---

**选择一个选项或使用交互式脚本开始配置你的密码！**
