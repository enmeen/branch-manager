#!/bin/zsh
# BM 状态提示符安装脚本
# 使用方法: source install.zsh install

# 颜色定义
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# 检测 Oh My Zsh
check_oh_my_zsh() {
  if [[ ! -d "$HOME/.oh-my-zsh" ]]; then
    log_error "未检测到 Oh My Zsh 安装"
    echo "请先安装 Oh My Zsh: sh -c \"\$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)\""
    return 1
  fi
  log_info "检测到 Oh My Zsh"
  return 0
}

# 检测当前主题
get_current_theme() {
  grep "^ZSH_THEME=" "$HOME/.zshrc" 2>/dev/null | sed 's/ZSH_THEME="//' | sed 's/"//'
}

# 备份 .zshrc
backup_zshrc() {
  local backup_file="$HOME/.zshrc.bm-backup.$(date +%Y%m%d%H%M%S)"
  cp "$HOME/.zshrc" "$backup_file"
  log_info "已备份 .zshrc 到 $backup_file"
  echo "$backup_file"
}

# 安装
install() {
  echo ""
  echo "======================================"
  echo "  BM 状态提示符安装"
  echo "======================================"
  echo ""

  # 检查 Oh My Zsh
  if ! check_oh_my_zsh; then
    return 1
  fi

  # 检测当前主题
  local current_theme=$(get_current_theme)
  log_info "当前主题: ${current_theme:-default}"

  # 备份 .zshrc
  local backup_file=$(backup_zshrc)

  # 创建目录
  mkdir -p "$HOME/.zsh/custom/themes"

  # 获取脚本所在目录
  local script_dir="${0:A:h}"

  # 复制主题文件
  if [[ -f "$script_dir/bm-robbyrussell.zsh-theme" ]]; then
    cp "$script_dir/bm-robbyrussell.zsh-theme" "$HOME/.zsh/custom/themes/"
    log_info "已复制主题文件"
  else
    log_error "主题文件不存在: $script_dir/bm-robbyrussell.zsh-theme"
    return 1
  fi

  # 修改 .zshrc
  if ! grep -q "^ZSH_CUSTOM=" "$HOME/.zshrc"; then
    echo "" >> "$HOME/.zshrc"
    echo "# Branch Manager - 自定义主题目录" >> "$HOME/.zshrc"
    echo "ZSH_CUSTOM=~/.zsh/custom" >> "$HOME/.zshrc"
    log_info "已添加 ZSH_CUSTOM 配置"
  else
    log_info "ZSH_CUSTOM 配置已存在"
  fi

  # 修改主题 - 简化版：直接替换
  if grep -q "^ZSH_THEME=" "$HOME/.zshrc"; then
    # 备份并替换
    local timestamp=$(date +%Y%m%d%H%M%S)
    sed -i.bak.$timestamp 's/^ZSH_THEME=".*"/ZSH_THEME="bm-robbyrussell"/' "$HOME/.zshrc" 2>/dev/null || \
    sed -i '' 's/^ZSH_THEME=".*"/ZSH_THEME="bm-robbyrussell"/' "$HOME/.zshrc"
    log_info "已修改主题配置为 bm-robbyrussell"
  else
    echo "" >> "$HOME/.zshrc"
    echo 'ZSH_THEME="bm-robbyrussell"' >> "$HOME/.zshrc"
    log_info "已添加主题配置"
  fi

  echo ""
  log_info "安装完成！"
  echo ""
  echo "📝 下一步操作:"
  echo "   1. 重新加载配置: source ~/.zshrc"
  echo "   2. 或打开新的终端窗口"
  echo ""
  echo "🎨 效果预览:"
  echo "   ➜  admin git:(feature/xxx) [已发布测试]"
  echo ""
  echo "📦 卸载方法:"
  echo "   source $script_dir/install.zsh uninstall"
  echo ""
}

# 卸载
uninstall() {
  echo ""
  echo "======================================"
  echo "  BM 状态提示符卸载"
  echo "======================================"
  echo ""

  # 删除主题文件
  if [[ -f "$HOME/.zsh/custom/themes/bm-robbyrussell.zsh-theme" ]]; then
    rm -f "$HOME/.zsh/custom/themes/bm-robbyrussell.zsh-theme"
    log_info "已删除主题文件"
  fi

  # 恢复 .zshrc 中的主题配置
  if [[ -f "$HOME/.zshrc" ]]; then
    # 将 bm-robbyrussell 改回 robbyrussell
    sed -i.bak 's/ZSH_THEME="bm-robbyrussell"/ZSH_THEME="robbyrussell"/' "$HOME/.zshrc" 2>/dev/null || \
    sed -i '' 's/ZSH_THEME="bm-robbyrussell"/ZSH_THEME="robbyrussell"/' "$HOME/.zshrc"
    log_info "已恢复主题配置为 robbyrussell"

    # 可选：移除 ZSH_CUSTOM 配置（如果需要完全清理）
    # sed -i.bak '/# Branch Manager - 自定义主题目录/,/^ZSH_CUSTOM=/d' "$HOME/.zshrc" 2>/dev/null || \
    # sed -i '' '/# Branch Manager - 自定义主题目录/,/^ZSH_CUSTOM=/d' "$HOME/.zshrc"
  fi

  echo ""
  log_info "卸载完成！"
  echo ""
  echo "📝 下一步操作:"
  echo "   1. 重新加载配置: source ~/.zshrc"
  echo "   2. 或打开新的终端窗口"
  echo ""
}

# 帮助信息
help() {
  cat << 'HELP'
BM 状态提示符安装脚本

使用方法:
  source install.zsh install   # 安装
  source install.zsh uninstall # 卸载

功能:
  - 自动检测 Oh My Zsh 安装
  - 备份现有配置
  - 一键安装/卸载 BM 状态提示符

效果:
  ➜  admin git:(feature/xxx) [已发布测试]

HELP
}

# 主函数
main() {
  case "$1" in
    install)
      install
      ;;
    uninstall)
      uninstall
      ;;
    help|--help|-h)
      help
      ;;
    *)
      echo "未知命令: $1"
      echo ""
      help
      return 1
      ;;
  esac
}

# 执行主函数
main "$@"
