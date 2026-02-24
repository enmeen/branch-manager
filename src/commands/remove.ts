import chalk from 'chalk';
import { Storage } from '../storage';
import {
  isInGitRepository,
  getRepoKey,
  getCurrentBranch,
  hasLocalBranch,
  deleteLocalBranch
} from '../git';
import {
  promptForRemoveBranch,
  promptForRemoveConfirm,
  promptForDeleteGitBranch
} from '../prompts';

export async function remove(storage: Storage): Promise<void> {
  // 1. 检查是否在 git 仓库中
  if (!isInGitRepository()) {
    console.error(chalk.red('错误: 当前目录不是 git 仓库'));
    process.exit(1);
  }

  // 2. 获取 repoKey
  const repoKey = getRepoKey();

  // 3. 获取当前仓库的所有 features
  const features = storage.state.getFeatures(repoKey);

  if (features.length === 0) {
    console.error(chalk.red('错误: 当前仓库没有被 bm 管理的需求分支'));
    console.log(chalk.yellow('提示: 使用 "bm add" 添加需求分支'));
    process.exit(1);
  }

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
    features.map(f => ({ branch: f.branch, status: f.status }))
  );

  // 6. 获取该分支的详细信息
  const feature = storage.state.getFeature(repoKey, branchToRemove);
  if (!feature) {
    console.error(chalk.red(`错误: 未找到分支 "${branchToRemove}" 的记录`));
    process.exit(1);
  }

  // 7. 检查是否在当前分支上（在显示信息前检查，提升用户体验）
  const currentBranch = getCurrentBranch();
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

  // 10. 询问是否删除实际的 git 分支
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

  // 11. 从 state 中移除
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
