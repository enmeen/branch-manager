import chalk from 'chalk';
import { Storage } from '../storage';
import { getProjectKey, isInGitRepository } from '../git';
import { promptForStatus, promptForDescription } from '../prompts';

export async function edit(storage: Storage, branchName: string, options: { message?: string; status?: string }): Promise<void> {
  if (!isInGitRepository()) {
    console.error('错误: 当前目录不是 git 仓库');
    process.exit(1);
  }

  const projectKey = getProjectKey();
  const branch = storage.getBranch(projectKey, branchName);

  if (!branch) {
    console.error(`错误: 未找到分支 "${branchName}"`);
    console.log('使用 "bm list" 查看所有已记录的分支');
    process.exit(1);
  }

  let needsUpdate = false;

  if (options.message) {
    branch.description = options.message;
    needsUpdate = true;
  }

  if (options.status) {
    branch.status = options.status as any;
    needsUpdate = true;
  }

  if (!options.message && !options.status) {
    console.log(`\n编辑分支: ${chalk.cyan(branchName)}`);
    console.log(`当前注释: ${branch.description || '(无)'}`);
    console.log(`当前状态: ${branch.status}\n`);

    const description = await promptForDescription(branch.description);
    const status = await promptForStatus(branch.status);

    branch.description = description;
    branch.status = status;
    needsUpdate = true;
  }

  if (needsUpdate) {
    const updated = await storage.updateBranch(projectKey, branchName, branch);
    if (updated) {
      console.log(`✓ 分支 "${branchName}" 已更新`);
    }
  }
}
