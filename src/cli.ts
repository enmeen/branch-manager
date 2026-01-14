#!/usr/bin/env node
import { Command } from 'commander';
import { Storage } from './storage';
import { add } from './commands/add';
import { list } from './commands/list';
import { edit } from './commands/edit';
import { remove } from './commands/remove';
import { checkout } from './commands/checkout';
import { build } from './commands/build';

const program = new Command();
const storage = new Storage();

async function main() {
  await storage.init();

  program
    .name('bm')
    .description('Git 分支管理工具 - 记录和管理分支信息')
    .version('1.0.0');

  program
    .command('add')
    .description('添加或更新当前分支记录')
    .option('-m, --message <message>', '分支注释')
    .option('-s, --status <status>', '分支状态 (developing/testing/completed/pending-release/on-hold/abandoned)')
    .action(async (options) => {
      await add(storage, options);
    });

  program
    .command('list')
    .description('查看所有分支记录')
    .option('-s, --status <status>', '按状态筛选')
    .action(async (options) => {
      await list(storage, options);
    });

  program
    .command('edit <branch-name>')
    .description('编辑分支信息')
    .option('-m, --message <message>', '新的分支注释')
    .option('-s, --status <status>', '新的分支状态')
    .action(async (branchName, options) => {
      await edit(storage, branchName, options);
    });

  program
    .command('remove <branch-name>')
    .description('删除分支记录')
    .action(async (branchName) => {
      await remove(storage, branchName);
    });

  program
    .command('checkout [branch-name]')
    .description('切换到指定分支')
    .action(async (branchName) => {
      await checkout(storage, branchName);
    });

  program
    .command('deploy')
    .description('打开部署发布页面')
    .action(async () => {
      await build(storage);
    });

  program.parse();
}

main().catch((error) => {
  console.error('发生错误:', error.message);
  process.exit(1);
});
