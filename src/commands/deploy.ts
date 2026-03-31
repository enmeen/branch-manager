import chalk from 'chalk';
import fs from 'fs';
import open from 'open';
import os from 'os';
import path from 'path';
import { Storage } from '../storage';
import {
  addWorktree,
  createLocalBranchFromRemote,
  fetch,
  getCurrentBranch,
  getRepoKey,
  getRepositoryRoot,
  hasLocalBranch,
  hasRemoteBranch,
  hasUncommittedChangesInPath,
  isInGitRepository,
  listWorktrees,
  mergeBranchInPath,
  pullBranchInPath,
  pushBranchInPath,
  runGitInPath,
} from '../git';
import {
  promptForConflictResolution,
  promptForDeployComplete,
  promptForDeployEnv,
  promptForProdConfirm,
} from '../prompts';
import { outputError, outputSuccess } from '../utils/json';
import type { DeployCommandData, Env, FeatureStatus, JsonOptions } from '../types';
import { ENV_LABELS } from '../types';

interface DeployOptions extends JsonOptions {
  env?: 'test' | 'pre' | 'prod';
}

function ensureEnvWorktreePath(repoRoot: string, repoKey: string, envBranch: string): string {
  const existing = listWorktrees().find(item => item.branch === envBranch);
  if (existing) return path.resolve(existing.path);

  const safeRepoKey = repoKey.replace(/[^\w./-]/g, '_');
  const envPath = path.join(os.homedir(), '.bm', 'workTree', safeRepoKey, '.env', envBranch);

  if (fs.existsSync(envPath) && fs.readdirSync(envPath).length > 0) {
    throw new Error(`环境 worktree 路径已存在且非空: ${envPath}`);
  }

  fetch();
  if (!hasLocalBranch(envBranch)) {
    if (!hasRemoteBranch(envBranch)) {
      throw new Error(`环境分支 ${envBranch} 在本地和远端都不存在`);
    }
    createLocalBranchFromRemote(envBranch);
  }

  addWorktree(envPath, envBranch);
  return path.resolve(envPath);
}

