# CloudChan 开发者指南

本指南面向二次开发与维护者，介绍 CloudChan 的目录结构、前后端边界、关键数据模型与后端 API 约定。

## 架构概览

CloudChan 采用“静态站点 + 轻量后端代理”的无服务器架构：

- 前端：纯静态 HTML/CSS/原生 ESM JavaScript，运行在浏览器中
- 后端：Cloudflare Pages Functions，提供鉴权与 Upstash Redis 代理能力
- 存储：文件本体上传到 Crust（IPFS），元数据保存在 Upstash Redis

核心原则：敏感信息（Upstash Token、Crust Token、管理员密码）仅存在后端环境变量，前端不包含任何密钥。

## 目录结构

- `cloudchan/`：前端应用（静态资源）
  - `index.html`：主页面
  - `login.html`：登录页
  - `app.js`：主应用逻辑（文件/文件夹/上传/校验/分页/批量操作）
  - `ui.js`：UI 交互与渲染（Toast、弹窗、网关测速与下载选择）
  - `config.js`：前端配置（API 地址、网关默认列表、测速/缓存参数等）
- `functions/api/`：后端 API（Cloudflare Pages Functions）
  - `db_proxy.js`：数据库代理与业务 action 路由（文件/文件夹/维护接口）
  - `get_token.js`：获取 Crust 上传凭证（仅返回后端环境变量中的 Token）
  - `ipfs_verify.js`：在边缘侧进行 IPFS 可用性验证（供前端快速校验）
  - `_lib/`：后端通用封装
    - `auth.js`：管理员密码读取与校验
    - `request.js`：安全读取 JSON 请求体
    - `response.js`：统一 JSON 响应封装
    - `upstash.js`：Upstash REST 命令封装

## 环境变量

部署 Cloudflare Pages 时需要配置：

- `UPSTASH_URL`：Upstash Redis REST URL
- `UPSTASH_TOKEN`：Upstash Redis REST Token
- `ADMIN_PASSWORD`：管理员密码（建议至少 16 位，且避免出现在浏览器侧）
- `CRUST_TOKEN`：Crust API Key（后端原样下发给前端用于直连上传）

## 数据模型（元数据）

### 文件记录（File Record）

文件记录以 JSON 字符串形式存储在 Upstash List 中（键名见后端实现），常用字段：

- `id`：文件记录 ID（前端默认用时间戳生成）
- `name`：文件名
- `size`：文件大小（字节）
- `cid`：IPFS CID
- `date`：展示用时间字符串
- `folder_id`：所属文件夹 ID（默认 `default`）
- `hash`：可选，SHA-256（用于严格校验）
- `verified` / `verify_status` / `verify_message`：校验状态字段
- `uploadedAt`：可选，用于自动重试与超时判断

### 文件夹（Folder）

文件夹以 Hash 形式存储（`id -> JSON`）：

- `id`：文件夹 ID（默认文件夹固定为 `default`）
- `name`：文件夹名称
- `parentId`：父文件夹 ID（根目录为 `null`）
- `createdAt`：创建时间字符串

## 后端 API 约定

后端以 `GET/POST /api/db_proxy?action=xxx` 的方式提供 action 路由：

- 所有请求必须携带 `x-auth-token: <ADMIN_PASSWORD>`
- 所有非 GET 请求必须携带 `x-csrf-token`（前端会自动补齐）
- 返回格式统一为 JSON

常用 action（示例，不是完整列表）：

- `load_files`：加载文件列表
- `save_file`：保存/合并文件记录
- `delete_file` / `delete_files`：删除（支持批量）
- `rename_file`：重命名
- `move_file` / `move_files`：移动到文件夹（支持批量）
- `load_folders` / `create_folder` / `rename_folder` / `delete_folder`：文件夹 CRUD
- `propagate_file`：触发公共网关 HEAD 访问以“预热”内容
- `db_stats`：基础诊断信息（键是否存在/长度/TTL）

## 前端请求封装

前端 `app.js` 内提供统一封装：

- `App.secureFetch`：自动附带 CSRF Header
- `App.requestDbRaw / App.requestDbJson`：统一附带管理员密码、处理 401 与错误消息

建议新增 action 时优先通过 `App.requestDbJson` 访问，减少重复的鉴权与错误处理代码。

## 资源压缩（可选）

仓库包含静态资源压缩脚本：

- `npm run compress:assets`：压缩前端关键资源并输出到 `cloudchan/dist/`
- `npm run compress:assets:restore`：恢复 HTML 引用到未压缩版本

该流程用于发布前的体积优化；开发调试阶段可保持原始文件引用。

