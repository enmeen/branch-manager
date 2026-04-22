import chalk from 'chalk';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Storage } from '../storage';
import {
  addWorktree,
  getRepoKey,
  getCurrentBranch,
  getRepositoryRoot,
  hasLocalBranch,
  hasUncommittedChangesInPath,
  isInGitRepository,
  isPathIgnored,
  listWorktrees,
  pruneWorktree,
  removeWorktree,
} from '../git';
import {
  promptForDocUrl,
  promptForOverwriteFeature,
  promptForWorktreeBranch,
  promptForWorktreeBranchSelect,
  promptForWorktreePathSelect,
} from '../prompts';
import { outputError, outputSuccess } from '../utils/json';
import type {
  JsonOptions,
  WorktreeAddCommandData,
  WorktreeListCommandData,
  WorktreeOpenCommandData,
  WorktreeRemoveCommandData,
  WorktreeSwitchCommandData,
} from '../types';

interface WtAddOptions extends JsonOptions {
  branch?: string;
  base?: string;
  path?: string;
  doc?: string;
}

interface WtRemoveOptions extends JsonOptions {
  path?: string;
  force?: boolean;
}

interface WtOpenOptions extends JsonOptions {
  branch?: string;
}

interface WtSwitchOptions extends JsonOptions {
  branch?: string;
  verbosePath?: boolean;
}

function fail(json: boolean | undefined, message: string, code: string, hint?: string): never {
  if (json) {
    outputError(message, code);
  } else {
    console.error(chalk.red(`错误: ${message}`));
    if (hint) console.log(chalk.yellow(hint));
  }
  process.exit(1);
}

