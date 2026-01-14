import chalk from 'chalk';
import open from 'open';
import { Storage } from '../storage';
import { getProjectKey, isInGitRepository } from '../git';
import { promptForBuildType, promptForBuildUrl, promptForConfirmation } from '../prompts';
import { BUILD_TYPE_LABELS, BuildType } from '../types';

export async function build(storage: Storage): Promise<void> {
  if (!isInGitRepository()) {
    console.error('错误: 当前目录不是 git 仓库');
    process.exit(1);
  }

  const projectKey = getProjectKey();

  // 选择构建类型
  const buildType = await promptForBuildType();
  const label = BUILD_TYPE_LABELS[buildType];

  // 检查是否需要二次确认（线上环境）
  if (buildType === 'production') {
    const confirmed = await promptForConfirmation('准备发布线上，请确认');
    if (!confirmed) {
      console.log(chalk.gray('已取消发布'));
      return;
    }
  }

  // 获取构建 URL
  let buildUrl = storage.getBuildUrl(projectKey, buildType);

  // 如果没有缓存，让用户输入
  if (!buildUrl) {
    console.log(chalk.yellow(`\n未配置${label}地址`));
    buildUrl = await promptForBuildUrl(buildType);

    // 保存到缓存
    await storage.saveBuildUrl(projectKey, buildType, buildUrl);
    console.log(chalk.green(`✓ ${label}地址已保存\n`));
  } else {
    console.log(chalk.cyan(`\n使用已保存的${label}地址\n`));
  }

  // 打开浏览器
  try {
    console.log(chalk.yellow(`正在打开${label}页面...`));
    await open(buildUrl);
    console.log(chalk.green(`✓ 已打开${label}页面`));
    console.log(chalk.gray(`  ${buildUrl}\n`));
  } catch (error) {
    console.error(chalk.red('打开页面失败'));
    console.error(chalk.gray(`  ${buildUrl}`));
    console.error(chalk.red(String(error)));
  }
}
