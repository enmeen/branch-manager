import chalk from 'chalk';
import open from 'open';
import { Storage } from '../storage';
import {
  isInGitRepository,
  getRepoKey,
  hasUncommittedChanges,
  getCurrentBranch,
  fetch,
  checkoutBranch,
  mergeBranch,
  pushBranch,
  hasMergeConflicts,
  continueMerge,
  abortMerge,
  hasLocalBranch
} from '../git';
import {
  promptForDeployEnv,
  promptForProdConfirm,
  promptForDeployComplete,
  promptForConflictResolution,
  promptForUnmanagedBranch,
  promptForReturnToBranch
} from '../prompts';
import type { Env, FeatureStatus } from '../types';
import { ENV_LABELS } from '../types';

export async function deploy(storage: Storage): Promise<void> {
  // 1. 检查是否在 git 仓库中
  if (!isInGitRepository()) {
    console.error(chalk.red('错误: 当前目录不是 git 仓库'));
    process.exit(1);
  }

  // 2. 检查工作区是否干净
  if (hasUncommittedChanges()) {
    console.error(chalk.red('错误: 当前工作区有未提交的改动'));
    console.log(chalk.yellow('请先提交或暂存改动后再发布'));
    process.exit(1);
  }

  // 3. 获取 repoKey 和当前分支
  const repoKey = getRepoKey();
  const currentBranch = getCurrentBranch();

  console.log(chalk.cyan(`\n当前仓库: ${repoKey}`));
  console.log(chalk.cyan(`当前分支: ${currentBranch}\n`));

  // 4. 检查配置是否存在
  const config = storage.config.getRepoConfig(repoKey);
  if (!config) {
    console.error(chalk.red('错误: 仓库尚未配置'));
    console.log(chalk.yellow('请先执行 "bm set" 配置环境分支和部署 URL'));
    process.exit(1);
  }

  // 5. 检查当前分支是否是环境分支（避免误操作）
  const { test: testBranch, pre: preBranch, prod: prodBranch } = config.branches;
  if ([testBranch, preBranch, prodBranch].includes(currentBranch)) {
    console.error(chalk.red('错误: 当前分支是环境分支，无法发布'));
    console.log(chalk.yellow('请切换到需求分支后再执行发布'));
    process.exit(1);
  }

  // 6. 检查当前分支是否在 state 中
  const feature = storage.state.getFeature(repoKey, currentBranch);
  if (!feature) {
    console.log(chalk.yellow(`警告: 当前分支 "${currentBranch}" 未被 bm 管理`));
    const continueDeploy = await promptForUnmanagedBranch();
    if (!continueDeploy) {
      console.log(chalk.gray('\n已取消发布'));
      return;
    }
  } else {
    // 显示当前分支状态
    console.log(chalk.cyan('需求分支信息:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  分支:   ${chalk.bold(feature.branch)}`);
    console.log(`  状态:   ${feature.status}`);
    console.log(`  文档:   ${feature.doc || chalk.gray('(无)')}`);
    console.log(chalk.gray('─'.repeat(60)));
    console.log();
  }

  // 7. 选择发布环境（只显示已配置的环境）
  const configuredEnvs: Env[] = [];
  if (config.branches.test && config.deployUrls.test) configuredEnvs.push('test');
  if (config.branches.pre && config.deployUrls.pre) configuredEnvs.push('pre');
  if (config.branches.prod && config.deployUrls.prod) configuredEnvs.push('prod');

  if (configuredEnvs.length === 0) {
    console.error(chalk.red('错误: 没有已配置的环境'));
    console.log(chalk.yellow('请先执行 "bm set" 配置至少一个环境'));
    process.exit(1);
  }

  const targetEnv = await promptForDeployEnv(configuredEnvs);

  // 获取目标环境配置（此时确保不为 undefined）
  const targetBranchName = config.branches[targetEnv];
  const targetUrl = config.deployUrls[targetEnv];

  if (!targetBranchName || !targetUrl) {
    console.error(chalk.red(`错误: ${ENV_LABELS[targetEnv]} 环境配置不完整`));
    console.log(chalk.yellow('请执行 "bm set" 完善配置'));
    process.exit(1);
  }

  console.log(chalk.cyan(`\n发布目标:`));
  console.log(`  环境: ${ENV_LABELS[targetEnv]} (${targetEnv})`);
  console.log(`  分支: ${targetBranchName}`);
  console.log(`  URL:  ${targetUrl}\n`);

  // 8. 线上发布需要二次确认
  if (targetEnv === 'prod') {
    const confirmed = await promptForProdConfirm(targetBranchName);
    if (!confirmed) {
      console.log(chalk.gray('已取消发布'));
      return;
    }
    console.log();
  }

  // 9. 检查是否满足发布流程（可选：必须先发布预发才能发布线上）
  if (targetEnv === 'prod' && feature) {
    if (feature.status !== '已发布预发') {
      console.log(chalk.yellow(`警告: 当前分支状态为 "${feature.status}"，建议先发布到预发环境`));
      const confirmed = await promptForUnmanagedBranch();
      if (!confirmed) {
        console.log(chalk.gray('已取消发布'));
        return;
      }
      console.log();
    }
  }

  // 10. 开始发布流程
  console.log(chalk.cyan('开始发布流程...\n'));

  try {
    // 10.1 切换到目标分支
    console.log(chalk.yellow(`[1/5] 切换到 ${targetBranchName} 分支...`));

    // 先 fetch
    fetch();

    // 检查本地是否有目标分支
    if (!hasLocalBranch(targetBranchName)) {
      console.log(chalk.yellow(`  本地 ${targetBranchName} 分支不存在，从远端检出...`));
      checkoutBranch(targetBranchName);
    } else {
      checkoutBranch(targetBranchName);
    }

    console.log(chalk.green(`  ✓ 已切换到 ${targetBranchName}\n`));

    // 10.2 拉取最新代码
    console.log(chalk.yellow(`[2/5] 拉取 ${targetBranchName} 最新代码...`));
    const { execSync } = require('child_process');
    try {
      execSync(`git pull origin ${targetBranchName}`, { encoding: 'utf-8', stdio: 'pipe' });
      console.log(chalk.green(`  ✓ ${targetBranchName} 已是最新\n`));
    } catch (error: any) {
      // 检查是否是"Already up to date"类型的错误
      const stderr = error.stderr || error.stdout || '';
      if (stderr.includes('Already up to date') || stderr.includes('Already up-to-date')) {
        console.log(chalk.green(`  ✓ ${targetBranchName} 已经是最新\n`));
      } else {
        console.error(chalk.red(`  ✗ 拉取失败`));
        console.error(chalk.red(`  错误: ${error.message}`));
        console.log(chalk.yellow('\n请检查网络连接或手动处理冲突'));
        console.log(chalk.yellow('建议执行: git pull origin ' + targetBranchName));
        abortMerge();
        process.exit(1);
      }
    }

    // 10.3 合并需求分支
    console.log(chalk.yellow(`[3/5] 合并 ${currentBranch} 到 ${targetBranchName}...`));
    try {
      mergeBranch(currentBranch);
      console.log(chalk.green(`  ✓ 合并成功\n`));
    } catch (error: any) {
      console.log(chalk.red(`  ✗ 合并失败: ${error.message}`));
      console.log(chalk.yellow('\n检测到合并冲突，请手动解决'));

      const action = await promptForConflictResolution();

      if (action === 'abort') {
        console.log(chalk.yellow('\n正在中止合并...'));
        abortMerge();
        console.log(chalk.gray('已取消发布'));
        return;
      }

      // 等待用户修复冲突
      console.log(chalk.cyan('\n请手动解决冲突后，按回车继续...'));
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });

      // 继续合并
      console.log(chalk.yellow('\n正在继续合并...'));
      try {
        continueMerge();
        console.log(chalk.green('  ✓ 冲突已解决，合并完成\n'));
      } catch (err: any) {
        console.error(chalk.red(`  ✗ 继续合并失败: ${err.message}`));
        console.log(chalk.yellow('请检查是否还有未解决的冲突'));
        abortMerge();
        process.exit(1);
      }
    }

    // 10.4 推送到远端
    console.log(chalk.yellow(`[4/5] 推送 ${targetBranchName} 到远端...`));
    try {
      pushBranch(targetBranchName);
      console.log(chalk.green(`  ✓ 推送成功\n`));
    } catch (error: any) {
      console.error(chalk.red(`  ✗ 推送失败: ${error.message}`));
      console.log(chalk.yellow('可能远端有更新，请手动处理'));
      abortMerge();
      process.exit(1);
    }

    // 10.5 打开部署页面
    console.log(chalk.yellow(`[5/5] 打开部署页面...`));
    try {
      await open(targetUrl);
      console.log(chalk.green(`  ✓ 已在浏览器中打开部署页面\n`));
    } catch (error) {
      console.log(chalk.yellow(`  ⚠ 无法自动打开浏览器，请手动访问:`));
      console.log(chalk.gray(`    ${targetUrl}\n`));
    }

    // 11. 等待用户确认发布完成
    const confirmed = await promptForDeployComplete();

    if (!confirmed) {
      console.log(chalk.yellow('\n发布未完成，状态未更新'));
      console.log(chalk.gray('提示: 发布完成后，可以手动更新状态'));
      return;
    }

    // 12. 更新状态
    console.log(chalk.cyan('\n正在更新状态...'));

    const newStatus: FeatureStatus =
      targetEnv === 'test' ? '已发布测试' :
      targetEnv === 'pre' ? '已发布预发' :
      '已发布线上';

    if (feature) {
      try {
        // 更新需求分支状态
        await storage.state.updateFeature(repoKey, currentBranch, {
          status: newStatus
        });

        // 添加部署历史
        await storage.state.addDeployHistory(repoKey, currentBranch, targetEnv);

        console.log(chalk.green(`  ✓ 状态已更新为: ${newStatus}`));
      } catch (error: any) {
        console.log(chalk.yellow(`  ⚠ 状态更新失败: ${error.message}`));
        console.log(chalk.yellow('  发布已完成，但状态未更新，请手动处理'));
        // 注意：这里不 exit(1)，因为发布本身成功了
      }
    } else {
      console.log(chalk.yellow(`  ⚠ 该分支未被 bm 管理，状态未更新`));
    }

    console.log();
    console.log(chalk.green('✓ 发布完成！\n'));

    // 13. 询问是否切回原分支
    const shouldReturn = await promptForReturnToBranch(currentBranch);

    if (shouldReturn) {
      console.log(chalk.cyan(`正在切换回分支 ${currentBranch}...`));
      try {
        checkoutBranch(currentBranch);
        console.log(chalk.green(`  ✓ 已切换到分支: ${currentBranch}\n`));
      } catch (error: any) {
        console.error(chalk.red(`  ✗ 切换分支失败: ${error.message}`));
        console.log(chalk.yellow(`\n提示: 当前仍在 ${targetBranchName} 分支`));
        console.log(chalk.gray(`手动切换命令: git checkout ${currentBranch}\n`));
      }
    } else {
      console.log(chalk.gray(`保持在当前分支: ${targetBranchName}\n`));
    }

  } catch (error: any) {
    console.error(chalk.red(`\n发布失败: ${error.message}`));
    console.log(chalk.yellow('请检查错误信息并手动处理'));
    process.exit(1);
  }
}
