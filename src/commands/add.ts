import chalk from 'chalk';
import { Storage } from '../storage';
import {
  isInGitRepository,
  getRepoKey,
  hasUncommittedChanges,
  hasLocalBranch,
  hasRemoteBranch,
  checkoutBranch,
  fetch,
  createAndCheckoutBranch,
  getCurrentBranch,
  getLocalBranches
} from '../git';
import {
  promptForAddMode,
  promptForFeatureBranch,
  promptForExistingBranch,
  promptForDocUrl,
  promptForOverwriteFeature
} from '../prompts';
import type { Feature } from '../types';

export async function add(storage: Storage): Promise<void> {
  // 1. 检查是否在 git 仓库中
  if (!isInGitRepository()) {
    console.error(chalk.red('错误: 当前目录不是 git 仓库'));
    process.exit(1);
  }

  // 2. 检查工作区是否干净
  if (hasUncommittedChanges()) {
    console.error(chalk.red('错误: 当前工作区有未提交的改动'));
    console.log(chalk.yellow('请先提交或暂存改动后再添加需求分支'));
    process.exit(1);
  }

  // 3. 获取 repoKey
  const repoKey = getRepoKey();

  // 4. 检查配置是否存在
  const config = storage.config.getRepoConfig(repoKey);
  if (!config) {
    console.error(chalk.red('错误: 仓库尚未配置'));
    console.log(chalk.yellow('请先执行 "bm set" 配置环境分支和部署 URL'));
    process.exit(1);
  }

  console.log(chalk.cyan(`\n当前仓库: ${repoKey}\n`));

  // 5. 选择添加模式
  const mode = await promptForAddMode();

  const prodBranch = config.branches.prod;
  let branchName: string;
  let baseBranch: string;

  if (mode === 'create') {
    // ========== 模式1: 创建新分支 ==========

    console.log(chalk.cyan('\n模式: 创建新分支\n'));

    // 5.1 交互输入需求分支信息
    branchName = await promptForFeatureBranch();
    const docUrl = await promptForDocUrl();

    // 5.2 检查分支是否已存在（本地或远端）
    const localExists = hasLocalBranch(branchName);
    const remoteExists = hasRemoteBranch(branchName);

    if (localExists || remoteExists) {
      console.error(chalk.red(`\n错误: 分支 "${branchName}" 已存在`));
      if (localExists) {
        console.log(chalk.yellow(`  - 本地分支已存在`));
      }
      if (remoteExists) {
        console.log(chalk.yellow(`  - 远程分支已存在`));
      }
      console.log(chalk.yellow(`\n提示: 如果要为已存在的分支添加管理，请选择"添加现有分支"模式`));
      process.exit(1);
    }

    // 5.3 检查是否已在 state 中记录
    const existingFeature = storage.state.getFeature(repoKey, branchName);
    if (existingFeature) {
      console.log(chalk.yellow(`\n警告: 该需求分支已在 bm 中记录`));
      console.log(chalk.gray(`  状态: ${existingFeature.status}`));
      console.log(chalk.gray(`  文档: ${existingFeature.doc || '(无)'}`));

      const overwrite = await promptForOverwriteFeature();
      if (!overwrite) {
        console.log(chalk.gray('\n已取消创建'));
        return;
      }
    }

    baseBranch = prodBranch;

    // 5.4 切换到 prod 分支并同步最新代码
    console.log(chalk.cyan(`\n正在同步 ${prodBranch} 分支...`));

    try {
      fetch();

      // 检查本地是否有 prod 分支，没有则从远端检出
      if (!hasLocalBranch(prodBranch)) {
        if (hasRemoteBranch(prodBranch)) {
          console.log(chalk.yellow(`  本地 ${prodBranch} 分支不存在，从远端检出...`));
          checkoutBranch(prodBranch);
        } else {
          console.error(chalk.red(`错误: ${prodBranch} 分支在本地和远端都不存在`));
          process.exit(1);
        }
      } else {
        checkoutBranch(prodBranch);
      }

      // 拉取最新代码
      console.log(chalk.yellow(`  正在拉取最新代码...`));
      const { execSync } = require('child_process');
      try {
        execSync(`git pull origin ${prodBranch}`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error) {
        console.log(chalk.yellow(`  警告: 拉取失败或无更新，继续创建分支`));
      }
    } catch (error: any) {
      console.error(chalk.red(`同步 ${prodBranch} 分支失败: ${error.message}`));
      process.exit(1);
    }

    console.log(chalk.green(`  ✓ ${prodBranch} 分支已同步\n`));

    // 5.5 从 prod 创建新分支并切换
    console.log(chalk.cyan(`正在创建需求分支 ${branchName}...`));
    try {
      createAndCheckoutBranch(branchName, prodBranch);
    } catch (error: any) {
      console.error(chalk.red(`创建分支失败: ${error.message}`));
      process.exit(1);
    }
    console.log(chalk.green(`  ✓ 已创建并切换到分支: ${branchName}\n`));

    // 5.6 写入 state
    const now = Date.now();
    const feature: Feature = {
      branch: branchName,
      doc: docUrl,
      baseBranch: prodBranch,
      status: '开发中',
      createdAt: now,
      updatedAt: now,
      deployHistory: []
    };

    try {
      await storage.state.addFeature(repoKey, feature);
      console.log(chalk.green(`✓ 需求分支已创建并记录到 bm\n`));
    } catch (error: any) {
      console.error(chalk.red(`\n✗ 保存状态失败: ${error.message}`));
      console.error(chalk.yellow('分支已创建，但未被 bm 管理'));
      console.error(chalk.yellow('请重新执行 "bm add" 添加现有分支'));
      process.exit(1);
    }
    console.log(chalk.cyan('分支信息:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  分支名:   ${chalk.bold(branchName)}`);
    console.log(`  基础分支: ${baseBranch}`);
    console.log(`  状态:     ${chalk.blue('开发中')}`);
    console.log(`  文档:     ${docUrl || chalk.gray('(无)')}`);
    console.log(chalk.gray('─'.repeat(60)));
    console.log();

  } else {
    // ========== 模式2: 添加现有分支 ==========

    console.log(chalk.cyan('\n模式: 添加现有分支到 bm 管理\n'));

    // 5.1 获取所有本地分支
    const localBranches = getLocalBranches();

    // 过滤掉环境分支
    const envBranches = [config.branches.test, config.branches.pre, config.branches.prod].filter(Boolean) as string[];
    const featureBranches = localBranches.filter(branch => !envBranches.includes(branch));

    if (featureBranches.length === 0) {
      console.error(chalk.red('错误: 没有可添加的需求分支'));
      console.log(chalk.yellow('当前仓库除了环境分支外，没有其他分支'));
      process.exit(1);
    }

    // 5.2 选择要添加的分支
    branchName = await promptForExistingBranch(featureBranches);
    const docUrl = await promptForDocUrl();

    // 5.3 检查是否已在 state 中记录
    const existingFeature = storage.state.getFeature(repoKey, branchName);
    if (existingFeature) {
      console.log(chalk.yellow(`\n警告: 该需求分支已在 bm 中记录`));
      console.log(chalk.gray(`  状态: ${existingFeature.status}`));
      console.log(chalk.gray(`  文档: ${existingFeature.doc || '(无)'}`));

      const overwrite = await promptForOverwriteFeature();
      if (!overwrite) {
        console.log(chalk.gray('\n已取消添加'));
        return;
      }
    }

    // 5.4 确定基础分支（默认为 prod）
    baseBranch = prodBranch;

    // 5.5 检查是否在当前分支上，如果不是则切换
    const currentBranch = getCurrentBranch();
    if (currentBranch !== branchName) {
      console.log(chalk.cyan(`\n正在切换到分支 ${branchName}...`));
      try {
        checkoutBranch(branchName);
        console.log(chalk.green(`  ✓ 已切换到分支: ${branchName}\n`));
      } catch (error: any) {
        console.error(chalk.red(`切换分支失败: ${error.message}`));
        process.exit(1);
      }
    }

    // 5.6 写入 state
    const now = Date.now();
    const feature: Feature = {
      branch: branchName,
      doc: docUrl,
      baseBranch: baseBranch,
      status: '开发中',
      createdAt: now,
      updatedAt: now,
      deployHistory: []
    };

    try {
      await storage.state.addFeature(repoKey, feature);
      console.log(chalk.green(`✓ 需求分支已添加到 bm 管理\n`));
    } catch (error: any) {
      console.error(chalk.red(`\n✗ 保存状态失败: ${error.message}`));
      console.error(chalk.yellow('分支切换成功，但未被 bm 管理'));
      console.error(chalk.yellow('请重新执行 "bm add" 添加现有分支'));
      process.exit(1);
    }
    console.log(chalk.cyan('分支信息:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  分支名:   ${chalk.bold(branchName)}`);
    console.log(`  基础分支: ${baseBranch}`);
    console.log(`  状态:     ${chalk.blue('开发中')}`);
    console.log(`  文档:     ${docUrl || chalk.gray('(无)')}`);
    console.log(chalk.gray('─'.repeat(60)));
    console.log();
  }
}
