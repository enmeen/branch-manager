import inquirer from 'inquirer';
import type { BranchStatus, BuildType } from './types';
import { STATUS_LABELS, BUILD_TYPE_LABELS } from './types';

export async function promptForStatus(currentStatus?: BranchStatus): Promise<BranchStatus> {
  const { status } = await inquirer.prompt([
    {
      type: 'list',
      name: 'status',
      message: '选择分支状态:',
      default: currentStatus || 'developing',
      choices: [
        { name: STATUS_LABELS.developing, value: 'developing' },
        { name: STATUS_LABELS.testing, value: 'testing' },
        { name: STATUS_LABELS.completed, value: 'completed' },
        { name: STATUS_LABELS['pending-release'], value: 'pending-release' },
        { name: STATUS_LABELS['on-hold'], value: 'on-hold' },
        { name: STATUS_LABELS.abandoned, value: 'abandoned' }
      ]
    }
  ]);

  return status;
}

export async function promptForDescription(currentDescription?: string): Promise<string> {
  const { description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: '输入分支注释:',
      default: currentDescription || ''
    }
  ]);

  return description;
}

export async function promptForConfirmation(message: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: message,
      default: false
    }
  ]);

  return confirmed;
}

export async function promptForBranchSelection(branches: string[], currentBranch: string): Promise<string> {
  const { branch } = await inquirer.prompt([
    {
      type: 'list',
      name: 'branch',
      message: '选择要切换到的分支:',
      choices: branches.map(b => ({
        name: b === currentBranch ? `${b} (当前分支)` : b,
        value: b
      }))
    }
  ]);

  return branch;
}

export async function promptForCommitAction(): Promise<string> {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '当前分支有未提交的改动，如何处理?',
      choices: [
        { name: '自动提交临时保存 (tmp: 切换分支前暂存修改)', value: 'auto' },
        { name: '手动提交', value: 'manual' },
        { name: '取消切换', value: 'cancel' }
      ]
    }
  ]);

  return action;
}

export async function promptForBuildType(): Promise<BuildType> {
  const { buildType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'buildType',
      message: '选择发布环境:',
      choices: [
        { name: BUILD_TYPE_LABELS.test, value: 'test' },
        { name: BUILD_TYPE_LABELS.staging, value: 'staging' },
        { name: BUILD_TYPE_LABELS.production, value: 'production' }
      ]
    }
  ]);

  return buildType;
}

export async function promptForBuildUrl(buildType: BuildType): Promise<string> {
  const label = BUILD_TYPE_LABELS[buildType];
  const { url } = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: `请输入${label}的构建地址:`,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '请输入有效的 URL';
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
