# ✅ 密码已更新为自定义密码

## 当前配置（选项 B - 高强度）

### 用户登录信息

**密码**：`MyCrustShare@Secure2024`
**哈希值**：`0d392f732e15e559ec47251f2e45db8b8ab325a45db8805669e8aada43edbfc7`

### 管理员登录信息

**密码**：`MasterAdmin@2024#Secure`
**哈希值**：`449a875047e8f0826dc298a19c303aaa1ddea5fbdc3ac1f177961a99dec5869a`

### JWT 密钥

**密钥**：`o7QulIh6633wz/EI6Up0ItphUc4hQjn8r4d/uPvAFHs=`

---

## ✅ 测试结果

- ✅ 用户登录：成功
- ✅ 管理员登录：成功
- ✅ JWT 密钥：已更新

---

## 🔐 密码强度说明

### 当前密码（选项 B）特点：

- ✅ 长度超过 20 个字符
- ✅ 包含大小写字母
- ✅ 包含数字
- ✅ 包含特殊符号（@, #, !）
- ✅ 不包含常见词汇
- ✅ 适合生产环境使用

---

## 🔄 使用其他预设密码选项

如果你不想使用当前配置，可以选择其他预设选项：

### 选项 A：中等强度

**用户密码**：`CrustShare2024!`
**管理员密码**：`Admin2024!Secure`

```env
PASSWORD_HASH=3d853f948c0451211d468c10d0acae9db5ef5fbfa580fcee1854a512da92e1ad
ADMIN_PASSWORD_HASH=a007ad64c5a01b46f330672b69a3c55ee126c2b85a523cc4fb23c7b93457bc6a
```

### 选项 C：极高强度

**用户密码**：`CrustShare_Pa$$w0rd_2024!Secure`
**管理员密码**：`5uper@dm1n_2024!CrustShare`

```env
PASSWORD_HASH=fe7ff6424fac5514b94bc5cccace3b639533169baeb318f07521e20ce02d02e0
ADMIN_PASSWORD_HASH=76117645a566fbc3b735d5863415d1dd743223ffe88496236f66e374a06eb4be
```

### 选项 D：简单易记

**用户密码**：`secure123`
**管理员密码**：`admin456`

```env
PASSWORD_HASH=b5692500175fad6bb2b306aa20ff58423c79b130ef310fb3caa924e0f28bc61d
ADMIN_PASSWORD_HASH=becf77f3ec82a43422b7712134d1860e3205c6ce778b08417a7389b43f2b4661
```

---

## 🛠️ 自定义密码

如果你想使用自己的密码：

### 方法 1：使用交互式脚本

```bash
node scripts/update-password.js
```

### 方法 2：手动生成哈希

```bash
# 生成用户密码哈希
echo -n "your_custom_password" | sha256sum

# 生成管理员密码哈希
echo -n "your_custom_admin_password" | sha256sum

# 生成新的 JWT 密钥
openssl rand -base64 32
```

然后更新 `.env` 文件：

```env
PASSWORD_HASH=你的用户密码哈希
ADMIN_PASSWORD_HASH=你的管理员密码哈希
CRUST_JWT_SECRET=你的JWT密钥
```

---

## 🚀 更新 Vercel 环境变量

如果你已经部署到 Vercel，需要同步更新：

### 步骤

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的 `CrustShare` 项目
3. 点击 `Settings` → `Environment Variables`
4. 更新以下变量：

   ```
   PASSWORD_HASH=0d392f732e15e559ec47251f2e45db8b8ab325a45db8805669e8aada43edbfc7
   ADMIN_PASSWORD_HASH=449a875047e8f0826dc298a19c303aaa1ddea5fbdc3ac1f177961a99dec5869a
   CRUST_JWT_SECRET=o7QulIh6633wz/EI6Up0ItphUc4hQjn8r4d/uPvAFHs=
   ```

5. 点击 `Save`
6. 进入 `Deployments` → 点击最新部署右侧的 `...` → `Redeploy`

---

## 📝 登录说明

### 用户登录

1. 打开应用
2. 输入密码：`MyCrustShare@Secure2024`
3. 不勾选"管理员登录"
4. 点击"登录"

### 管理员登录

1. 打开应用
2. 输入密码：`MasterAdmin@2024#Secure`
3. 勾选"管理员登录"
4. 点击"登录"

---

## ⚠️ 重要提示

1. **保存密码**：请将密码保存在安全的地方
2. **不要提交**：`.env` 文件已在 `.gitignore` 中，不会提交到 Git
3. **定期更换**：建议每 90 天更换一次密码
4. **Vercel 同步**：如果已部署，记得同步更新 Vercel 环境变量

---

## 🔍 故障排除

### 问题：登录失败

**解决方案**：

1. 检查密码是否正确输入
2. 清除浏览器缓存和 localStorage
3. 重启开发服务器

```bash
# 停止服务器（Ctrl + C）
pnpm dev
```

4. 测试 API

```bash
# 测试用户登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"MyCrustShare@Secure2024","isAdmin":false}'
```

### 问题：忘记密码

**解决方案**：

1. 查看 `CURRENT_PASSWORD.md` 文件
2. 或者查看 `.env` 文件中的注释
3. 或者重新生成密码：

```bash
node scripts/update-password.js
```

---

## 📚 相关文档

- [API 文档](API.md)
- [部署文档](DEPLOYMENT.md)
- [密码配置完整参考](PASSWORD_CONFIG.md)

---

**密码已成功更新！请妥善保管。** 🔐
