# CrustShare

基于 Crust Network 和 IPFS 的去中心化文件存储与分享平台。

## 特性

- **去中心化存储** - 基于 Crust Network 和 IPFS，数据永久保存
- **多媒体支持** - 图片预览、视频/音频在线播放
- **智能网关** - 多网关测速，自动选择最优节点
- **密码保护** - 分享链接可设置访问密码
- **响应式设计** - 完美适配桌面、平板、手机

## 技术栈

- **框架**: Next.js 14 + React 18 + TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **状态**: Zustand + React Query
- **动画**: Framer Motion
- **存储**: Upstash Redis
- **部署**: Cloudflare Pages / Vercel

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local

# 启动开发服务器
npm run dev
```

## 环境变量

```env
# Upstash Redis
UPSTASH_URL=https://your-url.upstash.io
UPSTASH_TOKEN=your-token

# 管理员密码 (SHA256)
ADMIN_PASSWORD_HASH=your-hash

# Crust Token
CRUST_TOKEN=your-token
```

## 项目结构

```
crustshare/
├── app/                    # Next.js 应用
│   ├── dashboard/         # 文件管理页面
│   ├── share/[cid]/       # 分享页面
│   │   ├── page.tsx       # 页面入口
│   │   └── SharePage.tsx  # 分享页面组件
│   ├── layout.tsx
│   ├── page.tsx           # 登录页
│   └── globals.css
├── components/            # 组件
│   ├── ui/               # shadcn/ui 组件
│   ├── share/            # 分享页面组件
│   │   ├── password-gate.tsx
│   │   ├── file-info-card.tsx
│   │   ├── gateway-selector.tsx
│   │   ├── download-section.tsx
│   │   ├── ipfs-info-card.tsx
│   │   ├── share-header.tsx
│   │   └── share-footer.tsx
│   ├── modals/           # 模态框组件
│   ├── image-viewer.tsx  # 图片查看器
│   ├── media-player.tsx  # 媒体播放器
│   ├── sidebar.tsx
│   └── file-list.tsx
├── hooks/                # 自定义 Hooks
│   └── use-share-page.ts # 分享页面逻辑
├── lib/                  # 工具库
│   ├── api.ts           # API 服务
│   ├── config.ts        # 配置
│   ├── store.ts         # 状态管理
│   └── utils.ts         # 工具函数
├── functions/api/        # Cloudflare Functions
├── types/               # TypeScript 类型
└── middleware.ts        # 中间件
```

## 新增功能

### 分享页面 (SharePage)
- 密码保护访问
- 文件信息展示
- 图片预览 + 灯箱查看
- 视频/音频在线播放
- 智能网关选择
- 多网关测速
- IPFS 直接访问

### 媒体播放器 (MediaPlayer)
- 视频/音频播放
- 多网关自动切换
- 播放控制（播放/暂停/进度/音量）
- 全屏支持
- 播放速度调节

### 图片查看器 (ImageViewer)
- 缩略图预览
- 灯箱全屏查看
- 缩放/旋转
- 多网关自动切换

## 部署

### Cloudflare Pages

1. 连接 GitHub 仓库
2. 构建设置：
   - Framework: Next.js
   - Build command: `npm run build`
   - Output: `dist`
3. 添加环境变量
4. 部署

### Vercel

1. 导入 GitHub 仓库
2. 配置环境变量
3. 部署

## 开发

```bash
npm run dev      # 开发模式
npm run build    # 构建
npm run lint     # 代码检查
```

## 许可证

MIT
