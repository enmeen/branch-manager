<div align="center">

# Branch Manager (bm)

**标准化并自动化需求分支管理、环境发布与状态追踪的 CLI 工具**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/@enmeen/branch-manager)](https://www.npmjs.com/package/@enmeen/branch-manager)

</div>

## 功能特性

- 🌿 **统一分支管理** - 基于 prod 分支创建需求分支，或接管已有分支
- 🌲 **Git Worktree 管理** - 支持同仓库并行开发多个需求分支，无需频繁 checkout
- 🚀 **标准化发布流程** - 自动化 merge + push + 打开部署页面 + 更新状态
- 📊 **状态追踪** - 完整记录需求生命周期：开发中 → 已发布测试 → 已发布预发 → 已发布线上
- 🔄 **智能工作流** - 支持创建新分支或管理现有分支，自动返回原分支
- 💾 **项目隔离** - 自动识别 git 仓库，独立管理各项目数据
- 🎨 **交互式界面** - 友好的命令行交互，减少误操作

## 安装

```bash
# 使用 npm 安装
npm install -g @enmeen/branch-manager

# 或使用 pnpm 安装
pnpm add -g @enmeen/branch-manager

# 或使用 yarn 安装
yarn global add @enmeen/branch-manager
```

## 快速开始

### 1. 配置仓库（首次使用必须执行）

在每个需要使用 `bm` 的仓库中，首先执行配置命令：

```bash
bm set
```

**配置项：**
- **测试环境**（可选）- 分支名 + 部署 URL
- **预发环境**（可选）- 分支名 + 部署 URL
- **生产环境**（必填）- 分支名 + 部署 URL

**示例配置：**
```
测试环境分支: test
测试部署 URL: https://jenkins.example.com/job/test/build

预发环境分支: pre
预发部署 URL: https://jenkins.example.com/job/pre/build

生产环境分支: main
生产部署 URL: https://jenkins.example.com/job/prod/build
```

### 2. 创建需求分支

```bash
bm add
```

**两种模式：**

#### 模式一：创建新分支
- 从 prod 分支创建新的需求分支
- 自动切换到新分支
- 初始化状态为"开发中"

#### 模式二：添加现有分支
- 选择已存在的分支纳入管理
- 自动切换到目标分支
- 初始化状态为"开发中"

### 3. 发布到环境

```bash
bm deploy
```

**发布流程：**
1. 选择发布环境（test/pre/prod）
2. 切换到目标环境分支
3. 拉取最新代码
4. 合并当前需求分支
5. 推送到远端
6. 自动打开部署页面
7. 确认发布完成
8. 更新需求状态
9. 可选：返回原开发分支

**特性：**
- ✅ 智能处理合并冲突
- ✅ 线上发布需要二次确认
- ✅ 支持冲突中止或继续
- ✅ 发布完成后自动返回原分支

### 4. 查看分支状态

```bash
bm info
```

**显示信息：**
- 所有被管理的需求分支
- 当前分支状态
- 关联的需求文档链接
- 部署历史记录

### 5. 并行开发（Worktree）

```bash
# 创建 worktree（分支不存在时可指定 --base）
bm wt add --branch feature/a --base main

# 列出所有 worktree
bm wt list

# 删除 worktree（有未提交改动会拒绝，可加 --force）
bm wt remove --path ./.worktrees/feature/a

# 清理失效 worktree 引用
bm wt prune
```

## 命令详解

### `bm set`

配置仓库的环境分支和部署 URL（首次使用必须执行）

```bash
bm set
```

**交互流程：**
1. 展示当前配置（如果已配置）
2. 询问是否更新配置
3. 依次配置各环境（测试/预发可选，生产必填）
4. 保存配置到 `~/.bm/config.json`

### `bm add`

基于 prod 分支创建需求分支，或添加现有分支到管理

```bash
bm add
```

**交互流程：**
1. 选择模式：创建新分支 / 添加现有分支
2. 输入或选择分支名
3. 输入需求文档 URL（可选）
4. 自动切换到目标分支
5. 保存到 `~/.bm/state.json`

**创建新分支模式：**
- 检查分支是否已存在
- 同步 prod 分支最新代码
- 从 prod 创建新分支
- 保存分支信息

**添加现有分支模式：**
- 列出所有本地需求分支（排除环境分支）
- 选择要管理的分支
- 保存分支信息

### `bm deploy`

将当前需求分支发布到指定环境

```bash
bm deploy
```

**发布步骤：**
1. **检查环境** - 验证工作区干净、仓库已配置
2. **选择环境** - 显示已配置的环境供选择
3. **确认发布** - 生产环境需要二次确认
4. **切换分支** - 切换到目标环境分支
5. **拉取代码** - 确保目标分支是最新
6. **合并分支** - 合并当前需求分支到目标分支
7. **处理冲突** - 如有冲突，提供中止/继续选项
8. **推送远端** - 推送合并后的代码
9. **打开部署** - 自动在浏览器打开部署页面
10. **确认完成** - 等待用户确认部署成功
11. **更新状态** - 更新需求状态为对应环境的已发布
12. **返回分支** - 可选择返回原开发分支

**错误处理：**
- 合并冲突时，提示手动解决并提供继续/中止选项
- 状态更新失败时，记录警告但不影响发布结果
- 任何步骤失败都会中止流程并提示

### `bm info`

查看当前仓库所有由 bm 管理的需求分支与状态信息

```bash
bm info
```

**显示内容：**
- 仓库标识
- 所有需求分支列表
- 每个分支的：
  - 分支名
  - 当前状态
  - 需求文档
  - 部署历史
- 当前所在分支高亮显示

### `bm wt`

Git Worktree 子命令组，用于在同一仓库并行开发多个分支。

#### `bm wt add --branch <name> [--base <branch>] [--path <dir>] [--doc <text>]`

- 创建并检出 worktree
- 当分支不存在时，从 `--base`（未传则当前分支）创建新分支
- 可通过 `--doc` 传入需求文档链接/描述，并写入 bm 状态（`bm info` 可见）
- 默认目录优先级：
  1. 仓库内 `.worktrees/`
  2. 仓库内 `worktrees/`
  3. 若都不存在，自动创建 `.worktrees/`
- 对仓库内 worktree 路径会校验是否被 `.gitignore` 忽略；未忽略直接报错

#### `bm wt list`

- 列出当前仓库所有 worktree
- 输出字段包含：`path`、`branch`、`head`、`isCurrent`、`isLocked`

#### `bm wt remove --path <dir> [--force]`

- 移除指定 worktree
- 默认会检查该 worktree 是否有未提交改动，有改动时拒绝删除
- 传 `--force` 可强制删除

#### `bm wt prune`

- 执行 `git worktree prune`，清理无效引用

#### `bm wt open --branch <name>`

- 输出该分支对应的 worktree 路径（便于脚本/自动化工具快速跳转）

#### `bm wt switch --branch <name>`

- 直接进入该分支对应的 worktree 目录
- 实现方式为开启一个 `cwd` 在目标目录的子 shell
- 退出子 shell（`exit`）后返回原 shell

## JSON 模式（AI/自动化）

全局参数 `--json` 可用于所有命令，返回统一结构：

```json
{
  "success": true,
  "data": {}
}
```

失败时：

```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

### Worktree 命令 JSON 字段

- `bm --json wt add`
  - `success`, `branch`, `path`, `created`, `baseBranch`, `repository`
- `bm --json wt list`
  - `success`, `repository`, `items[]`
- `bm --json wt remove`
  - `success`, `path`, `removed`
- `bm --json wt prune`
  - `success`
- `bm --json wt open`
  - `success`, `path`, `branch`
- `bm --json wt switch`
  - `success`, `path`, `branch`, `entered`

### Worktree 相关错误码

- `NOT_GIT_REPO`
- `UNCOMMITTED_CHANGES`
- `WORKTREE_PATH_NOT_IGNORED`
- `WORKTREE_ALREADY_EXISTS`
- `BRANCH_ALREADY_CHECKED_OUT`
- `WORKTREE_NOT_FOUND`
- `WORKTREE_REMOVE_FAILED`
- `WORKTREE_ADD_FAILED`

## 分支状态

需求分支的状态会随发布自动更新：

| 状态 | 说明 | 触发条件 |
|------|------|----------|
| `开发中` | 正在开发的分支 | 创建分支时 |
| `已发布测试` | 已发布到测试环境 | 发布到 test 环境 |
| `已发布预发` | 已发布到预发环境 | 发布到 pre 环境 |
| `已发布线上` | 已发布到生产环境 | 发布到 prod 环境 |

## 数据存储

**存储位置：**
- `~/.bm/config.json` - 仓库配置（环境分支、部署 URL）
- `~/.bm/state.json` - 需求状态（分支信息、状态、历史）

**项目识别：**
- 通过 `git remote get-url origin` 自动识别仓库
- 自动将不同仓库的数据隔离存储
- 支持多种 URL 格式（HTTPS/SSH）

**数据结构：**

```json
// config.json
{
  "gitlab.com/group/project": {
    "branches": {
      "test": "test",
      "pre": "pre",
      "prod": "main"
    },
    "deployUrls": {
      "test": "https://jenkins.example.com/job/test/build",
      "pre": "https://jenkins.example.com/job/pre/build",
      "prod": "https://jenkins.example.com/job/prod/build"
    }
  }
}

// state.json
{
  "gitlab.com/group/project": {
    "feature/login": {
      "branch": "feature/login",
      "doc": "https://example.com/docs/login",
      "baseBranch": "main",
      "status": "已发布测试",
      "createdAt": 1737456000000,
      "updatedAt": 1737542400000,
      "deployHistory": [
        {
          "env": "test",
          "timestamp": 1737542400000
        }
      ]
    }
  }
}
```

## 工作流示例

### 典型使用流程

```bash
# 1. 首次使用，配置仓库
$ bm set
# → 配置 test/pre/prod 环境分支和部署 URL

# 2. 创建新需求分支
$ bm add
# → 选择"创建新分支"
# → 输入分支名: feature/user-profile
# → 输入需求文档: https://docs.example.com/user-profile
# → 自动从 main 创建分支并切换

# 3. 开发完成后，发布到测试环境
$ bm deploy
# → 选择环境: test
# → 自动合并到 test 分支
# → 自动打开部署页面
# → 确认发布完成
# → 状态更新为"已发布测试"
# → 自动返回 feature/user-profile

# 4. 测试通过后，发布到预发
$ bm deploy
# → 选择环境: pre
# → 重复发布流程
# → 状态更新为"已发布预发"

# 5. 预发验证后，发布到生产
$ bm deploy
# → 选择环境: prod
# → 二次确认发布
# → 重复发布流程
# → 状态更新为"已发布线上"

# 6. 查看所有需求状态
$ bm info
# → 显示所有管理的分支及其状态
```

### 接管已有分支

```bash
# 如果你已经手动创建了分支
$ git checkout -c feature/new-feature

# 使用 bm 管理它
$ bm add
# → 选择"添加现有分支"
# → 选择 feature/new-feature
# → 输入需求文档 URL
# → 分支纳入管理
```

## 技术栈

- **Node.js** >= 18.0.0
- **TypeScript** 5.3
- **Commander.js** - CLI 框架
- **Inquirer.js** - 交互式命令行
- **Chalk** - 终端颜色
- **fs-extra** - 文件操作
- **open** - 浏览器打开

## 常见问题

### Q: 为什么 `bm set` 后无法发布？

A: 检查配置是否完整，生产环境是必填项。可以执行 `bm set` 查看当前配置。

### Q: 发布时提示"工作区有未提交的改动"？

A: 需要先提交或暂存当前的代码修改，确保工作区干净。

### Q: 合并冲突如何处理？

A: `bm deploy` 会检测到冲突并提示：
- 选择"中止"会取消本次发布，回到冲突前状态
- 选择"继续"会等待你手动解决冲突，按回车后继续发布

### Q: 可以跳过测试/预发直接发布生产吗？

A: 可以，但会有警告提示。建议按测试 → 预发 → 生产的流程发布。

### Q: 如何迁移旧版本数据？

A: 旧版本数据在 `~/.branch-manager/data.json`，新版本在 `~/.bm/`。由于数据结构完全不同，建议重新配置和添加分支。

## 开发

```bash
# 克隆项目
git clone https://github.com/enmeen/branch-manager.git
cd branch-manager

# 安装依赖
pnpm install

# 开发模式（热重载）
pnpm run dev

# 编译
pnpm run build

# 全局链接（本地测试）
npm link
```

## License

[MIT](LICENSE) © 2025 enmeen

## 贡献

欢迎贡献代码、报告问题或提出建议！

- GitHub Issues: [提交问题](https://github.com/enmeen/branch-manager/issues)
- Pull Requests: [贡献代码](https://github.com/enmeen/branch-manager/pulls)

---

<div align="center">

**如果觉得有用，请给个 ⭐️ Star 支持一下！**

Made with ❤️ by [enmeen](https://github.com/enmeen)

</div>
