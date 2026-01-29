# CrustShare

<div align="center">

![CrustShare Logo](./public/icon.png)

**去中心化文件存储平台**

基于 Crust Network 和 IPFS 的安全、私有、去中心化文件存储解决方案

[文档](#文档) · [贡献](#贡献)

</div>

---

## ✨ 核心特性

- 🌐 **去中心化存储** - 基于 Crust Network 和 IPFS 技术，数据分布式存储
- ⚡ **直连上传** - 直接连接 CrustFiles.io，绕过 Vercel 限制，支持大文件上传
- 🌉 **多网关智能调度** - 国内网络优先使用 `https://gw.w3ipfs.org.cn`，兜底兼容官方网关
- 📁 **文件夹管理** - 支持文件夹层级和嵌套结构
- 🏷️ **标签系统** - 灵活的文件标签分类和管理
- 📜 **版本控制** - 文件版本历史记录和旧版本恢复
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 👁️ **文件预览** - 支持图片、视频、音频等多种格式预览
- 🎨 **优雅 UI** - 淡雅水晶风格，提供良好的用户体验
- 💾 **本地缓存** - 智能缓存机制，提升性能和加载速度
- 🔄 **故障自动切换** - 网关故障时自动切换，保障下载稳定
- 📊 **状态监控** - 实时监控网关状态和健康度
- 🔒 **安全认证** - 基于 PIN 码的认证系统，简单安全
- 📦 **大文件支持** - 支持最大 1GB 文件上传（直连模式）

---

## 🚀 快速开始

### 环境要求

- Node.js 24+
- pnpm 包管理器

### 安装

```bash
# 克隆仓库
git clone https://github.com/SpiritoXI/crustshare.git
cd crustshare

# 安装依赖
pnpm install
```

### 配置 Access Token

#### 方式一：应用内配置（推荐）

1. 启动应用后，点击右上角的设置图标（⚙️）
2. 点击"配置 Access Token"
3. 输入您的 CrustFiles.io Access Token
4. Token 会保存到浏览器的 localStorage 中

**如何获取 Access Token**：
1. 访问 [CrustFiles.io](https://crustfiles.io/)
2. 注册或登录您的账户
3. 在用户设置中找到 API Access Token
4. 复制 Token 并粘贴到配置对话框中

#### 方式二：环境变量配置（可选）

创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：

```env
# PIN 码配置（用于用户认证）
# 默认 PIN 码：123456
PIN_CODE=123456

# CrustFiles.io 配置（可选，用于代理模式）
CRUSTFILES_ACCESS_TOKEN=your_crustfiles_access_token_here
CRUSTFILES_BASE_URL=https://crustfiles.io

# Upstash Redis 配置（可选，用于生产环境会话管理）
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 开发

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

### 构建

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 访问 http://localhost:3000
```

---

## 📖 项目结构

```
crustshare/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   ├── auth/          # 认证 API
│   │   │   ├── crustfiles/    # CrustFiles 上传
│   │   │   ├── download/      # 下载 API
│   │   │   ├── gateway/       # 网关状态
│   │   │   └── proxy/         # 代理服务
│   │   └── page.tsx           # 主页面
│   ├── components/            # React 组件
│   │   ├── ui/               # shadcn/ui 基础组件
│   │   ├── Dashboard.tsx     # 主仪表板
│   │   ├── FileUpload.tsx    # 文件上传
│   │   ├── FileList.tsx      # 文件列表
│   │   └── FolderTree.tsx    # 文件夹树
│   ├── lib/                   # 工具库
│   │   ├── gateway/          # 网关管理
│   │   ├── proxy.ts          # 代理功能
│   │   └── crustfiles.ts     # CrustFiles 客户端
│   └── store/                 # 状态管理
├── public/                    # 静态资源
├── scripts/                   # 工具脚本
├── docs/                      # 文档
├── .env.example               # 环境变量模板
└── package.json              # 项目配置
```

---

## 🔧 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript 5
- **UI 库**: shadcn/ui (基于 Radix UI)
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand
- **图标**: Lucide React
- **通知**: Sonner
- **存储**: Crust Network / IPFS

---

## 🚀 部署指南

### 1. Vercel 部署（推荐）

1. **将代码推送到 GitHub**
2. **在 Vercel 中导入项目**
   - 访问 [Vercel](https://vercel.com)
   - 点击 "Add New Project"
   - 选择你的 GitHub 仓库
3. **配置环境变量**
   - 在 Project Settings → Environment Variables 中添加：
     - `PIN_CODE`（必须）- 设置你的 PIN 码
     - `CRUSTFILES_ACCESS_TOKEN`（可选）- 文件上传功能需要
4. **部署应用**
   - 点击 "Deploy" 按钮
   - 部署完成后，Vercel 会提供访问 URL

### 2. Docker 部署

```bash
# 构建镜像
docker build -t crustshare .

# 运行容器
docker run -p 3000:3000 crustshare
```

### 3. 云服务器部署

```bash
# 克隆仓库
git clone https://github.com/SpiritoXI/crustshare.git
cd crustshare

# 安装依赖
pnpm install

# 构建生产版本
pnpm build

# 启动服务（使用 PM2 管理）
npm install -g pm2
pm2 start npm --name "crustshare" -- start

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

---

## 📡 网关配置

### 网关优先级

1. **主用链路（国内优选）**：`https://gw.w3ipfs.org.cn`
2. **备用链路 1（官方主推）**：`https://gw.crustfiles.app`
3. **备用链路 2（开发者/海外兜底）**：`https://crustipfs.xyz`

### 自动故障切换
- 当当前网关上传失败时，自动尝试下一个网关
- 确保国内网络环境下的稳定上传

---

## 🔒 安全认证

### PIN 码登录
- 默认 PIN 码：`123456`
- 建议：使用 4-6 位数字，易于记忆
- 配置：在环境变量中设置 `PIN_CODE`

### 会话管理
- 开发环境：使用 localStorage
- 生产环境：建议配置 Upstash Redis

---

## 📦 文件上传

### 直连上传
- **上传接口**：`/api/v0/add`（CrustFiles 原生上传接口）
- **文件大小限制**：最大 1GB
- **认证方式**：使用 CrustFiles.io Access Token
- **网络优化**：国内优先使用 `https://gw.w3ipfs.org.cn`

### 上传流程
1. 选择文件或拖拽文件到上传区域
2. 系统自动选择最优网关
3. 显示上传进度
4. 上传完成后生成 CID 并保存文件信息

---

## 📥 文件下载

### 多网关智能调度
- 自动选择响应速度最快的网关
- 网关故障时自动切换
- 支持断点续传

### 下载方式
1. 点击文件列表中的下载按钮
2. 系统自动生成最优网关的下载链接
3. 支持直接预览和保存

---

## 📚 文档

### 详细文档
- [API 文档](./docs/all/API.md) - 完整的 API 接口文档
- [部署文档](./docs/all/DEPLOYMENT.md) - 部署指南和故障排除
- [更新日志](./docs/all/CHANGELOG.md) - 版本更新历史
- [贡献指南](./docs/all/CONTRIBUTING.md) - 如何贡献代码
- [安全政策](./docs/all/SECURITY.md) - 安全漏洞报告流程

### 技术文档
- [网关功能文档](./docs/all/GATEWAY.md) - 网关管理和智能调度
- [代理功能文档](./docs/all/PROXY.md) - CrustFiles 代理服务
- [CrustFiles API 文档](./docs/all/CRUSTFILES_API.md) - CrustFiles API 使用指南

---

## ❓ 常见问题

### 1. 登录失败怎么办？

**解决方案**：
- 检查 PIN 码是否正确（默认：123456）
- 确认环境变量 `PIN_CODE` 是否已设置
- 重新部署应用使环境变量生效

### 2. 文件上传失败怎么办？

**解决方案**：
- 检查网络连接是否正常
- 确认文件大小不超过 1GB
- 验证 CrustFiles.io Access Token 是否有效
- 查看浏览器控制台错误信息

### 3. 如何获取 CrustFiles.io Access Token？

1. 访问 [CrustFiles.io](https://crustfiles.io/)
2. 注册或登录账户
3. 进入用户设置页面
4. 找到 API Access Token 部分
5. 复制生成的 Token

### 4. 支持哪些文件格式？

- 图片：JPG、PNG、GIF、WebP 等
- 视频：MP4、WebM、MOV 等
- 音频：MP3、WAV、OGG 等
- 文档：PDF、DOCX、PPTX 等
- 压缩包：ZIP、RAR、7Z 等
- 其他：支持任意文件格式，取决于浏览器预览能力

### 5. 文件存储在哪里？

文件通过 Crust Network 上传到 IPFS 分布式存储网络，具有以下特点：
- 去中心化存储
- 内容寻址（CID）
- 永久可用
- 全球分布式节点

---

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. **Fork 本仓库**
2. **创建特性分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **开启 Pull Request**

---

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🔗 相关链接

- [Crust Network](https://crust.network/) - 去中心化存储网络
- [IPFS](https://ipfs.io/) - 星际文件系统
- [Next.js](https://nextjs.org/) - React 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架

---

## 📮 联系方式

如有问题或建议，请：

- 提交 [Issue](https://github.com/SpiritoXI/crustshare/issues)
- 发送邮件至: support@crustshare.com

---

<div align="center">

Made with ❤️ by CrustShare Team

</div>