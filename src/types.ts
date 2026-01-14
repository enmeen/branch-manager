export type BranchStatus = 'developing' | 'testing' | 'completed' | 'pending-release' | 'on-hold' | 'abandoned';

export type BuildType = 'test' | 'production';

export interface Branch {
  name: string;
  description: string;
  status: BranchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  branches: Branch[];
  buildUrls?: {
    test?: string;
    production?: string;
  };
}

export interface Data {
  projects: Record<string, Project>;
}

export const STATUS_LABELS: Record<BranchStatus, string> = {
  'developing': '开发中',
  'testing': '测试中',
  'completed': '已完成',
  'pending-release': '待发布',
  'on-hold': '暂停',
  'abandoned': '已废弃'
};

export const STATUS_COLORS: Record<BranchStatus, string> = {
  'developing': 'blue',
  'testing': 'yellow',
  'completed': 'green',
  'pending-release': 'magenta',
  'on-hold': 'gray',
  'abandoned': 'red'
};

export const BUILD_TYPE_LABELS: Record<BuildType, string> = {
  'test': '发布测试',
  'production': '发布线上'
};
