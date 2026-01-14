import chalk from 'chalk';
import { Storage } from '../storage';
import { getProjectKey, isInGitRepository } from '../git';
import { promptForConfirmation } from '../prompts';

export async function remove(storage: Storage, branchName: string): Promise<void> {
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

  const confirmed = await promptForConfirmation(`确认删除分支记录 "${branchName}"?`);

  if (!confirmed) {
    console.log('已取消');
    return;
  }

  const removed = await storage.removeBranch(projectKey, branchName);

  if (removed) {
    console.log(`✓ 分支记录 "${branchName}" 已删除`);
  } else {
    console.error(`删除失败`);
  }
}
