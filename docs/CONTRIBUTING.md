# 贡献指南

感谢您有兴趣为 CrustShare 做贡献！

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [开发规范](#开发规范)
- [项目结构](#项目结构)
- [本地开发](#本地开发)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [许可证](#许可证)

---

## 行为准则

本项目采用贡献者公约作为行为准则。参与此项目即表示您同意遵守其条款。

---

## 如何贡献

### 报告问题

如果您发现了 bug 或有功能建议：

1. 在 [Issues](https://github.com/SpiritoXI/CrustShare/issues) 页面搜索是否已有相关问题
2. 如果没有，创建新的 Issue，使用以下模板：

**Bug 报告模板：**

```markdown
## 描述
简要描述问题

## 复现步骤
1. 执行 '...'
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

## 期望行为
描述您期望发生的情况

## 实际行为
描述实际发生的情况

## 截图
如果适用，添加截图帮助解释问题

## 环境
- OS: [例如 Windows 11]
- Browser: [例如 Chrome 120]
- Node.js: [例如 18.19.0]
- 项目版本: [例如 3.2.0]
```

**功能建议模板：**

```markdown
## 功能描述
清晰简洁地描述您希望添加的功能

## 问题背景
描述这个功能要解决什么问题

## 建议方案
描述您建议的解决方案

## 替代方案
描述您考虑过的其他解决方案

## 附加信息
在此添加关于功能请求的其他信息
```

---

## 开发环境设置

### 系统要求

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 18.0.0 | 推荐使用 LTS 版本 |
| pnpm | >= 8.0.0 | 推荐使用 pnpm |
| Git | >= 2.0.0 | 版本控制 |

### 推荐工具

| 工具 | 用途 |
|------|------|
| VS Code | 代码编辑器 |
| Chrome DevTools | 调试 |
| Postman | API 测试 |

### VS Code 推荐扩展

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### 克隆与安装

```bash
# 1. Fork 仓库到您的 GitHub 账户

# 2. 克隆您的 Fork
git clone https://github.com/YOUR_USERNAME/CrustShare.git
cd CrustShare

# 3. 添加上游仓库
git remote add upstream https://github.com/SpiritoXI/CrustShare.git

# 4. 安装依赖
pnpm install

# 5. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入必要的配置

# 6. 启动开发服务器
pnpm dev
```

---

## 开发规范

### 代码风格

#### TypeScript 规范

```typescript
// 使用 interface 定义对象类型
interface User {
  id: string;
  name: string;
  email: string;
}

// 使用 type 定义联合类型或工具类型
type Status = 'pending' | 'active' | 'completed';

// 使用 const 断言定义常量
const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
} as const;

// 优先使用命名导出
export function formatDate(date: Date): string {
  return date.toISOString();
}

// 使用箭头函数作为回调
const filtered = items.filter((item) => item.active);
```

#### React 组件规范

```tsx
// 组件命名：PascalCase
// 文件命名：kebab-case

// 函数组件结构
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ 
  variant = 'primary', 
  children, 
  onClick 
}: ButtonProps) {
  return (
    <button
      className={cn(
        'base-styles',
        variant === 'primary' && 'primary-styles',
        variant === 'secondary' && 'secondary-styles'
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

#### CSS 规范

```tsx
// 使用 Tailwind CSS 类名
// 使用 cn() 函数合并类名
import { cn } from '@/lib/utils';

<div className={cn(
  'flex items-center gap-2',
  isActive && 'bg-primary',
  className
)}>
```

### 目录规范

```
components/
├── ui/              # 基础 UI 组件（shadcn/ui）
├── dashboard/       # 仪表板专用组件
├── modals/          # 弹窗组件
└── share/           # 分享页面组件

hooks/
├── use-dashboard.ts    # 仪表板核心逻辑
├── use-upload.ts       # 上传逻辑
└── index.ts            # 统一导出

lib/
├── api/             # API 模块
├── config.ts        # 配置常量
├── utils.ts         # 工具函数
└── store.ts         # 状态管理
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `FileList`, `UploadButton` |
| 文件 | kebab-case | `file-list.tsx`, `upload-button.tsx` |
| 函数 | camelCase | `formatDate`, `parseResponse` |
| 常量 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `API_TIMEOUT` |
| 类型/接口 | PascalCase | `FileItem`, `UploadOptions` |
| CSS 类 | kebab-case | `file-list-item`, `upload-progress` |

---

## 项目结构

```
crustshare/
├── app/                 # Next.js App Router
├── components/          # React 组件
│   ├── ui/             # 基础 UI 组件
│   ├── dashboard/      # 仪表板组件
│   ├── modals/         # 弹窗组件
│   └── share/          # 分享页面组件
├── hooks/              # 自定义 Hooks
├── lib/                # 核心库和工具函数
│   ├── api/           # API 模块
│   ├── config.ts      # 配置
│   └── utils.ts       # 工具函数
├── types/              # TypeScript 类型定义
├── public/             # 静态资源
└── docs/               # 文档
```

---

## 本地开发

### 开发命令

```bash
# 启动开发服务器
pnpm dev

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 修复代码格式
pnpm lint --fix

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

### 调试技巧

1. **使用 React DevTools**
   - 安装 React Developer Tools 浏览器扩展
   - 检查组件状态和 props

2. **使用 console 调试**
   ```typescript
   console.log('Debug:', { variable });
   console.table(arrayData);
   console.time('operation');
   // ... 操作
   console.timeEnd('operation');
   ```

3. **网络请求调试**
   - 使用 Chrome DevTools Network 面板
   - 检查请求和响应

---

## 提交规范

### 提交信息格式

本项目采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加文件预览功能` |
| `fix` | 修复 bug | `fix: 修复上传进度显示错误` |
| `docs` | 文档更新 | `docs: 更新 API 文档` |
| `style` | 代码格式（不影响功能）| `style: 格式化代码` |
| `refactor` | 重构代码 | `refactor: 重构上传逻辑` |
| `perf` | 性能优化 | `perf: 优化列表渲染性能` |
| `test` | 测试相关 | `test: 添加上传测试` |
| `chore` | 构建/工具相关 | `chore: 更新依赖版本` |
| `ci` | CI 配置 | `ci: 添加 GitHub Actions` |

### 提交示例

```bash
# 新功能
git commit -m "feat(dashboard): 添加批量删除功能"

# 修复 bug
git commit -m "fix(upload): 修复大文件上传超时问题"

# 文档更新
git commit -m "docs: 更新部署指南"

# 重构
git commit -m "refactor(hooks): 提取通用上传逻辑"
```

---

## Pull Request 流程

### 创建 PR 前检查清单

- [ ] 代码通过 `pnpm typecheck` 类型检查
- [ ] 代码通过 `pnpm lint` 代码检查
- [ ] 代码通过 `pnpm build` 构建
- [ ] 提交信息符合规范
- [ ] 更新了相关文档

### PR 步骤

1. **同步上游代码**

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

2. **创建功能分支**

```bash
git checkout -b feature/your-feature-name
```

3. **进行修改并提交**

```bash
git add .
git commit -m "feat: 添加某某功能"
```

4. **推送到您的 Fork**

```bash
git push origin feature/your-feature-name
```

5. **创建 Pull Request**
   - 访问您的 Fork 页面
   - 点击 "New Pull Request"
   - 填写 PR 模板

### PR 模板

```markdown
## 变更类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 其他

## 变更描述
简要描述此 PR 的变更内容

## 相关 Issue
关闭 #issue_number

## 测试说明
描述如何测试这些变更

## 截图
如果适用，添加截图

## 检查清单
- [ ] 代码通过类型检查
- [ ] 代码通过 lint 检查
- [ ] 代码通过构建
- [ ] 已更新文档
```

---

## 许可证

本项目采用 MIT 许可证。提交代码即表示您同意以相同许可证授权。

---

## 联系方式

如有问题，可以通过以下方式联系：

- 创建 [Issue](https://github.com/SpiritoXI/CrustShare/issues)
- 发送邮件至项目维护者

感谢您的贡献！🎉
