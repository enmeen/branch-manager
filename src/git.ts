import { execSync } from 'child_process';

export function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch (error) {
    throw new Error('无法获取当前分支，请确保在 git 仓库中');
  }
}

export function getProjectKey(): string {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();

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
  } catch (error) {
    throw new Error('无法获取项目信息，请确保 git remote origin 已配置');
  }
}

export function isInGitRepository(): boolean {
  try {
    execSync('git rev-parse --git-dir', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