function isInsideRepo(repoRoot: string, targetPath: string): boolean {
  const relative = path.relative(repoRoot, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function expandUserPath(inputPath: string): string {
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/')) return path.join(os.homedir(), inputPath.slice(2));
  return path.resolve(process.cwd(), inputPath);
}

function ensureWorktreePathIgnored(repoRoot: string, targetPath: string, json?: boolean): void {
  if (!isInsideRepo(repoRoot, targetPath)) return;

  if (!isPathIgnored(targetPath)) {
    const relativePath = path.relative(repoRoot, targetPath) || '.';
    fail(
      json,
      `仓库内路径 "${relativePath}" 未被 .gitignore 忽略，拒绝创建 worktree`,
      'WORKTREE_PATH_NOT_IGNORED',
      `请先在 .gitignore 中添加 "${relativePath}/"（或上级目录规则）后重试`
    );
  }
}

function resolveDefaultWorktreeBaseDir(repoKey: string): string {
  const safeRepoKey = repoKey.replace(/[^\w./-]/g, '_');
  const baseDir = path.join(os.homedir(), '.bm', 'workTree', safeRepoKey);
  fs.mkdirSync(baseDir, { recursive: true });
  return baseDir;
}

export async function wtAdd(storage: Storage, options: WtAddOptions = {}): Promise<void> {
  const { json, base, path: pathOpt } = options;
  let { doc } = options;
  let { branch } = options;

  if (!isInGitRepository()) {
    return fail(json, '当前目录不是 git 仓库', 'NOT_GIT_REPO');
  }

  if (json && !branch) {
    return fail(json, '请提供 --branch <name>', 'MISSING_BRANCH');
  }

  if (!json && !branch) {
    branch = await promptForWorktreeBranch();
  }

  if (!branch) {
    return fail(json, '请提供 --branch <name>', 'MISSING_BRANCH');
  }

  if (!json && typeof doc === 'undefined') {
    doc = await promptForDocUrl();
  }

  const repoRoot = getRepositoryRoot();
  const repoKey = getRepoKey();
  const allWorktrees = listWorktrees();

  const branchInUse = allWorktrees.find(item => item.branch === branch);
  if (branchInUse) {
    return fail(
      json,
      `分支 "${branch}" 已在其他 worktree 中检出: ${branchInUse.path}`,
      'BRANCH_ALREADY_CHECKED_OUT',
      '请使用其他分支名，或先移除/切换已有 worktree'
    );
  }

  const baseDir = pathOpt
    ? expandUserPath(pathOpt)
    : resolveDefaultWorktreeBaseDir(repoKey);
  const targetPath = pathOpt ? baseDir : path.join(baseDir, branch);

  ensureWorktreePathIgnored(repoRoot, targetPath, json);

  const existingWorktree = allWorktrees.find(item => path.resolve(item.path) === path.resolve(targetPath));
  if (existingWorktree) {
    return fail(
      json,
      `worktree 路径已存在: ${targetPath}`,
      'WORKTREE_ALREADY_EXISTS',
      '请更换 --path，或先移除已有 worktree'
    );
  }

  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      return fail(
        json,
        `目标路径不是目录: ${targetPath}`,
        'WORKTREE_ALREADY_EXISTS',
        '请更换 --path，或先删除同名文件'
      );
    }
    if (fs.readdirSync(targetPath).length > 0) {
      return fail(
        json,
        `目标目录非空，无法创建 worktree: ${targetPath}`,
        'WORKTREE_ALREADY_EXISTS',
        '请使用空目录，或先清理后重试'
      );
    }
  }

  const branchExists = hasLocalBranch(branch);
  const baseBranch = branchExists ? '' : (base || getCurrentBranch());
  const created = !branchExists;

  try {
    addWorktree(targetPath, branch, created ? baseBranch : undefined);
  } catch (error: any) {
    return fail(
      json,
      `创建 worktree 失败: ${error.message}`,
      'WORKTREE_ADD_FAILED',
      '请检查分支名、基础分支以及目录权限'
    );
  }

  // 同步写入 bm 管理状态（与 bm add 一致，便于 info 展示）
  try {
    const repoKey = getRepoKey();
    const now = Date.now();
    const existingFeature = storage.state.getFeature(repoKey, branch);
    const nextDoc = typeof doc === 'string'
      ? doc
      : (existingFeature?.doc || '');

    if (!json && existingFeature) {
      console.log(chalk.yellow(`\n警告: 分支 "${branch}" 已在 bm 中有记录`));
      console.log(chalk.gray(`  当前文档: ${existingFeature.doc || '(无)'}`));
      const overwrite = await promptForOverwriteFeature();
      if (!overwrite) {
        console.log(chalk.gray('已跳过更新 bm 记录'));
      } else {
        await storage.state.addFeature(repoKey, {
          branch,
          doc: nextDoc,
          baseBranch: baseBranch || existingFeature.baseBranch || getCurrentBranch(),
          worktreePath: path.resolve(targetPath),
          workspaceMode: 'worktree',
          status: existingFeature.status || '开发中',
          createdAt: existingFeature.createdAt || now,
          updatedAt: now,
          deployHistory: existingFeature.deployHistory || []
        });
      }
    } else {
      await storage.state.addFeature(repoKey, {
        branch,
        doc: nextDoc,
        baseBranch: baseBranch || existingFeature?.baseBranch || getCurrentBranch(),
        worktreePath: path.resolve(targetPath),
        workspaceMode: 'worktree',
        status: existingFeature?.status || '开发中',
        createdAt: existingFeature?.createdAt || now,
        updatedAt: now,
        deployHistory: existingFeature?.deployHistory || []
      });
    }
  } catch (error: any) {
    if (!json) {
      console.log(chalk.yellow(`⚠ worktree 已创建，但写入 bm 状态失败: ${error.message}`));
      console.log(chalk.gray('可后续执行 bm add --branch <name> --doc <text> 进行补录'));
    }
  }

  const data: WorktreeAddCommandData = {
    branch,
    path: path.resolve(targetPath),
    created,
    baseBranch,
    repository: repoRoot,
  };

  if (json) {
    outputSuccess(data);
    return;
  }

  console.log(chalk.green('✓ worktree 创建成功'));
  console.log(chalk.cyan(`分支: ${branch}`));
  console.log(chalk.cyan(`路径: ${data.path}`));
}

