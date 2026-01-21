import { execSync } from 'child_process';

// ============ 基础 Git 操作 ============

/**
 * 检查是否在 git 仓库中
 */
export function isInGitRepository(): boolean {
  try {
    execSync('git rev-parse --git-dir', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取当前分支名
 */
export function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (error: any) {
    throw new Error(`无法获取当前分支: ${error.message}`);
  }
}

/**
 * 获取仓库唯一标识（repoKey）
 * 通过 git remote get-url origin 获取，并标准化格式
 */
export function getRepoKey(): string {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8', stdio: 'pipe' }).trim();

    // HTTPS: https://gitlab.com/group/project.git -> gitlab.com/group/project
    // SSH: git@gitlab.com:group/project.git -> gitlab.com/group/project

    let key = remoteUrl;

    // 移除 .git 后缀
    if (key.endsWith('.git')) {
      key = key.slice(0, -4);
    }

    // 移除 https://
    if (key.startsWith('https://')) {
      key = key.slice(8);
    }

    // 移除 git@ 前缀
    if (key.startsWith('git@')) {
      key = key.slice(4);
    }

    // 将第一个 : 替换为 /
    const colonIndex = key.indexOf(':');
    if (colonIndex >= 0) {
      key = key.substring(0, colonIndex) + '/' + key.substring(colonIndex + 1);
    }

    return key;
  } catch (error: any) {
    throw new Error(`无法获取项目信息: ${error.message}`);
  }
}

/**
 * 检查工作区是否有未提交的改动
 * @returns true 如果工作区不干净
 */
export function hasUncommittedChanges(): boolean {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8', stdio: 'pipe' });
    return status.trim().length > 0;
  } catch (error: any) {
    throw new Error(`无法检查工作区状态: ${error.message}`);
  }
}

/**
 * 获取所有本地分支列表
 */
export function getLocalBranches(): string[] {
  try {
    const output = execSync('git branch', { encoding: 'utf-8', stdio: 'pipe' });
    return output
      .split('\n')
      .map(line => line.replace('*', '').trim())
      .filter(line => line.length > 0);
  } catch (error: any) {
    throw new Error(`无法获取本地分支列表: ${error.message}`);
  }
}

/**
 * 获取所有远程分支列表
 */
export function getRemoteBranches(): string[] {
  try {
    const output = execSync('git branch -r', { encoding: 'utf-8', stdio: 'pipe' });
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.includes('HEAD'));
  } catch (error: any) {
    throw new Error(`无法获取远程分支列表: ${error.message}`);
  }
}

/**
 * 检查本地分支是否存在
 */
export function hasLocalBranch(branchName: string): boolean {
  const branches = getLocalBranches();
  return branches.includes(branchName);
}

/**
 * 检查远程分支是否存在
 */
export function hasRemoteBranch(branchName: string): boolean {
  const branches = getRemoteBranches();
  return branches.some(b => b.endsWith(`/${branchName}`));
}

/**
 * 切换分支
 */
export function checkoutBranch(branchName: string): void {
  try {
    execSync(`git checkout ${branchName}`, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error: any) {
    throw new Error(`切换到分支 ${branchName} 失败: ${error.message}`);
  }
}

/**
 * 从指定分支创建新分支并切换
 */
export function createAndCheckoutBranch(newBranch: string, fromBranch: string): void {
  try {
    execSync(`git checkout -b ${newBranch} ${fromBranch}`, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error: any) {
    throw new Error(`从 ${fromBranch} 创建分支 ${newBranch} 失败: ${error.message}`);
  }
}

/**
 * 获取远端更新（fetch）
 */
export function fetch(): void {
  try {
    execSync('git fetch', { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error: any) {
    throw new Error(`获取远端更新失败: ${error.message}`);
  }
}

/**
 * 合并分支到当前分支
 */
export function mergeBranch(branchName: string): void {
  try {
    execSync(`git merge ${branchName}`, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error: any) {
    throw new Error(`合并分支 ${branchName} 失败: ${error.message}`);
  }
}

/**
 * 推送当前分支到远端
 */
export function pushBranch(branchName?: string): void {
  try {
    if (branchName) {
      execSync(`git push origin ${branchName}`, { encoding: 'utf-8', stdio: 'pipe' });
    } else {
      execSync('git push', { encoding: 'utf-8', stdio: 'pipe' });
    }
  } catch (error: any) {
    throw new Error(`推送到远端失败: ${error.message}`);
  }
}

/**
 * 检查是否有未解决的合并冲突
 */
export function hasMergeConflicts(): boolean {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf-8', stdio: 'pipe' });
    const lines = output.split('\n').filter(line => line.trim());
    // 检查是否有同时被修改和删除的文件（冲突标记）
    return lines.some(line => line.startsWith('UU') || line.startsWith('AA') || line.startsWith('DD'));
  } catch {
    return false;
  }
}

/**
 * 继续合并（在解决冲突后使用）
 */
export function continueMerge(): void {
  try {
    execSync('git commit --no-edit', { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error: any) {
    throw new Error(`继续合并失败: ${error.message}`);
  }
}

/**
 * 中止合并
 */
export function abortMerge(): void {
  try {
    execSync('git merge --abort', { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error: any) {
    throw new Error(`中止合并失败: ${error.message}`);
  }
}
