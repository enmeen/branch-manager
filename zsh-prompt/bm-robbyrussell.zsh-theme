# Based on robbyrussell theme with BM status integration

PROMPT="%(?:%{$fg_bold[green]%}➜ :%{$fg_bold[red]%}➜ ) %{$fg[cyan]%}%c%{$reset_color%}"
PROMPT+='$(git_prompt_info)$(bm_status_prompt) '

# 清空 RPROMPT，避免显示在右侧
unset RPROMPT
RPROMPT=''

ZSH_THEME_GIT_PROMPT_PREFIX="%{$fg_bold[blue]%}git:(%{$fg[red]%}"
ZSH_THEME_GIT_PROMPT_SUFFIX="%{$reset_color%}"
ZSH_THEME_GIT_PROMPT_DIRTY="%{$fg[blue]%}) %{$fg[yellow]%}✗"
ZSH_THEME_GIT_PROMPT_CLEAN="%{$fg[blue]%})"

# BM 状态显示在 git 信息后面
function bm_status_prompt() {
  # 检查是否在 git 仓库中
  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    return 0
  fi

  # 获取当前分支名
  local current_branch
  current_branch=$(git branch --show-current 2>/dev/null)

  if [[ -z "$current_branch" ]]; then
    return 0
  fi

  # 获取 bm info 并解析状态
  local bm_info
  bm_info=$(bm info 2>/dev/null)

  if [[ -z "$bm_info" ]]; then
    return 0
  fi

  # 使用 grep 和 sed 提取状态
  local branch_status
  branch_status=$(echo "$bm_info" | grep -A 1 "\\*.*${current_branch}" | grep "状态:" | sed 's/.*\[//g' | sed 's/\].*//g' | head -1)

  if [[ -n "$branch_status" ]]; then
    # 根据状态设置颜色
    case "$branch_status" in
      "已发布测试")
        echo " %{$fg[blue]%}[$branch_status]%{$reset_color%}"
        ;;
      "已发布线上")
        echo " %{$fg[green]%}[$branch_status]%{$reset_color%}"
        ;;
      "开发中")
        echo " %{$fg[yellow]%}[$branch_status]%{$reset_color%}"
        ;;
      "已合并")
        echo " %{$fg[magenta]%}[$branch_status]%{$reset_color%}"
        ;;
      *)
        echo " %{$fg[cyan]%}[$branch_status]%{$reset_color%}"
        ;;
    esac
  fi

  return 0
}
