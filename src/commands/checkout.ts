import chalk from 'chalk';
import { execSync } from 'child_process';
import { Storage } from '../storage';
import { getCurrentBranch, getProjectKey, isInGitRepository } from '../git';
import { promptForBranchSelection, promptForCommitAction } from '../prompts';

function hasUncommittedChanges(): boolean {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

function createTempCommit(): void {
  const timestamp = new Date().toLocaleString('zh-CN');
  const message = `tmp: 切换分支前暂存修改 (${timestamp})`;
  execSync(`git add -A`, { encoding: 'utf-8' });
  execSync(`git commit -m "${message}"`, { encoding: 'utf-8' });
  console.log(chalk.yellow(`✓ 已创建临时提交`));
  console.log(chalk.gray(`  提交信息: ${message}`));
}

function checkoutBranch(branchName: string): void {
  try {
    execSync(`git checkout ${branchName}`, { encoding: 'utf-8' });
    console.log(chalk.green(`✓ 已切换到分支: ${branchName}`));
  } catch (error) {
    console.error(chalk.red('切换分支失败'));
    throw error;
  }
}

export async function checkout(storage: Storage, branchName?: string): Promise<void> {
  if (!isInGitRepository()) {
    console.error('错误: 当前目录不是 git 仓库');
    process.exit(1);
  }

  const projectKey = getProjectKey();
  const currentBranch = getCurrentBranch();
  const branches = storage.getBranches(projectKey);

  if (branches.length === 0) {
    console.log('当前项目还没有记录的分支');
    console.log('使用 "bm add" 添加分支记录');
    return;
  }

  // 过滤出除当前分支外的所有分支
  const availableBranches = branches.map(b => b.name).filter(b => b !== currentBranch);

  if (availableBranches.length === 0) {
    console.log('没有可切换的分支');
    return;
  }

  let targetBranch = branchName;

  // 如果没有指定分支，让用户选择
  if (!targetBranch) {
    targetBranch = await promptForBranchSelection(availableBranches, currentBranch);
  }

  // 检查目标分支是否在列表中
  if (!availableBranches.includes(targetBranch)) {
    console.error(chalk.red(`错误: 分支 "${targetBranch}" 不存在或与当前分支相同`));
    process.exit(1);
  }

  // 检查是否有未提交的改动
  if (hasUncommittedChanges()) {
    console.log(chalk.yellow('\n⚠️  当前分支有未提交的改动\n'));

    const action = await promptForCommitAction();

    if (action === 'auto') {
      createTempCommit();
    } else if (action === 'manual') {
      console.log(chalk.cyan('\n请手动提交改动后，重新执行 checkout 命令'));
      console.log(chalk.gray('提示: 使用 git add 和 git commit 提交改动\n'));
      return;
    } else {
      console.log(chalk.gray('已取消切换'));
      return;
    }
  }

  // 执行切换
  checkoutBranch(targetBranch);
}
