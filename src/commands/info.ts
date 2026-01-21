import chalk from 'chalk';
import { Storage } from '../storage';
import { isInGitRepository, getRepoKey, getCurrentBranch } from '../git';
import { STATUS_COLORS, STATUS_LABELS, ENV_LABELS } from '../types';
import type { FeatureStatus } from '../types';

// 旧状态到新状态的映射
const STATUS_MIGRATION_MAP: Record<string, string> = {
  'developing': '开发中',
  'testing': '已发布测试',
  'completed': '已完成'
  // 其他旧状态直接使用原值显示
};

/**
 * 获取兼容的状态标签
 */
function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as FeatureStatus] || status;
}

/**
 * 获取兼容的状态颜色函数
 */
function getStatusColor(status: string): any {
  const colorName = STATUS_COLORS[status as FeatureStatus];
  if (colorName && (chalk as any)[colorName]) {
    return (chalk as any)[colorName];
  }
  return chalk.gray;
}

export async function info(storage: Storage): Promise<void> {
  // 1. 检查是否在 git 仓库中
  if (!isInGitRepository()) {
    console.error(chalk.red('错误: 当前目录不是 git 仓库'));
    process.exit(1);
  }

  // 2. 获取 repoKey 和当前分支
  const repoKey = getRepoKey();
  const currentBranch = getCurrentBranch();

  console.log(chalk.cyan(`\n当前仓库: ${repoKey}\n`));

  // 3. 获取所有需求分支
  const features = storage.state.getFeatures(repoKey);

  if (features.length === 0) {
    console.log(chalk.yellow('还没有记录的需求分支'));
    console.log(chalk.gray('使用 "bm add" 创建需求分支\n'));
    return;
  }

  // 4. 展示需求分支信息
  console.log(chalk.cyan('需求分支列表:\n'));

  features.forEach((feature, index) => {
    const isCurrent = feature.branch === currentBranch;
    const prefix = isCurrent ? chalk.green('* ') : '  ';
    const indexNum = chalk.gray(String(index + 1).padStart(2));

    // 分支名（当前分支高亮）
    const branchName = isCurrent ? chalk.bold(feature.branch) : feature.branch;

    // 状态（带颜色）
    const statusColorFn = getStatusColor(feature.status);
    const statusLabel = getStatusLabel(feature.status);
    const status = statusColorFn(`[${statusLabel}]`);

    // 格式化时间
    const createdAt = formatDate(feature.createdAt);
    const updatedAt = formatDate(feature.updatedAt);

    // 获取最后一次部署信息
    const lastDeploy = feature.deployHistory && feature.deployHistory.length > 0
      ? feature.deployHistory[feature.deployHistory.length - 1]
      : null;

    const deployInfo = lastDeploy
      ? `${chalk.gray('最近部署:')} ${ENV_LABELS[lastDeploy.env]} ${chalk.gray(`(${formatDate(lastDeploy.at)})`)}`
      : chalk.gray('最近部署: 无');

    // 输出
    console.log(`${prefix}${indexNum} ${chalk.bold(branchName)}`);
    console.log(`      状态: ${status}`);
    console.log(`      文档: ${feature.doc || chalk.gray('(无)')}`);
    console.log(`      基础分支: ${feature.baseBranch}`);
    console.log(`      创建时间: ${createdAt}`);
    console.log(`      更新时间: ${updatedAt}`);
    console.log(`      ${deployInfo}`);
    console.log();
  });

  // 5. 显示统计信息
  // 统计各状态的数量（兼容旧状态）
  const statusCounts: Record<string, number> = {};
  features.forEach(f => {
    statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;
  });

  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.cyan('统计:'));
  console.log(`  总计: ${features.length}`);

  // 显示各状态的统计
  Object.entries(statusCounts).forEach(([status, count]) => {
    const colorFn = getStatusColor(status);
    const label = getStatusLabel(status);
    console.log(`  ${colorFn(`${label}`)}: ${count}`);
  });

  console.log(chalk.gray('─'.repeat(60)));
  console.log();
}

/**
 * 格式化时间戳
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
