import { Storage } from '../storage';
import { getCurrentBranch, getProjectKey, isInGitRepository } from '../git';
import { promptForStatus, promptForDescription } from '../prompts';
import type { Branch } from '../types';

export async function add(storage: Storage, options: { message?: string; status?: string }): Promise<void> {
  if (!isInGitRepository()) {
    console.error('错误: 当前目录不是 git 仓库');
    process.exit(1);
  }

  const branchName = getCurrentBranch();
  const projectKey = getProjectKey();

  if (branchName === 'HEAD') {
    console.error('错误: 当前不在任何分支上');
    process.exit(1);
  }

  const existingBranch = storage.getBranch(projectKey, branchName);
  if (existingBranch) {
    console.log(`分支 "${branchName}" 已存在，将更新信息`);
  }

  let description = options.message;
  let status = options.status as any || 'developing';

  if (!description) {
    description = await promptForDescription(existingBranch?.description);
  }

  if (!options.status) {
    status = await promptForStatus(existingBranch?.status);
  }

  const now = new Date().toISOString();
  const branch: Branch = {
    name: branchName,
    description,
    status,
    createdAt: existingBranch?.createdAt || now,
    updatedAt: now
  };

  await storage.addBranch(projectKey, branch);

  console.log(`✓ 分支 "${branchName}" 已${existingBranch ? '更新' : '添加'}`);
}
