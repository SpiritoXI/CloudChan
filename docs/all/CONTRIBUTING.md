# 贡献指南

感谢你对 CrustShare 项目的关注！我们欢迎所有形式的贡献。

---

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [问题报告](#问题报告)
- [功能请求](#功能请求)

---

## 行为准则

### 我们的承诺

为了营造开放和友好的环境，我们承诺：

- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化语言或图像
- 恶意评论或人身攻击
- 公开或私下骚扰
- 未经许可发布他人的私人信息
- 其他不专业或不恰当的行为

---

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请：

1. 检查 [Issues](../../issues) 确认该问题是否已被报告
2. 如果未被报告，创建新的 Issue
3. 在 Issue 中提供：
   - 详细的复现步骤
   - 预期行为
   - 实际行为
   - 截图或日志（如适用）
   - 环境信息（Node.js 版本、操作系统等）

### 建议新功能

我们有计划添加许多新功能。如果你有好的想法：

1. 先检查 [Issues](../../issues) 是否已有类似请求
2. 如果没有，创建新的 Feature Request Issue
3. 清晰描述：
   - 新功能的用途和价值
   - 使用场景
   - 实现建议（如有）

### 提交代码

我们欢迎代码贡献！请遵循以下流程：

1. Fork 本仓库
2. 创建特性分支
3. 进行开发
4. 确保代码通过测试
5. 提交 Pull Request

---

## 开发流程

### 1. 设置开发环境

```bash
# 克隆你的 Fork
git clone https://github.com/YOUR_USERNAME/crustshare.git
cd crustshare

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
node scripts/generate-config.js

# 启动开发服务器
pnpm dev
```

### 2. 创建分支

为每个功能或 Bug 修复创建独立分支：

```bash
# 功能分支
git checkout -b feature/your-feature-name

# Bug 修复分支
git checkout -b fix/your-bug-fix

# 文档更新分支
git checkout -b docs/your-doc-update
```

### 3. 开发

- 遵循项目代码规范
- 编写清晰的代码和注释
- 确保类型安全（TypeScript）
- 测试你的更改

### 4. 测试

```bash
# 运行类型检查
pnpm tsc --noEmit

# 运行构建
pnpm build

# 启动开发服务器测试
pnpm dev
```

### 5. 提交代码

```bash
# 添加更改
git add .

# 提交（遵循提交规范）
git commit -m "feat: add file upload progress bar"

# 推送到你的 Fork
git push origin feature/your-feature-name
```

### 6. 创建 Pull Request

1. 访问 GitHub 上的你的 Fork
2. 点击 "New Pull Request"
3. 选择你的分支
4. 填写 PR 模板
5. 等待代码审查

---

## 代码规范

### TypeScript

- 使用严格模式：`"strict": true`
- 明确类型声明，避免 `any`
- 使用接口定义数据结构
- 保持代码简洁和可读

```typescript
// ✅ 好
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return fetch(`/api/users/${id}`).then(res => res.json());
}

// ❌ 避免
function getUser(id) {
  return fetch(`/api/users/${id}`).then(res => res.json());
}
```

### React/Next.js

- 使用函数组件和 Hooks
- 保持组件小而专注
- 正确使用 `useEffect` 依赖数组
- 避免在渲染中进行副作用

```typescript
// ✅ 好
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  if (!user) return <div>Loading...</div>;

  return <div>{user.name}</div>;
}

// ❌ 避免
function UserProfile({ userId }) {
  const [user, setUser] = useState();

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, []); // 缺少 userId 依赖

  return <div>{user.name}</div>;
}
```

### 样式

- 使用 Tailwind CSS 工具类
- 保持样式一致性
- 遵循水晶风格设计系统

```typescript
// ✅ 好
<div className="crystal-card crystal-dialog p-4 rounded-lg">
  <h2 className="text-lg font-semibold">标题</h2>
</div>

// ❌ 避免
<div style={{ padding: '16px', borderRadius: '8px' }}>
  <h2 style={{ fontSize: '18px', fontWeight: '600' }}>标题</h2>
</div>
```

### 文件命名

- 组件文件使用 PascalCase：`UserProfile.tsx`
- 工具文件使用 camelCase：`stringUtils.ts`
- API 路由使用小写：`api/users/route.ts`

---

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构（既不是新功能也不是 Bug 修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关

### 示例

```bash
# 新功能
git commit -m "feat(auth): add JWT token verification"

# Bug 修复
git commit -m "fix(upload): resolve file size calculation error"

# 文档
git commit -m "docs(readme): update deployment instructions"

# 重构
git commit -m "refactor(components): simplify file upload logic"
```

### Pull Request 标题

PR 标题也应遵循相同规范：

- ✅ `feat: add file upload progress bar`
- ✅ `fix: resolve login validation bug`
- ✅ `docs: update API documentation`
- ❌ `Update code`
- ❌ `Fix bug`
- ❌ `Add new feature`

---

## 问题报告

### Bug 报告模板

```markdown
**描述**
清晰简洁地描述问题。

**复现步骤**
1. 进入 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

**预期行为**
描述你期望发生的事情。

**实际行为**
描述实际发生的事情（包括错误消息）。

**截图**
如果适用，添加截图帮助说明问题。

**环境信息**
- OS: [e.g. macOS 14.0]
- Browser: [e.g. Chrome 120]
- Node.js Version: [e.g. 24.0.0]
- CrustShare Version: [e.g. 1.0.0]

**附加信息**
任何其他相关信息、代码片段或日志。
```

---

## 功能请求

### 功能请求模板

```markdown
**问题描述**
清晰简洁地描述你想要的功能。

**为什么需要这个功能？**
解释这个功能的价值和用途。

**建议的解决方案**
描述你希望如何实现这个功能。

**替代方案**
描述你考虑过的任何替代解决方案。

**附加信息**
任何其他相关信息、截图或示例。
```

---

## 代码审查

### 作为贡献者

- 响应审查者的反馈
- 感谢审查者的时间
- 保持开放的心态
- 准备好讨论不同的实现方式

### 作为审查者

- 提供建设性的反馈
- 专注于代码质量和最佳实践
- 尊重贡献者的工作
- 帮助改进代码

### 审查清单

- [ ] 代码遵循项目规范
- [ ] TypeScript 类型检查通过
- [ ] 构建成功
- [ ] 功能按预期工作
- [ ] 包含必要的测试
- [ ] 文档已更新
- [ ] 提交消息遵循规范

---

## 获取帮助

如果你需要帮助：

1. 查看 [README.md](README.md) 了解项目概况
2. 查看 [API.md](API.md) 了解 API 文档
3. 查看 [DEPLOYMENT.md](DEPLOYMENT.md) 了解部署指南
4. 在 [Issues](../../issues) 中搜索类似问题
5. 创建新的 Issue 提问

---

## 许可证

通过贡献代码，你同意你的贡献将在 [MIT License](LICENSE) 下授权。

---

## 感谢

感谢所有为 CrustShare 做出贡献的人！

---

<div align="center">

Made with ❤️ by CrustShare Community

</div>
