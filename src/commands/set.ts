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
import type { Env, RepoConfig } from '../types';
import { ENV_LABELS } from '../types';

export async function setConfig(storage: Storage): Promise<void> {
  // 1. 检查是否在 git 仓库中
  if (!isInGitRepository()) {
    console.error(chalk.red('错误: 当前目录不是 git 仓库'));
    process.exit(1);
  }

  // 2. 获取 repoKey
  const repoKey = getRepoKey();

  console.log(chalk.cyan(`\n当前仓库: ${repoKey}\n`));

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
  const prodBranch = await promptForBranchName('prod', existingConfig?.branches.prod);
  console.log();
  const prodUrl = await promptForDeployUrl('prod', existingConfig?.deployUrls.prod);

  // 5. 构建配置对象
  const branches: Partial<Record<Env, string>> = {};
  const deployUrls: Partial<Record<Env, string>> = {};

  if (testConfig.branch) branches.test = testConfig.branch;
  if (preConfig.branch) branches.pre = preConfig.branch;
  branches.prod = prodBranch;

  if (testConfig.url) deployUrls.test = testConfig.url;
  if (preConfig.url) deployUrls.pre = preConfig.url;
  deployUrls.prod = prodUrl;

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
