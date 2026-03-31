#!/usr/bin/env node
import { Command } from 'commander';
import { Storage } from './storage';
import { setConfig } from './commands/set';
import { add } from './commands/add';
import { remove } from './commands/remove';
import { deploy } from './commands/deploy';
import { info } from './commands/info';
import { wtAdd, wtList, wtOpen, wtPrune, wtRemove, wtSwitch } from './commands/wt';
import { JsonOptions } from './types';

const program = new Command();
const storage = new Storage();

// 全局 JSON 选项
const jsonOption = {
  json: false,
} as JsonOptions;

async function main() {
  try {
    await storage.init();
  } catch (error: any) {
    console.error('初始化存储失败:', error.message);
    console.error('请检查文件权限和磁盘空间');
    console.error(`存储目录: ~/.bm`);
    process.exit(1);
  }

  program
    .name('bm')
    .description('Branch Manager - 标准化并自动化需求分支管理、环境发布与状态追踪')
    .version('3.0.0-alpha.0')
    .option('--json', '以 JSON 格式输出（用于 AI/Skill 调用）')
    .hook('preAction', (thisCommand) => {
      const options = thisCommand.opts();
      jsonOption.json = !!options.json;
    });

  // set 命令
  program
    .command('set')
    .description('配置仓库的环境分支和部署 URL（首次使用必须执行）')
    .option('--test-branch <branch>', '测试环境分支名')
    .option('--test-url <url>', '测试环境部署 URL')
    .option('--pre-branch <branch>', '预发环境分支名')
    .option('--pre-url <url>', '预发环境部署 URL')
    .option('--prod-branch <branch>', '生产环境分支名')
    .option('--prod-url <url>', '生产环境部署 URL')
    .action(async (options) => {
      await setConfig(storage, { ...jsonOption, ...options });
    });

  // add 命令
  program
    .command('add')
    .description('基于 prod 分支创建需求分支，并进入开发状态')
    .option('--branch <name>', '分支名（JSON 模式必填）')
    .option('--doc <url>', '需求文档链接')
    .action(async (options) => {
      await add(storage, { ...jsonOption, ...options });
    });

  // remove 命令
  program
    .command('remove')
    .description('从 bm 管理中移除需求分支')
    .option('--branch <name>', '分支名（JSON 模式必填）')
    .option('--delete-git', '同时删除实际的 git 分支')
    .action(async (options) => {
      await remove(storage, { ...jsonOption, ...options });
    });

  // deploy 命令
  program
    .command('deploy')
    .description('将当前需求分支发布到 test/pre/prod（merge + push + open url + 状态更新）')
    .option('--env <test|pre|prod>', '目标环境（JSON 模式必填）')
    .action(async (options) => {
      await deploy(storage, { ...jsonOption, ...options });
    });

  // info 命令
  program
    .command('info')
    .description('查看当前仓库所有由 bm 管理的需求分支与状态信息')
    .action(async () => {
      await info(storage, { ...jsonOption });
    });

  // wt 命令组
  const wtCommand = program
    .command('wt')
    .description('Git worktree 管理（并行开发多个需求分支）');

  wtCommand
    .command('add')
    .description('创建并检出 worktree（分支不存在时可基于 --base 创建）')
    .option('--branch <name>', '目标分支名')
    .option('--base <branch>', '当分支不存在时，基于该分支创建')
    .option('--path <dir>', 'worktree 路径（默认使用仓库内 .worktrees/ 或 worktrees/）')
    .option('--doc <text>', '需求文档链接或描述（写入 bm 管理状态）')
    .action(async (options) => {
      await wtAdd(storage, { ...jsonOption, ...options });
    });

  wtCommand
    .command('list')
    .description('列出当前仓库全部 worktree')
    .action(async () => {
      await wtList({ ...jsonOption });
    });

  wtCommand
    .command('remove')
    .description('移除指定 worktree')
    .option('--path <dir>', 'worktree 路径')
    .option('--force', '强制移除（跳过未提交改动校验）')
    .action(async (options) => {
      await wtRemove({ ...jsonOption, ...options });
    });

  wtCommand
    .command('prune')
    .description('清理无效的 worktree 引用')
    .action(async () => {
      await wtPrune({ ...jsonOption });
    });

  wtCommand
    .command('open')
    .description('输出指定分支对应的 worktree 路径')
    .option('--branch <name>', '分支名')
    .action(async (options) => {
      await wtOpen({ ...jsonOption, ...options });
    });

  wtCommand
    .command('switch')
    .description('进入指定分支对应的 worktree 目录（开启子 shell）')
    .option('--branch <name>', '分支名')
    .action(async (options) => {
      await wtSwitch({ ...jsonOption, ...options });
    });

  program.parse();
}

main().catch((error) => {
  console.error('发生错误:', error.message);
  process.exit(1);
});
