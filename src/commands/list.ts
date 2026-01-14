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
  const inGitRepo = isInGitRepository();
  const currentProjectKey = inGitRepo ? getProjectKey() : null;
  const currentBranch = currentProjectKey ? getCurrentBranch() : null;

  // 如果不在 git 仓库中，显示所有项目
  if (!inGitRepo) {
    listAllProjects(storage, options);
    return;
  }

  // 在 git 仓库中，显示当前项目的分支
  listProjectBranches(storage, currentProjectKey!, currentBranch, options);
}

function listAllProjects(storage: Storage, options: { status?: string }): void {
  const allProjects = storage.getAllProjects();
  const projectKeys = Object.keys(allProjects).filter(key => allProjects[key].branches.length > 0);

  if (projectKeys.length === 0) {
    console.log('还没有记录的分支');
    console.log('在 git 仓库中使用 "bm add" 添加分支记录');
    return;
  }

  console.log(`\n${chalk.cyan('所有项目分支列表')}\n`);

  projectKeys.forEach(projectKey => {
    const project = allProjects[projectKey];
    let branches = project.branches;

    if (options.status) {
      branches = branches.filter(b => b.status === options.status);
    }

    if (branches.length === 0) {
      return;
    }

    console.log(`${chalk.cyan.bold(projectKey)}`);

    branches.forEach((branch, index) => {
      const statusLabel = STATUS_LABELS[branch.status];
      const statusColorFn = statusColorMap[branch.status];

      const name = branch.name;
      const status = statusColorFn(`[${statusLabel}]`);

      console.log(`  ${chalk.gray(String(index + 1).padStart(2))} ${name.padEnd(30)} ${status}  ${branch.description}`);
    });

    console.log();
  });
}

function listProjectBranches(
  storage: Storage,
  projectKey: string,
  currentBranch: string | null,
  options: { status?: string }
): void {
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