export async function deploy(storage: Storage, options: DeployOptions = {}): Promise<void> {
  const { json, env: optEnv } = options;

  if (!isInGitRepository()) {
    const errorMsg = '当前目录不是 git 仓库';
    if (json) return outputError(errorMsg, 'NOT_GIT_REPO');
    console.error(chalk.red(`错误: ${errorMsg}`));
    process.exit(1);
  }

  const repoRoot = getRepositoryRoot();
  const repoKey = getRepoKey();
  const currentBranch = getCurrentBranch();
  const feature = storage.state.getFeature(repoKey, currentBranch);

  if (!feature) {
    const errorMsg = `当前分支 "${currentBranch}" 未被 bmw 管理`;
    if (json) return outputError(errorMsg, 'NO_FEATURES');
    console.error(chalk.red(`错误: ${errorMsg}`));
    console.log(chalk.yellow('请先执行 "bmw add" 创建/接管 worktree 分支'));
    process.exit(1);
  }

  if (!feature.worktreePath) {
    const errorMsg = `分支 "${currentBranch}" 缺少 worktreePath`;
    if (json) return outputError(errorMsg, 'WORKTREE_NOT_FOUND');
    console.error(chalk.red(`错误: ${errorMsg}`));
    process.exit(1);
  }

  if (hasUncommittedChangesInPath(feature.worktreePath)) {
    const errorMsg = `需求分支 worktree 有未提交改动: ${feature.worktreePath}`;
    if (json) return outputError(errorMsg, 'UNCOMMITTED_CHANGES');
    console.error(chalk.red(`错误: ${errorMsg}`));
    console.log(chalk.yellow('请先提交或暂存改动后再发布'));
    process.exit(1);
  }

  const config = storage.config.getRepoConfig(repoKey);
  if (!config) {
    const errorMsg = '仓库尚未配置';
    if (json) return outputError(errorMsg, 'NOT_CONFIGURED');
    console.error(chalk.red(`错误: ${errorMsg}`));
    console.log(chalk.yellow('请先执行 "bmw set" 配置环境分支和部署 URL'));
    process.exit(1);
  }

  let targetEnv: Env;
  if (json) {
    if (!optEnv) return outputError('JSON 模式下 --env 参数必填', 'MISSING_ENV');
    targetEnv = optEnv;
  } else {
    const configuredEnvs: Env[] = [];
    if (config.branches.test && config.deployUrls.test) configuredEnvs.push('test');
    if (config.branches.pre && config.deployUrls.pre) configuredEnvs.push('pre');
    if (config.branches.prod && config.deployUrls.prod) configuredEnvs.push('prod');
    targetEnv = await promptForDeployEnv(configuredEnvs);
  }

  const targetBranchName = config.branches[targetEnv];
  const targetUrl = config.deployUrls[targetEnv];
  if (!targetBranchName || !targetUrl) {
    const errorMsg = `${ENV_LABELS[targetEnv]} 环境配置不完整`;
    if (json) return outputError(errorMsg, 'NOT_CONFIGURED');
    console.error(chalk.red(`错误: ${errorMsg}`));
    process.exit(1);
  }

  if (!json && targetEnv === 'prod') {
    const confirmed = await promptForProdConfirm(targetBranchName);
    if (!confirmed) return;
  }

  let envWorktreePath = '';
  try {
    envWorktreePath = ensureEnvWorktreePath(repoRoot, repoKey, targetBranchName);
    pullBranchInPath(envWorktreePath, targetBranchName);
  } catch (error: any) {
    if (json) return outputError(`准备环境 worktree 失败: ${error.message}`, 'WORKTREE_NOT_FOUND');
    console.error(chalk.red(`错误: 准备环境 worktree 失败: ${error.message}`));
    process.exit(1);
  }

  try {
    mergeBranchInPath(envWorktreePath, currentBranch);
  } catch (error: any) {
    if (json) return outputError(`合并失败: ${error.message}`, 'DEPLOY_FAILED');

    console.log(chalk.red(`合并失败: ${error.message}`));
    const action = await promptForConflictResolution();
    if (action === 'abort') {
      runGitInPath(envWorktreePath, ['merge', '--abort']);
      return;
    }
    console.log(chalk.cyan(`请在 ${envWorktreePath} 手动解决冲突并提交后按回车继续...`));
    await new Promise(resolve => process.stdin.once('data', resolve));
  }

  try {
    pushBranchInPath(envWorktreePath, targetBranchName);
  } catch (error: any) {
    if (json) return outputError(`推送失败: ${error.message}`, 'DEPLOY_FAILED');
    console.error(chalk.red(`错误: 推送失败: ${error.message}`));
    process.exit(1);
  }

  if (!json) {
    try {
      await open(targetUrl);
    } catch {
      console.log(chalk.yellow(`无法自动打开部署页面，请手动访问: ${targetUrl}`));
    }

    const confirmed = await promptForDeployComplete();
    if (!confirmed) return;
  }

  const newStatus: FeatureStatus =
    targetEnv === 'test' ? '已发布测试' :
    targetEnv === 'pre' ? '已发布预发' :
    '已发布线上';

  await storage.state.updateFeature(repoKey, currentBranch, {
    status: newStatus,
    worktreePath: feature.worktreePath,
    workspaceMode: 'worktree',
  });
  await storage.state.addDeployHistory(repoKey, currentBranch, targetEnv);

  const data: DeployCommandData = {
    env: targetEnv,
    branch: currentBranch,
    deployedAt: Date.now(),
    deployUrl: targetUrl,
  };
  if (json) {
    outputSuccess(data);
    return;
  }

  console.log(chalk.green('\n✓ 发布完成'));
  console.log(`  分支: ${currentBranch}`);
  console.log(`  环境: ${targetEnv}`);
  console.log(`  环境分支: ${targetBranchName}`);
  console.log(`  Worktree: ${envWorktreePath}\n`);
}
