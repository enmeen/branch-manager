import chalk from 'chalk';
import { Storage } from '../storage';
import {
  isInGitRepository,
  getRepoKey,
  getCurrentBranch,
  hasLocalBranch,
  deleteLocalBranch,
  hasUncommittedChangesInPath,
  removeWorktree
} from '../git';
import {
  promptForRemoveBranch,
  promptForRemoveConfirm,
  promptForDeleteGitBranch
} from '../prompts';
import { outputSuccess, outputError } from '../utils/json';
import type { JsonOptions, RemoveCommandData } from '../types';

interface RemoveOptions extends JsonOptions {
  branch?: string;
  deleteGit?: boolean;
  force?: boolean;
}

export async function remove(storage: Storage, options: RemoveOptions = {}): Promise<void> {
  const { json, branch: optBranch, deleteGit: optDeleteGit, force } = options;

  // 1. 检查是否在 git 仓库中
  if (!isInGitRepository()) {
    const errorMsg = '当前目录不是 git 仓库';
    if (json) return outputError(errorMsg, 'NOT_GIT_REPO');
    console.error(chalk.red(`错误: ${errorMsg}`));
    process.exit(1);
  }

  // 2. 获取 repoKey
  const repoKey = getRepoKey();

  // 3. 获取当前仓库的所有 features
  const features = storage.state.getFeatures(repoKey);
  const currentBranch = getCurrentBranch();

  if (features.length === 0) {
    const errorMsg = '当前仓库没有被 bm 管理的需求分支';
    if (json) return outputError(errorMsg, 'NO_FEATURES');
    console.error(chalk.red(`错误: ${errorMsg}`));
    console.log(chalk.yellow('提示: 使用 "bm add" 添加需求分支'));
    process.exit(1);
  }

  // ========== JSON 模式 ==========
  if (json) {
    if (!optBranch) {
      return outputError('JSON 模式下 --branch 参数必填', 'MISSING_BRANCH');
    }
    try {
      return await removeJsonMode(storage, repoKey, optBranch, optDeleteGit || false);
    } catch (error: any) {
      return outputError(error.message, 'REMOVE_FAILED');
    }
  }

  // ========== 交互模式 ==========
  console.log(chalk.cyan(`\n当前仓库: ${repoKey}\n`));

  // 4. 列出所有被管理的分支
  console.log(chalk.cyan('被 bm 管理的需求分支:'));
  console.log(chalk.gray('─'.repeat(60)));
  features.forEach(feature => {
    console.log(`  • ${chalk.bold(feature.branch)} - ${chalk.blue(feature.status)}`);
  });
  console.log(chalk.gray('─'.repeat(60)));

  // 5. 选择要移除的分支
  const branchToRemove = await promptForRemoveBranch(
    features.map(f => ({ branch: f.branch, status: f.status })),
    currentBranch
  );

  // 6. 获取该分支的详细信息
  const feature = storage.state.getFeature(repoKey, branchToRemove);
  if (!feature) {
    console.error(chalk.red(`错误: 未找到分支 "${branchToRemove}" 的记录`));
    process.exit(1);
  }

  // 7. 检查是否在当前分支上（在显示信息前检查，提升用户体验）
  if (currentBranch === branchToRemove) {
    console.error(chalk.red(`\n错误: 当前正在分支 "${branchToRemove}" 上`));
    console.log(chalk.yellow('提示: 请先切换到其他分支后再移除'));
    process.exit(1);
  }

  // 8. 显示分支信息
  console.log(chalk.cyan('\n分支信息:'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(`  分支名:   ${chalk.bold(feature.branch)}`);
  console.log(`  基础分支: ${feature.baseBranch}`);
  console.log(`  状态:     ${chalk.blue(feature.status)}`);
  console.log(`  文档:     ${feature.doc || chalk.gray('(无)')}`);
  console.log(`  Worktree: ${feature.worktreePath || chalk.gray('(无)')}`);
  console.log(`  创建时间: ${new Date(feature.createdAt).toLocaleString('zh-CN')}`);
  console.log(`  更新时间: ${new Date(feature.updatedAt).toLocaleString('zh-CN')}`);
  if (feature.deployHistory && feature.deployHistory.length > 0) {
    console.log(`  部署历史:`);
    feature.deployHistory.forEach(h => {
      const envLabel = { test: '测试', pre: '预发', prod: '线上' }[h.env];
      console.log(`    - ${envLabel} (${h.env}): ${new Date(h.at).toLocaleString('zh-CN')}`);
    });
  }
  console.log(chalk.gray('─'.repeat(60)));

  // 9. 确认移除
  const confirmed = await promptForRemoveConfirm(branchToRemove);
  if (!confirmed) {
    console.log(chalk.gray('\n已取消移除'));
    return;
  }

  // 10. 删除关联 worktree（纯 worktree 模式）
  if (feature.worktreePath) {
    try {
      if (!force && hasUncommittedChangesInPath(feature.worktreePath)) {
        console.error(chalk.red(`\n错误: worktree 有未提交改动: ${feature.worktreePath}`));
        console.log(chalk.yellow('提示: 先处理改动，或使用 --force'));
        process.exit(1);
      }
      removeWorktree(feature.worktreePath, force);
      console.log(chalk.green(`\n✓ 已删除 worktree: ${feature.worktreePath}`));
    } catch (error: any) {
      console.log(chalk.yellow(`\n⚠ 删除 worktree 失败: ${error.message}`));
      if (!force) {
        console.log(chalk.yellow('提示: 如确认忽略，请使用 --force'));
        process.exit(1);
      }
    }
  }

  // 11. 询问是否删除实际的 git 分支
  const deleteGitBranch = await promptForDeleteGitBranch();

  if (deleteGitBranch) {
    // 检查本地分支是否存在
    if (!hasLocalBranch(branchToRemove)) {
      console.log(chalk.yellow(`\n警告: 本地分支 "${branchToRemove}" 不存在`));
      console.log(chalk.gray('将仅从 bm 管理中移除记录'));
    } else {
      try {
        deleteLocalBranch(branchToRemove);
        console.log(chalk.green(`\n✓ 已删除本地分支: ${branchToRemove}`));
      } catch (error: any) {
        console.error(chalk.red(`\n✗ 删除本地分支失败: ${error.message}`));
        console.log(chalk.yellow('将继续从 bm 管理中移除记录'));
      }
    }
  }

  // 12. 从 state 中移除
  try {
    const removed = await storage.state.removeFeature(repoKey, branchToRemove);
    if (removed) {
      console.log(chalk.green(`✓ 已从 bm 管理中移除分支: ${branchToRemove}\n`));
    } else {
      console.error(chalk.red(`\n✗ 移除失败: 未找到分支 "${branchToRemove}" 的记录`));
      process.exit(1);
    }
  } catch (error: any) {
    console.error(chalk.red(`\n✗ 移除失败: ${error.message}`));
    process.exit(1);
  }
}

// ========== JSON 模式实现 ==========

async function removeJsonMode(
  storage: Storage,
  repoKey: string,
  branchToRemove: string,
  deleteGitBranch: boolean
): Promise<void> {
  // 检查分支是否存在
  const feature = storage.state.getFeature(repoKey, branchToRemove);
  if (!feature) {
    throw new Error(`未找到分支 "${branchToRemove}" 的记录`);
  }

  // 检查是否在当前分支上
  const currentBranch = getCurrentBranch();
  if (currentBranch === branchToRemove) {
    throw new Error(`当前正在分支 "${branchToRemove}" 上，请先切换到其他分支`);
  }

  let gitDeleted = false;

  if (feature.worktreePath) {
    if (hasUncommittedChangesInPath(feature.worktreePath)) {
      throw new Error(`worktree 有未提交改动: ${feature.worktreePath}`);
    }
    try {
      removeWorktree(feature.worktreePath, true);
    } catch (error: any) {
      throw new Error(`删除 worktree 失败: ${error.message}`);
    }
  }

  // 删除实际的 git 分支
  if (deleteGitBranch) {
    if (hasLocalBranch(branchToRemove)) {
      try {
        deleteLocalBranch(branchToRemove);
        gitDeleted = true;
      } catch (error: any) {
        throw new Error(`删除本地分支失败: ${error.message}`);
      }
    }
  }

  // 从 state 中移除
  const removed = await storage.state.removeFeature(repoKey, branchToRemove);
  if (!removed) {
    throw new Error(`未找到分支 "${branchToRemove}" 的记录`);
  }

  const data: RemoveCommandData = {
    removed: branchToRemove,
    gitDeleted
  };
  outputSuccess(data);
}
