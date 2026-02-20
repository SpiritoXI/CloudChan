# 贡献指南

感谢您有兴趣为 CrustShare 做贡献！

## 如何贡献

### 报告问题

如果您发现了 bug 或有功能建议：

1. 在 [Issues](https://github.com/SpiritoXI/CrustShare/issues) 页面搜索是否已有相关问题
2. 如果没有，创建新的 Issue，详细描述问题或建议

### 提交代码

1. **Fork 仓库**

```bash
git clone https://github.com/YOUR_USERNAME/CrustShare.git
cd CrustShare
```

2. **创建分支**

```bash
git checkout -b feature/your-feature-name
```

3. **安装依赖**

```bash
pnpm install
```

4. **进行修改**

确保代码风格一致，添加必要的测试。

5. **提交更改**

```bash
git add .
git commit -m "feat: 添加某某功能"
```

提交信息格式：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

6. **推送分支**

```bash
git push origin feature/your-feature-name
```

7. **创建 Pull Request**

## 开发规范

### 代码风格

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码

### 组件规范

- 使用函数组件和 Hooks
- 组件命名使用 PascalCase
- 文件命名使用 kebab-case

### Git 规范

- 提交信息使用中文或英文
- 每次提交只做一件事
- 提交前确保代码可正常运行

## 项目结构

```
crustshare/
├── app/                 # Next.js 应用目录
├── components/          # React 组件
├── lib/                 # 核心库和工具函数
├── types/               # TypeScript 类型定义
├── public/              # 静态资源
└── docs/                # 文档
```

## 本地开发

```bash
# 启动开发服务器
pnpm dev

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 构建
pnpm build
```

## 许可证

本项目采用 MIT 许可证。提交代码即表示您同意以相同许可证授权。
