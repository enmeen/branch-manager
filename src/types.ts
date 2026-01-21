// ============ 环境类型 ============
export type Env = 'test' | 'pre' | 'prod';

// ============ 需求分支状态 ============
export type FeatureStatus =
  | '开发中'
  | '已发布测试'
  | '已发布预发'
  | '已发布线上'
  | '已完成';

// ============ 部署历史记录 ============
export interface DeployHistory {
  env: Env;
  at: number; // timestamp
}

// ============ 需求分支信息 ============
export interface Feature {
  branch: string; // 需求分支名，如 feat/xxx
  doc: string; // 技术方案文档链接
  baseBranch: string; // 基础分支（通常是 prod 分支）
  status: FeatureStatus;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  deployHistory: DeployHistory[];
}

// ============ 仓库配置 ============
export interface RepoConfig {
  branches: {
    test?: string; // 测试环境分支名（可选）
    pre?: string; // 预发环境分支名（可选）
    prod: string; // 生产环境分支名（必填）
  };
  deployUrls: {
    test?: string; // 测试环境部署URL（可选）
    pre?: string; // 预发环境部署URL（可选）
    prod: string; // 生产环境部署URL（必填）
  };
}

// ============ 配置文件结构 (~/.bm/config.json) ============
export interface Config {
  repos: Record<string, RepoConfig>;
}

// ============ 仓库状态 ============
export interface RepoState {
  features: Feature[];
}

// ============ 状态文件结构 (~/.bm/state.json) ============
export interface State {
  repos: Record<string, RepoState>;
}

// ============ 状态标签和颜色映射 ============
export const STATUS_LABELS: Record<FeatureStatus, string> = {
  '开发中': '开发中',
  '已发布测试': '已发布测试',
  '已发布预发': '已发布预发',
  '已发布线上': '已发布线上',
  '已完成': '已完成'
};

export const STATUS_COLORS: Record<FeatureStatus, string> = {
  '开发中': 'blue',
  '已发布测试': 'yellow',
  '已发布预发': 'magenta',
  '已发布线上': 'red',
  '已完成': 'green'
};

// ============ 环境标签映射 ============
export const ENV_LABELS: Record<Env, string> = {
  'test': '测试',
  'pre': '预发',
  'prod': '线上'
};
