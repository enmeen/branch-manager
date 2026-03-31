import chalk from 'chalk';
import { Storage } from '../storage';
import { getRepoKey, isInGitRepository } from '../git';
import { promptForBaseBranch, promptForDocUrl, promptForFeatureBranch } from '../prompts';
import { outputError } from '../utils/json';
import type { JsonOptions } from '../types';
import { wtAdd } from './wt';

interface AddOptions extends JsonOptions {
  branch?: string;
  doc?: string;
  base?: string;
  path?: string;
}

export async function add(storage: Storage, options: AddOptions = {}): Promise<void> {
  const { json } = options;
  let { branch, doc, base } = options;

  if (!isInGitRepository()) {
    const errorMsg = '当前目录不是 git 仓库';
    if (json) return outputError(errorMsg, 'NOT_GIT_REPO');
    console.error(chalk.red(`错误: ${errorMsg}`));
    process.exit(1);
  }

  const repoKey = getRepoKey();
  const config = storage.config.getRepoConfig(repoKey);
  if (!config) {
    const errorMsg = '仓库尚未配置';
    if (json) return outputError(errorMsg, 'NOT_CONFIGURED');
    console.error(chalk.red(`错误: ${errorMsg}`));
    console.log(chalk.yellow('请先执行 "bmw set" 配置环境分支和部署 URL'));
    process.exit(1);
  }

  if (json && !branch) {
    return outputError('JSON 模式下 --branch 参数必填', 'MISSING_BRANCH');
  }

  if (!json && !branch) {
    branch = await promptForFeatureBranch();
  }

  if (!json && !base) {
    base = await promptForBaseBranch(config.branches.prod);
  }

  if (!json && typeof doc === 'undefined') {
    doc = await promptForDocUrl();
  }

  if (!branch) {
    return outputError('分支名不能为空', 'MISSING_BRANCH');
  }

  return wtAdd(storage, {
    ...options,
    branch,
    base: base || config.branches.prod,
    doc,
  });
}