export async function wtList(options: JsonOptions = {}): Promise<void> {
  const { json } = options;

  if (!isInGitRepository()) {
    return fail(json, '当前目录不是 git 仓库', 'NOT_GIT_REPO');
  }

  const repository = getRepositoryRoot();
  const items = listWorktrees().map(item => ({
    path: path.resolve(item.path),
    branch: item.branch,
    head: item.head,
    isCurrent: item.isCurrent,
    isLocked: item.isLocked,
  }));

  const data: WorktreeListCommandData = { repository, items };

  if (json) {
    outputSuccess(data);
    return;
  }

  if (items.length === 0) {
    console.log(chalk.yellow('当前仓库没有 worktree'));
    return;
  }

  console.log(chalk.cyan(`仓库: ${repository}`));
  console.log(chalk.gray('─'.repeat(80)));
  for (const item of items) {
    const currentMark = item.isCurrent ? chalk.green('*') : ' ';
    const lockMark = item.isLocked ? chalk.yellow('[LOCKED]') : '';
    console.log(`${currentMark} ${chalk.bold(item.branch)} ${lockMark}`);
    console.log(`  path: ${item.path}`);
    console.log(`  head: ${item.head}`);
  }
  console.log(chalk.gray('─'.repeat(80)));
}

export async function wtRemove(options: WtRemoveOptions = {}): Promise<void> {
  const { json, force } = options;
  let { path: pathOpt } = options;

  if (!isInGitRepository()) {
    return fail(json, '当前目录不是 git 仓库', 'NOT_GIT_REPO');
  }

  if (json && !pathOpt) {
    return fail(json, '请提供 --path <dir>', 'MISSING_PATH');
  }

  const allWorktrees = listWorktrees();

  if (!json && !pathOpt) {
    if (allWorktrees.length === 0) {
      return fail(false, '当前仓库没有可移除的 worktree', 'WORKTREE_NOT_FOUND');
    }
    const selected = await promptForWorktreePathSelect(
      allWorktrees.map(item => ({
        path: path.resolve(item.path),
        branch: item.branch,
        isCurrent: item.isCurrent,
      }))
    );
    pathOpt = selected;
  }

  if (!pathOpt) {
    return fail(json, '请提供 --path <dir>', 'MISSING_PATH');
  }

  const targetPath = expandUserPath(pathOpt);
  const match = allWorktrees.find(item => path.resolve(item.path) === targetPath);

  if (!match) {
    return fail(
      json,
      `未找到 worktree: ${targetPath}`,
      'WORKTREE_NOT_FOUND',
      '请先执行 "bm wt list" 确认路径'
    );
  }

  if (!force && hasUncommittedChangesInPath(targetPath)) {
    return fail(
      json,
      `worktree 存在未提交改动: ${targetPath}`,
      'UNCOMMITTED_CHANGES',
      '请先提交/暂存改动，或使用 --force 强制删除'
    );
  }

  try {
    removeWorktree(targetPath, force);
  } catch (error: any) {
    return fail(
      json,
      `删除 worktree 失败: ${error.message}`,
      'WORKTREE_REMOVE_FAILED',
      '可尝试先处理目录占用，再重试'
    );
  }

  const data: WorktreeRemoveCommandData = {
    path: targetPath,
    removed: true,
  };

  if (json) {
    outputSuccess(data);
    return;
  }

  console.log(chalk.green(`✓ 已移除 worktree: ${targetPath}`));
}

export async function wtPrune(options: JsonOptions = {}): Promise<void> {
  const { json } = options;

  if (!isInGitRepository()) {
    return fail(json, '当前目录不是 git 仓库', 'NOT_GIT_REPO');
  }

  try {
    pruneWorktree();
  } catch (error: any) {
    return fail(json, `清理 worktree 失败: ${error.message}`, 'WORKTREE_REMOVE_FAILED', '请检查 git 状态后重试');
  }

  if (json) {
    outputSuccess({});
    return;
  }

  console.log(chalk.green('✓ 已执行 git worktree prune'));
}

