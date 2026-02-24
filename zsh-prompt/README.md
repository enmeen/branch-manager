# BM 状态提示符 - Zsh 提示符增强

为使用 Branch Manager (bm) 的开发者在 Zsh 提示符中显示分支状态。

## 效果预览

```
➜  admin git:(feature/unlock-rights-retention-course-extension) [已发布测试]
```

不同状态显示不同颜色：
- 🔵 **已发布测试** - 蓝色
- 🟢 **已发布线上** - 绿色
- 🟡 **开发中** - 黄色
- 🟣 **已合并** - 紫色

## 前置要求

- [ ] 已安装 [Oh My Zsh](https://ohmyz.sh/)
- [ ] 已安装 `bm` 命令（branch-manager）

## 快速开始

### 安装

```bash
# 1. 进入 zsh-prompt 目录
cd /path/to/branch-manager/zsh-prompt

# 2. 运行安装脚本
source install.zsh install

# 3. 重新加载配置
source ~/.zshrc
```

### 卸载

```bash
# 进入 zsh-prompt 目录
cd /path/to/branch-manager/zsh-prompt

# 运行卸载脚本
source install.zsh uninstall

# 重新加载配置
source ~/.zshrc
```

## 工作原理

安装脚本会自动：

1. ✅ 检测 Oh My Zsh 安装
2. ✅ 备份现有的 `.zshrc` 配置
3. ✅ 复制主题文件到 `~/.zsh/custom/themes/`
4. ✅ 配置 `ZSH_CUSTOM` 和 `ZSH_THEME`
5. ✅ 支持一键卸载，恢复原有配置

## 文件说明

```
zsh-prompt/
├── install.zsh                 # 安装/卸载脚本
├── bm-robbyrussell.zsh-theme   # 自定义主题文件
└── README.md                   # 使用文档
```

## 故障排查

### 提示符没有显示 BM 状态

1. 确认当前目录是 `bm` 管理的 git 仓库
2. 确认 `bm info` 命令能正常执行
3. 确认当前分支在 `bm` 的需求分支列表中

### 主题显示不正常

检查主题文件是否正确复制：
```bash
ls -la ~/.zsh/custom/themes/bm-robbyrussell.zsh-theme
```

### 想要使用其他主题

修改 `~/.zshrc` 中的 `ZSH_THEME` 变量，但会失去 BM 状态显示功能。

## 技术细节

- **方案**: 自定义 Oh My Zsh 主题
- **基础主题**: robbyrussell
- **性能**: 每次显示提示符时调用 `bm info` 解析状态
- **兼容性**: macOS / Linux + Zsh + Oh My Zsh

## 开发

### 主题文件结构

```bash
PROMPT="..."
PROMPT+='$(git_prompt_info)$(bm_status_prompt) '

function bm_status_prompt() {
  # 1. 检查是否在 git 仓库
  # 2. 获取当前分支名
  # 3. 调用 bm info 获取状态
  # 4. 解析并返回带颜色的状态文本
}
```

### 自定义状态颜色

编辑 `bm-robbyrussell.zsh-theme` 中的 `case` 语句：
```bash
case "$branch_status" in
  "你的状态")
    echo " %{$fg[blue]%}[$branch_status]%{$reset_color%}"
    ;;
esac
```

## License

MIT
