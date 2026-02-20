# 更新日志

所有项目的显著变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 目录

- [3.3.0](#330---2026-02-20)
- [3.2.0](#320---2026-02-20)
- [3.1.0](#310---2026-02-03)
- [3.0.0](#300---2026-01-30)
- [2.0.0](#200---2025-12-16)
- [1.0.0](#100---2025-12-05)
- [版本说明](#版本说明)

---

## [3.3.0] - 2026-02-20

### 新增

- **代码结构整合**
  - 新增 `lib/db/` 数据库模块
  - 新增 `lib/utils/` 工具函数模块
  - 新增 `lib/index.ts` 统一入口

- **测试脚本整合**
  - `tests/api/` API 测试脚本
  - `tests/gateway/` 网关测试脚本

- **构建脚本整合**
  - `scripts/build/` 构建相关脚本

### 变更

- **lib/ 目录重构**
  - `lib/upstash.ts` → `lib/db/upstash.ts`
  - `lib/security.ts` → `lib/utils/security.ts`
  - `lib/error-handler.ts` → `lib/utils/error.ts`
  - 工具函数整合到 `lib/utils/format.ts`

- **文档整合**
  - 所有文档移动到 `docs/` 文件夹
  - 根目录 README.md 简化为入口文档
  - 新增 `docs/INDEX.md` 文档索引

### 移除

- 根目录冗余文档文件
- `lib/` 目录下分散的工具文件

---

## [3.2.0] - 2026-02-20

### 新增

- **永久存储功能**
  - 上传后自动创建存储订单
  - 基于 crustfiles.io 免费永久存储服务
  - 无需 CRU 代币，完全免费

- **存储订单 API**
  - 新增 `createStorageOrder` 方法
  - 支持自定义存储月数
  - 自动续期机制

- **智能下载系统**
  - 多网关自动切换
  - 下载队列管理
  - 断点续传支持
  - 下载历史记录

- **传播检测 API**
  - 智能传播到多个网关
  - 后台传播支持
  - 激进传播模式

### 变更

- **lib/config.ts**
  - 添加 `ORDER_API` 配置
  - 添加 `DEFAULT_STORAGE_MONTHS` 配置（1200个月）
  - 更新上传限制为 1GB

- **lib/api/upload.ts**
  - `uploadToCrust` 新增重试机制
  - 返回结果新增 `orderCreated` 字段

- **lib/api/gateway.ts**
  - 新增健康度评分系统
  - 新增网关缓存机制
  - 新增多网关并发测试

### 文档

- 重构 README.md，更清晰的项目介绍
- 新增 README_EN.md 英文文档
- 新增 docs/API.md API 文档
- 更新配置说明，说明 crustfiles.io 免费存储

---

## [3.1.0] - 2026-02-03

### 新增

- Redis 连接失败降级处理机制
  - 自动重试机制（默认3次）
  - 指数退避策略
  - 内存缓存降级方案
- Crust 上传重试机制
  - 网络错误自动重试
  - 服务器错误自动重试
  - 指数退避延迟策略
- localStorage 存储限制处理
  - 网关缓存数量限制
  - 健康度历史记录限制

### 修复

- 修复 CONFIG.API_GET_TOKEN 引用错误
- 修复文件大小格式化边界情况

---

## [3.0.0] - 2026-01-30

### 新增

- 全新设计的用户界面
  - 基于 shadcn/ui 的现代化组件
  - 响应式设计，支持移动端
  - 暗黑模式支持
- 文件管理功能
  - 文件上传（拖拽、点击）
  - 文件列表展示（列表/网格视图）
  - 文件搜索和排序
  - 批量操作（移动、复制、删除）
  - 文件重命名
- 文件夹管理
  - 创建文件夹
  - 重命名文件夹
  - 删除文件夹
- 智能网关系统
  - 自动测试网关可用性
  - 延迟检测
  - 健康度评分
  - 智能选择最优网关
- 文件分享功能
  - 生成分享链接
  - 密码保护
  - 过期时间设置
- 多媒体支持
  - 图片预览
  - 视频在线播放
  - 音频在线播放
- CID 导入功能

### 技术栈升级

- Next.js 14
- React 18
- TypeScript 5
- Tailwind CSS 3
- Zustand 4
- Framer Motion
- TanStack Query 5

---

## [2.0.0] - 2025-12-16

### 新增

- 基础文件上传功能
- IPFS 网关支持
- 简单的文件列表
- 基础分享功能

---

## [1.0.0] - 2025-12-05

### 新增

- 项目初始化
- 基础架构搭建
- 概念验证版本

---

## 版本说明

### 版本号格式

版本号格式：主版本号.次版本号.修订号（MAJOR.MINOR.PATCH）

| 类型 | 说明 |
|------|------|
| **主版本号 (MAJOR)** | 做了不兼容的 API 修改 |
| **次版本号 (MINOR)** | 做了向下兼容的功能性新增 |
| **修订号 (PATCH)** | 做了向下兼容的问题修正 |

### 变更类型说明

| 类型 | 说明 |
|------|------|
| **新增 (Added)** | 新添加的功能 |
| **修复 (Fixed)** | 修复的问题 |
| **变更 (Changed)** | 对现有功能的变更 |
| **弃用 (Deprecated)** | 即将被移除的功能 |
| **移除 (Removed)** | 已移除的功能 |
| **安全 (Security)** | 安全相关的修复 |

---

[3.3.0]: https://github.com/SpiritoXI/CrustShare/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/SpiritoXI/CrustShare/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/SpiritoXI/CrustShare/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/SpiritoXI/CrustShare/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/SpiritoXI/CrustShare/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/SpiritoXI/CrustShare/releases/tag/v1.0.0
