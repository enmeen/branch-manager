#!/usr/bin/env node
import { Command } from 'commander';
import { Storage } from './storage';
import { setConfig } from './commands/set';
import { add } from './commands/add';
import { deploy } from './commands/deploy';
import { info } from './commands/info';

const program = new Command();
const storage = new Storage();

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
    .version('2.0.0');

  program
    .command('set')
    .description('配置仓库的环境分支和部署 URL（首次使用必须执行）')
    .action(async () => {
      await setConfig(storage);
    });

  program
    .command('add')
    .description('基于 prod 分支创建需求分支，并进入开发状态')
    .action(async () => {
      await add(storage);
    });

  program
    .command('deploy')
    .description('将当前需求分支发布到 test/pre/prod（merge + push + open url + 状态更新）')
    .action(async () => {
      await deploy(storage);
    });

  program
    .command('info')
    .description('查看当前仓库所有由 bm 管理的需求分支与状态信息')
    .action(async () => {
      await info(storage);
    });

  program.parse();
}

main().catch((error) => {
  console.error('发生错误:', error.message);
  process.exit(1);
});
