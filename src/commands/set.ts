import chalk from 'chalk';
import { Storage } from '../storage';
import { isInGitRepository, getRepoKey } from '../git';
import {
  promptForBranchName,
  promptForBranchNameOptional,
  promptForDeployUrl,
  promptForDeployUrlOptional,
  promptForConfirmation
} from '../prompts';
import { outputSuccess, outputError } from '../utils/json';
import type { Env, RepoConfig, JsonOptions, SetCommandData } from '../types';
import { ENV_LABELS } from '../types';

interface SetOptions extends JsonOptions {
  testBranch?: string;
  testUrl?: string;
  preBranch?: string;
  preUrl?: string;
  prodBranch?: string;
  prodUrl?: string;
}

export async function setConfig(storage: Storage, options: SetOptions = {}): Promise<void> {
  const {
    json,
    testBranch,
    testUrl,
    preBranch,
    preUrl,
    prodBranch,
    prodUrl
  } = options;

  // 1. 检查是否在 git 仓库中
  if (!isInGitRepository()) {
    const errorMsg = '当前目录不是 git 仓库';
    if (json) return outputError(errorMsg, 'NOT_GIT_REPO');
    console.error(chalk.red(`错误: ${errorMsg}`));
    process.exit(1);
  }

  // 2. 获取 repoKey
  const repoKey = getRepoKey();

  console.log(chalk.cyan(`\n当前仓库: ${repoKey}\n`));

  // ========== JSON 模式 ==========
  if (json) {
    if (!prodBranch || !prodUrl) {
      return outputError('JSON 模式下 --prod-branch 和 --prod-url 参数必填', 'MISSING_PROD_CONFIG');
    }
    try {
      return await setJsonMode(storage, repoKey, {
        testBranch,
        testUrl,
        preBranch,
        preUrl,
        prodBranch,
        prodUrl
      });
    } catch (error: any) {
      return outputError(error.message, 'SET_FAILED');
    }
  }

  // ========== 交互模式 ==========

  // 3. 展示已有配置
  const existingConfig = storage.config.getRepoConfig(repoKey);
  if (existingConfig) {
    console.log(chalk.yellow('已有配置:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`${chalk.bold('环境分支:')}`);
    console.log(`  ${ENV_LABELS.test}:  ${existingConfig.branches.test || chalk.gray('(未配置)')}`);
    console.log(`  ${ENV_LABELS.pre}:   ${existingConfig.branches.pre || chalk.gray('(未配置)')}`);
    console.log(`  ${ENV_LABELS.prod}: ${existingConfig.branches.prod}`);
    console.log(`${chalk.bold('部署 URL:')}`);
    console.log(`  ${ENV_LABELS.test}:  ${existingConfig.deployUrls.test || chalk.gray('(未配置)')}`);
    console.log(`  ${ENV_LABELS.pre}:   ${existingConfig.deployUrls.pre || chalk.gray('(未配置)')}`);
    console.log(`  ${ENV_LABELS.prod}: ${existingConfig.deployUrls.prod}`);
    console.log(chalk.gray('─'.repeat(60)));

    const confirmed = await promptForConfirmation('是否更新配置?', false);
    if (!confirmed) {
      console.log(chalk.gray('已取消配置'));
      return;
    }
    console.log();
  } else {
    console.log(chalk.yellow('首次配置，请输入各环境的分支名和部署 URL'));
    console.log(chalk.gray('提示: 测试和预发环境可以跳过，但生产环境必须配置\n'));
  }

  // 4. 依次输入配置
  // test 环境可选
  const testConfig = await promptForBranchNameOptional('test', existingConfig?.branches.test, existingConfig?.deployUrls.test);

  // pre 环境可选
  const preConfig = await promptForBranchNameOptional('pre', existingConfig?.branches.pre, existingConfig?.deployUrls.pre);

  // prod 环境必填
  console.log(chalk.yellow('\n⚠️  生产环境为必须配置项'));
  const inputProdBranch = await promptForBranchName('prod', existingConfig?.branches.prod);
  console.log();
  const inputProdUrl = await promptForDeployUrl('prod', existingConfig?.deployUrls.prod);

  // 5. 构建配置对象
  const branches: Partial<Record<Env, string>> = {};
  const deployUrls: Partial<Record<Env, string>> = {};

  if (testConfig.branch) branches.test = testConfig.branch;
  if (preConfig.branch) branches.pre = preConfig.branch;
  branches.prod = inputProdBranch;

  if (testConfig.url) deployUrls.test = testConfig.url;
  if (preConfig.url) deployUrls.pre = preConfig.url;
  deployUrls.prod = inputProdUrl;

  const config: RepoConfig = {
    branches: branches as any,
    deployUrls: deployUrls as any
  };

  // 6. 保存配置
  try {
    await storage.config.setRepoConfig(repoKey, config);
    console.log(chalk.green(`\n✓ 配置已保存到 ~/.bm/config.json\n`));
  } catch (error: any) {
    console.error(chalk.red(`\n✗ 保存配置失败: ${error.message}`));
    console.error(chalk.red('请检查文件权限和磁盘空间'));
    console.error(chalk.gray(`配置文件: ~/.bm/config.json`));
    process.exit(1);
  }

  // 7. 展示最终配置
  console.log(chalk.cyan('当前配置:'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(`${chalk.bold('环境分支:')}`);
  console.log(`  ${ENV_LABELS.test}:  ${testConfig.branch || chalk.gray('(未配置)')}`);
  console.log(`  ${ENV_LABELS.pre}:   ${preConfig.branch || chalk.gray('(未配置)')}`);
  console.log(`  ${ENV_LABELS.prod}: ${prodBranch}`);
  console.log(`${chalk.bold('部署 URL:')}`);
  console.log(`  ${ENV_LABELS.test}:  ${testConfig.url || chalk.gray('(未配置)')}`);
  console.log(`  ${ENV_LABELS.pre}:   ${preConfig.url || chalk.gray('(未配置)')}`);
  console.log(`  ${ENV_LABELS.prod}: ${prodUrl}`);
  console.log(chalk.gray('─'.repeat(60)));
  console.log();
}

// ========== JSON 模式实现 ==========

async function setJsonMode(
  storage: Storage,
  repoKey: string,
  options: {
    testBranch?: string;
    testUrl?: string;
    preBranch?: string;
    preUrl?: string;
    prodBranch: string;
    prodUrl: string;
  }
): Promise<void> {
  const {
    testBranch,
    testUrl,
    preBranch,
    preUrl,
    prodBranch,
    prodUrl
  } = options;

  // 构建配置对象
  const branches: Partial<Record<Env, string>> = {};
  const deployUrls: Partial<Record<Env, string>> = {};

  if (testBranch) branches.test = testBranch;
  if (preBranch) branches.pre = preBranch;
  branches.prod = prodBranch;

  if (testUrl) deployUrls.test = testUrl;
  if (preUrl) deployUrls.pre = preUrl;
  deployUrls.prod = prodUrl;

  const config: RepoConfig = {
    branches: branches as any,
    deployUrls: deployUrls as any
  };

  // 保存配置
  await storage.config.setRepoConfig(repoKey, config);

  // 构建响应数据
  const data: SetCommandData = {
    config: {
      ...(testBranch && testUrl && {
        test: { branch: testBranch, url: testUrl }
      }),
      ...(preBranch && preUrl && {
        pre: { branch: preBranch, url: preUrl }
      }),
      prod: { branch: prodBranch, url: prodUrl }
    } as any
  };

  outputSuccess(data);
}
