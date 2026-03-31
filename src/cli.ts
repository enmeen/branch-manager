#!/usr/bin/env node
import { Command } from 'commander';
import { Storage } from './storage';
import { setConfig } from './commands/set';
import { add } from './commands/add';
import { remove } from './commands/remove';
import { deploy } from './commands/deploy';
import { info } from './commands/info';
import { wtSwitch } from './commands/wt';
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
    .name('bmw')
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
    .description('基于指定基础分支（默认 prod）创建需求分支，并进入开发状态')
    .option('--branch <name>', '分支名（JSON 模式必填）')
    .option('--base <branch>', '基础分支（默认使用配置中的 prod 分支）')
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
    .option('--force', '强制删除（允许跳过 worktree 未提交改动保护）')
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

  // switch 命令（顶级快捷命令）
  program
    .command('switch')
    .description('快速切换到指定分支的 worktree 目录')
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
