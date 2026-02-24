import inquirer from 'inquirer';
import chalk from 'chalk';
import type { Env, FeatureStatus } from './types';
import { ENV_LABELS } from './types';

// ============ 配置相关提示 ============

/**
 * 提示输入分支名
 */
export async function promptForBranchName(env: Env, currentValue?: string): Promise<string> {
  const { branchName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'branchName',
      message: `输入 ${ENV_LABELS[env]} 环境的分支名:`,
      default: currentValue || '',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '分支名不能为空';
        }
        return true;
      }
    }
  ]);

  return branchName.trim();
}

/**
 * 提示输入部署 URL
 */
export async function promptForDeployUrl(env: Env, currentValue?: string): Promise<string> {
  const { url } = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: `输入 ${ENV_LABELS[env]} 环境的部署 URL:`,
      default: currentValue || '',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'URL 不能为空';
        }
        if (!input.startsWith('http://') && !input.startsWith('https://')) {
          return 'URL 必须以 http:// 或 https:// 开头';
        }
        return true;
      }
    }
  ]);

  return url.trim();
}

/**
 * 确认操作
 */
export async function promptForConfirmation(message: string, defaultValue: boolean = false): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: message,
      default: defaultValue
    }
  ]);

  return confirmed;
}

/**
 * 提示输入分支名（可选，允许跳过）
 * 返回 { branch: string | undefined, url: string | undefined }
 */
export async function promptForBranchNameOptional(env: Env, currentBranch?: string, currentUrl?: string): Promise<{ branch?: string, url?: string }> {
  const { shouldConfig } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldConfig',
      message: `是否配置 ${ENV_LABELS[env]} 环境?`,
      default: !!currentBranch
    }
  ]);

  if (!shouldConfig) {
    return { branch: undefined, url: undefined };
  }

  // 连续输入分支名和 URL
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'branchName',
      message: `输入 ${ENV_LABELS[env]} 环境的分支名:`,
      default: currentBranch || '',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '分支名不能为空';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'url',
      message: `输入 ${ENV_LABELS[env]} 环境的部署 URL:`,
      default: currentUrl || '',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'URL 不能为空';
        }
        if (!input.startsWith('http://') && !input.startsWith('https://')) {
          return 'URL 必须以 http:// 或 https:// 开头';
        }
        return true;
      }
    }
  ]);

  return {
    branch: answers.branchName.trim(),
    url: answers.url.trim()
  };
}

/**
 * 提示输入部署 URL（可选，允许跳过）- 保留以兼容其他使用场景
 */
export async function promptForDeployUrlOptional(env: Env, currentValue?: string): Promise<string | undefined> {
  const { shouldConfig } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldConfig',
      message: `是否配置 ${ENV_LABELS[env]} 部署 URL?`,
      default: !!currentValue
    }
  ]);

  if (!shouldConfig) {
    return undefined;
  }

  const { url } = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: `输入 ${ENV_LABELS[env]} 环境的部署 URL:`,
      default: currentValue || '',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'URL 不能为空';
        }
        if (!input.startsWith('http://') && !input.startsWith('https://')) {
          return 'URL 必须以 http:// 或 https:// 开头';
        }
        return true;
      }
    }
  ]);

  return url.trim();
}

// ============ 需求分支相关提示 ============

/**
 * 提示选择添加模式
 */
export async function promptForAddMode(): Promise<'create' | 'existing'> {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: '选择添加模式:',
      choices: [
        { name: '创建新分支（从 prod 分支创建）', value: 'create' },
        { name: '添加现有分支（为已存在的分支添加管理）', value: 'existing' }
      ]
    }
  ]);

  return mode;
}

/**
 * 提示输入需求分支名
 */
export async function promptForFeatureBranch(): Promise<string> {
  const { branchName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'branchName',
      message: '输入需求分支名 (如 feat/xxx):',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '分支名不能为空';
        }
        return true;
      }
    }
  ]);

  return branchName.trim();
}

/**
 * 提示选择现有分支
 */
export async function promptForExistingBranch(branches: string[]): Promise<string> {
  const { branch } = await inquirer.prompt([
    {
      type: 'list',
      name: 'branch',
      message: '选择要添加的分支:',
      choices: branches
    }
  ]);

  return branch;
}

/**
 * 提示输入技术方案文档链接
 */
export async function promptForDocUrl(): Promise<string> {
  const { docUrl } = await inquirer.prompt([
    {
      type: 'input',
      name: 'docUrl',
      message: '输入技术方案文档链接 (可选):',
      default: ''
    }
  ]);

  return docUrl.trim();
}

// ============ 发布相关提示 ============

/**
 * 提示选择发布环境
 */
export async function promptForDeployEnv(configuredEnvs: Env[]): Promise<Env> {
  const choices = configuredEnvs.map(env => ({
    name: `${ENV_LABELS[env]} (${env})`,
    value: env
  }));

  const { env } = await inquirer.prompt([
    {
      type: 'list',
      name: 'env',
      message: '选择发布环境:',
      choices
    }
  ]);

  return env;
}

/**
 * 线上发布二次确认
 */
export async function promptForProdConfirm(targetBranch: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `⚠️  准备发布到线上环境 (分支: ${targetBranch})，请确认:`,
      default: false
    }
  ]);

  return confirmed;
}

/**
 * 等待用户确认发布完成
 */
export async function promptForDeployComplete(): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: '请确认部署已完成:',
      default: true
    }
  ]);

  return confirmed;
}

/**
 * 处理合并冲突的选择
 */
export async function promptForConflictResolution(): Promise<'fix' | 'abort'> {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '检测到合并冲突，如何处理?',
      choices: [
        { name: '手动修复冲突后继续', value: 'fix' },
        { name: '中止本次发布', value: 'abort' }
      ]
    }
  ]);

  return action;
}

/**
 * 询问是否切回原分支
 */
export async function promptForReturnToBranch(branchName: string): Promise<boolean> {
  const { shouldReturn } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldReturn',
      message: `是否切回开发分支 ${chalk.bold(branchName)}?`,
      default: true
    }
  ]);

  return shouldReturn;
}

/**
 * 询问是否仍继续发布未被管理的分支
 */
export async function promptForUnmanagedBranch(): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: '当前分支未被 bm 管理，是否仍继续发布?',
      default: false
    }
  ]);

  return confirmed;
}

/**
 * 询问是否覆盖已存在的需求分支
 */
export async function promptForOverwriteFeature(): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: '该需求分支已在 bm 中记录，是否覆盖?',
      default: false
    }
  ]);

  return confirmed;
}

// ============ 移除分支相关提示 ============

/**
 * 提示选择要移除的分支
 */
export async function promptForRemoveBranch(features: Array<{ branch: string, status: string }>): Promise<string> {
  const choices = features.map(f => ({
    name: `${f.branch} (${f.status})`,
    value: f.branch
  }));

  const { branch } = await inquirer.prompt([
    {
      type: 'list',
      name: 'branch',
      message: '选择要移除的分支:',
      choices
    }
  ]);

  return branch;
}

/**
 * 确认移除分支
 */
export async function promptForRemoveConfirm(branchName: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `确认要从 bm 管理中移除分支 "${branchName}"?`,
      default: false
    }
  ]);

  return confirmed;
}

/**
 * 询问是否删除实际的 git 分支
 */
export async function promptForDeleteGitBranch(): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: '是否同时删除本地的 git 分支?',
      default: false
    }
  ]);

  return confirmed;
}
