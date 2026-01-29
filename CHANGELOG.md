# 更新日志

本文档记录 CrustShare 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [未发布]

### 计划中

- [ ] 多用户支持和用户管理
- [ ] 文件下载 API
- [ ] 文件删除 API
- [ ] 文件夹管理 API
- [ ] 标签管理 API
- [ ] 权限管理 API
- [ ] 版本历史 API
- [ ] 分享链接生成 API
- [ ] 文件搜索功能
- [ ] 批量上传
- [ ] 文件预览增强（支持更多格式）
- [ ] 深色模式
- [ ] 多语言支持

---

## [1.0.0] - 2024-01-29

### 新增

#### 核心功能
- ✨ 基于 Crust Network 和 IPFS 的去中心化文件存储
- ✨ 用户认证系统（密码哈希 + SHA-256）
- ✨ 管理员权限管理
- ✨ 会话管理（localStorage + Upstash Redis）
- ✨ 文件上传到 IPFS
- ✨ 文件下载（通过 IPFS 网关）
- ✨ 存储状态查询 API
- ✨ 文件元数据管理

#### UI/UX
- ✨ 优雅的水晶风格设计
- ✨ 响应式布局（支持桌面和移动设备）
- ✨ 登录页面（支持用户和管理员）
- ✨ 文件上传界面
- ✨ 仪表板界面
- ✨ 文件列表组件
- ✨ 文件夹树组件
- ✨ 标签管理组件
- ✨ 权限管理组件
- ✨ 版本历史组件

#### 技术栈
- ✨ Next.js 16 (App Router)
- ✨ React 19
- ✨ TypeScript 5
- ✨ Tailwind CSS 4
- ✨ shadcn/ui 组件库
- ✨ Zustand 状态管理
- ✨ Lucide React 图标
- ✨ Sonner 通知

#### 开发工具
- ✨ Coze CLI 集成
- ✨ 配置生成脚本（`scripts/generate-config.js`）
- ✨ 环境变量管理
- ✨ 密码哈希工具（`src/lib/auth.ts`）
- ✨ Redis 客户端（`src/lib/redis.ts`）
- ✨ Crust Network 客户端（`src/lib/crust.ts`）

#### 文档
- ✨ 完整的 README.md
- ✨ 详细的 API.md
- ✨ 全面的 DEPLOYMENT.md
- ✨ 贡献指南 CONTRIBUTING.md
- ✨ 更新日志 CHANGELOG.md
- ✨ .env.example 模板

#### API 端点
- ✨ POST `/api/auth/login` - 用户登录
- ✨ POST `/api/crust/upload` - 文件上传
- ✨ GET `/api/crust/status` - 存储状态
- ✨ GET `/api/crust/storage` - 存储管理

### 配置
- ✨ 环境变量配置支持
- ✨ Upstash Redis 集成（可选）
- ✨ JWT 密钥配置
- ✨ 密码哈希配置
- ✨ 应用配置（名称、URL）

### 安全
- ✨ SHA-256 密码哈希
- ✨ 会话管理（TTL 24 小时）
- ✨ JWT 令牌支持
- ✨ 环境变量保护敏感信息

### 性能
- ✨ 本地缓存机制
- ✨ 智能文件缓存
- ✨ 优化的组件渲染

### 开发体验
- ✨ 热更新（HMR）
- ✨ TypeScript 类型检查
- ✨ 自动格式化
- ✨ 构建优化

### 部署
- ✨ Coze CLI 部署支持
- ✨ Docker 支持
- ✨ Vercel 支持
- ✨ 云服务器部署指南
- ✨ Nginx 反向代理配置
- ✨ SSL/HTTPS 配置

### 测试
- ✨ API 测试
- ✨ 构建测试
- ✨ 类型检查

---

## 版本说明

### 版本号格式

遵循语义化版本：`MAJOR.MINOR.PATCH`

- **MAJOR**：不兼容的 API 变更
- **MINOR**：向后兼容的功能新增
- **PATCH**：向后兼容的 Bug 修复

### 变更类型

- `新增` - 新功能
- `变更` - 功能变更
- `弃用` - 即将移除的功能
- `移除` - 已移除的功能
- `修复` - Bug 修复
- `安全` - 安全相关变更

---

## 贡献者

感谢所有为 CrustShare 做出贡献的开发者！

---

## 相关链接

- [GitHub Releases](../../releases)
- [GitHub Issues](../../issues)
- [GitHub Pull Requests](../../pulls)
- [README](README.md)
- [API 文档](API.md)
- [部署文档](DEPLOYMENT.md)
- [贡献指南](CONTRIBUTING.md)

---

<div align="center">

**CrustShare** - 去中心化文件存储平台

Made with ❤️ by CrustShare Team

</div>