export async function wtOpen(options: WtOpenOptions = {}): Promise<void> {
  const { json } = options;
  let { branch } = options;

  if (!isInGitRepository()) {
    return fail(json, '当前目录不是 git 仓库', 'NOT_GIT_REPO');
  }

  if (json && !branch) {
    return fail(json, '请提供 --branch <name>', 'MISSING_BRANCH');
  }

  const worktrees = listWorktrees();
  const selectableBranches = worktrees
    .filter(item => item.branch !== '(detached)')
    .map(item => ({ branch: item.branch, path: path.resolve(item.path) }));

  if (!json && !branch) {
    if (selectableBranches.length === 0) {
      return fail(false, '当前仓库没有可用的 worktree 分支', 'WORKTREE_NOT_FOUND');
    }
    branch = await promptForWorktreeBranchSelect(selectableBranches, '选择要打开路径的 worktree 分支:');
  }

  if (!branch) {
    return fail(json, '请提供 --branch <name>', 'MISSING_BRANCH');
  }

  const found = worktrees.find(item => item.branch === branch);
  if (!found) {
    return fail(
      json,
      `未找到分支 "${branch}" 对应的 worktree`,
      'WORKTREE_NOT_FOUND',
      '请先执行 "bm wt list" 确认分支'
    );
  }

  const absPath = path.resolve(found.path);
  const data: WorktreeOpenCommandData = {
    path: absPath,
    branch,
  };

  if (json) {
    outputSuccess(data);
    return;
  }

  console.log(absPath);
}

export async function wtSwitch(storage: Storage, options: WtSwitchOptions = {}): Promise<void> {
  const { json, verbosePath } = options;
  let { branch } = options;

  if (!isInGitRepository()) {
    return fail(json, '当前目录不是 git 仓库', 'NOT_GIT_REPO');
  }

  if (json && !branch) {
    return fail(json, '请提供 --branch <name>', 'MISSING_BRANCH');
  }

  const worktrees = listWorktrees();
  const repoKey = getRepoKey();
  const features = storage.state.getFeatures(repoKey);
  const featureMap = new Map(features.map(item => [item.branch, item]));
  const selectableBranches = worktrees
    .filter(item => item.branch !== '(detached)')
    .map(item => {
      const feature = featureMap.get(item.branch);
      const absPath = path.resolve(item.path);
      const isEnv = absPath.includes(`${path.sep}.env${path.sep}`);
      return {
        branch: item.branch,
        path: absPath,
        status: feature?.status,
        doc: feature?.doc,
        isCurrent: item.isCurrent,
        isEnv,
        managed: !!feature,
      };
    })
    .sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      if (a.isEnv !== b.isEnv) return a.isEnv ? 1 : -1;
      return a.branch.localeCompare(b.branch);
    });

  if (!json && !branch) {
    if (selectableBranches.length === 0) {
      return fail(false, '当前仓库没有可切换的 worktree 分支', 'WORKTREE_NOT_FOUND');
    }
    branch = await promptForWorktreeBranchSelect(
      selectableBranches,
      '选择要切换的 worktree 分支:',
      { verbosePath }
    );
  }

  if (!branch) {
    return fail(json, '请提供 --branch <name>', 'MISSING_BRANCH');
  }

  const found = worktrees.find(item => item.branch === branch);
  if (!found) {
    return fail(
      json,
      `未找到分支 "${branch}" 对应的 worktree`,
      'WORKTREE_NOT_FOUND',
      '请先执行 "bm wt list" 确认分支'
    );
  }

  const absPath = path.resolve(found.path);

  if (json) {
    const data: WorktreeSwitchCommandData = {
      path: absPath,
      branch,
      entered: false,
    };
    outputSuccess(data);
    return;
  }

  const shell = process.env.SHELL || '/bin/zsh';
  console.log(chalk.cyan(`进入 worktree: ${absPath}`));
  console.log(chalk.gray(`提示: 输入 exit 可返回上一层 shell`));

  const result = spawnSync(shell, {
    cwd: absPath,
    stdio: 'inherit',
  });

  if (result.error) {
    return fail(false, `进入 worktree 失败: ${result.error.message}`, 'WORKTREE_SWITCH_FAILED');
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}
