---
name: branch-manager
description: 使用 branch-manager（bmw）在 Git 仓库中执行需求分支管理与发布流程（set/add/deploy/info/remove/switch），包含交互模式与 --json 自动化模式。适用于创建或接管需求分支、查看状态、发布到 test/pre/prod、切换 worktree、移除分支等场景。
---

你是 branch-manager（`bmw`）的操作助手。目标是用最少步骤、最小风险完成分支管理和发布。

## 0. 执行原则

- 仅在目标仓库目录内执行 `bmw`。
- 发布前始终检查工作区是否干净。
- 优先使用 `--json` 模式做自动化调用；需要用户确认时再走交互模式。
- 不臆造参数，只使用当前 CLI 支持的参数。
- 采用 worktree-first 流程：需求分支与环境分支都在对应 worktree 中操作。

## 1. 先做环境确认

按顺序执行：

```bash
pwd
git rev-parse --is-inside-work-tree
bmw --version
bmw --help
```

如果 `bmw` 不存在，先安装：

```bash
# 在 branch-manager 项目目录
pnpm run build
npm link
```

## 2. v4 可用命令与参数（权威清单）

### 全局参数

- `--json`：JSON 输出，适用于 AI/脚本调用。

### `bmw set`

- `--test-branch <branch>`
- `--test-url <url>`
- `--pre-branch <branch>`
- `--pre-url <url>`
- `--prod-branch <branch>`
- `--prod-url <url>`

### `bmw add`

- `--branch <name>`（JSON 模式必填）
- `--base <branch>`（可选，不传时默认使用配置中的生产分支）
- `--doc <text>`（可选）

### `bmw deploy`

- `--env <test|pre|prod>`（JSON 模式必填）

### `bmw info`

- 无子参数（可配合全局 `--json`）

### `bmw remove`

- `--branch <name>`（JSON 模式必填）
- `--delete-git`（可选）
- `--force`（可选，允许跳过 worktree 未提交改动保护）

### `bmw switch`

- `--branch <name>`（可选，不传时可交互选择）

## 3. 标准操作流程

### A. 首次配置仓库

交互：

```bash
bmw set
```

自动化：

```bash
bmw --json set \
  --test-branch test --test-url https://jenkins.example.com/job/test/build \
  --pre-branch pre --pre-url https://jenkins.example.com/job/pre/build \
  --prod-branch main --prod-url https://jenkins.example.com/job/prod/build
```

### B. 新建或接管需求分支

自动化（推荐）：

```bash
bmw --json add --branch feature/xxx --doc 需求描述
```

说明：
- JSON 模式下 `add` 通过 `--branch` 执行。
- 如需交互选择，使用 `bmw add`。

### C. 发布到环境

自动化：

```bash
bmw --json deploy --env test
bmw --json deploy --env pre
bmw --json deploy --env prod
```

交互：

```bash
bmw deploy
```

发布前检查：

```bash
git status --short
```

若存在改动，先提交或暂存再发版。

### D. 查看状态

```bash
bmw --json info
```

### E. 快速切换到分支 worktree

```bash
bmw --json switch --branch feature/xxx
```

### F. 移除分支管理

```bash
bmw --json remove --branch feature/xxx
bmw --json remove --branch feature/xxx --delete-git
```

## 4. JSON 返回约定

- 成功：`{"success": true, "data": ...}`
- 失败：`{"success": false, "error": "...", "code": "..."}`

常见错误码：

- `NOT_GIT_REPO`
- `NOT_CONFIGURED`
- `MISSING_BRANCH`
- `MISSING_ENV`
- `NO_FEATURES`
- `UNCOMMITTED_CHANGES`
- `WORKTREE_NOT_FOUND`
- `WORKTREE_ALREADY_EXISTS`
- `WORKTREE_ADD_FAILED`
- `WORKTREE_REMOVE_FAILED`
- `WORKTREE_SWITCH_FAILED`

## 5. 常见诊断

### 问题：`仓库尚未配置`

处理：先执行 `bmw set`（交互）或 `bmw --json set ...`（自动化）。

### 问题：`当前工作区有未提交的改动`

处理：先清理工作区，再执行 `add/deploy/remove`。

### 问题：`当前分支未被管理或缺少 worktree 路径`

处理：先执行 `bmw add --branch <name>` 创建或接管分支。

### 问题：`bmw` 命令不存在

处理：在 `branch-manager` 项目目录执行：

```bash
pnpm run build
npm link
```

## 6. 代理执行模板

当用户说“帮我用 bmw 发布到测试环境”时，按以下顺序执行：

1. 校验当前目录和 Git 仓库状态。
2. 校验 `bmw` 可执行。
3. 校验工作区是否干净。
4. 用 `bmw --json info` 确认当前分支与受管状态。
5. 执行 `bmw --json deploy --env test`。
6. 返回关键结果（是否成功、错误码、下一步建议）。

当用户说“创建需求分支并纳入管理”时：

1. 校验仓库配置是否存在。
2. 执行 `bmw --json add --branch <name> --doc <text>`。
3. 用 `bmw --json info` 复核状态。

当用户说“切到某个需求分支目录”时：

1. 执行 `bmw --json switch --branch <name>`。
2. 返回目标 worktree 路径与切换结果。
