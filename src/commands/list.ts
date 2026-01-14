import chalk from 'chalk';
import { Storage } from '../storage';
import { getCurrentBranch, getProjectKey, isInGitRepository } from '../git';
import { STATUS_LABELS } from '../types';

const statusColorMap: Record<string, any> = {
  'developing': chalk.blue,
  'testing': chalk.yellow,
  'completed': chalk.green,
  'pending-release': chalk.magenta,
  'on-hold': chalk.gray,
  'abandoned': chalk.red
};

export async function list(storage: Storage, options: { status?: string }): Promise<void> {
  if (!isInGitRepository()) {
    console.error('错误: 当前目录不是 git 仓库');
    process.exit(1);
  }

  const projectKey = getProjectKey();
  const currentBranch = getCurrentBranch();
  let branches = storage.getBranches(projectKey);

  if (options.status) {
    branches = branches.filter(b => b.status === options.status);
  }

  if (branches.length === 0) {
    console.log('当前项目还没有记录的分支');
    console.log('使用 "bm add" 添加分支记录');
    return;
  }

  console.log(`\n当前项目: ${chalk.cyan(projectKey)}\n`);

  branches.forEach((branch, index) => {
    const isCurrent = branch.name === currentBranch;
    const prefix = isCurrent ? chalk.green('*') : ' ';
    const statusLabel = STATUS_LABELS[branch.status];
    const statusColorFn = statusColorMap[branch.status];

    const name = isCurrent ? chalk.bold(branch.name) : branch.name;
    const status = statusColorFn(`[${statusLabel}]`);

    console.log(`${prefix} ${chalk.gray(String(index + 1).padStart(2))} ${name.padEnd(30)} ${status}  ${branch.description}`);
  });

  console.log();
}
