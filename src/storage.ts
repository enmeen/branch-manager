import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { Config, State, RepoConfig, RepoState, Feature, Env } from './types';

const BM_DIR = path.join(os.homedir(), '.bm');
const CONFIG_FILE = path.join(BM_DIR, 'config.json');
const STATE_FILE = path.join(BM_DIR, 'state.json');

// ============ Config 管理类 ============
export class ConfigStorage {
  private config: Config = { repos: {} };

  async init(): Promise<void> {
    try {
      await fs.ensureDir(BM_DIR);

      if (await fs.pathExists(CONFIG_FILE)) {
        const content = await fs.readJSON(CONFIG_FILE);
        this.config = content;
      } else {
        await this.save();
      }
    } catch (error: any) {
      throw new Error(`初始化配置失败: ${error.message}`);
    }
  }

  private async save(): Promise<void> {
    try {
      await fs.writeJSON(CONFIG_FILE, this.config, { spaces: 2 });
    } catch (error: any) {
      throw new Error(`保存配置失败: ${error.message}`);
    }
  }

  getRepoConfig(repoKey: string): RepoConfig | undefined {
    return this.config.repos[repoKey];
  }

  async setRepoConfig(repoKey: string, config: RepoConfig): Promise<void> {
    this.config.repos[repoKey] = config;
    await this.save();
  }

  hasRepoConfig(repoKey: string): boolean {
    return !!this.config.repos[repoKey];
  }
}

// ============ State 管理类 ============
export class StateStorage {
  private state: State = { repos: {} };

  async init(): Promise<void> {
    try {
      await fs.ensureDir(BM_DIR);

      if (await fs.pathExists(STATE_FILE)) {
        const content = await fs.readJSON(STATE_FILE);
        this.state = content;
      } else {
        await this.save();
      }
    } catch (error: any) {
      throw new Error(`初始化状态失败: ${error.message}`);
    }
  }

  private async save(): Promise<void> {
    try {
      await fs.writeJSON(STATE_FILE, this.state, { spaces: 2 });
    } catch (error: any) {
      throw new Error(`保存状态失败: ${error.message}`);
    }
  }

  getRepoState(repoKey: string): RepoState {
    if (!this.state.repos[repoKey]) {
      this.state.repos[repoKey] = { features: [] };
    }
    return this.state.repos[repoKey];
  }

  getFeatures(repoKey: string): Feature[] {
    return this.getRepoState(repoKey).features;
  }

  getFeature(repoKey: string, branchName: string): Feature | undefined {
    return this.getRepoState(repoKey).features.find(f => f.branch === branchName);
  }

  hasFeature(repoKey: string, branchName: string): boolean {
    return !!this.getFeature(repoKey, branchName);
  }

  async addFeature(repoKey: string, feature: Feature): Promise<void> {
    const repoState = this.getRepoState(repoKey);

    // 检查是否已存在
    const existingIndex = repoState.features.findIndex(f => f.branch === feature.branch);
    if (existingIndex >= 0) {
      // 如果存在，更新
      repoState.features[existingIndex] = feature;
    } else {
      // 不存在，添加
      repoState.features.push(feature);
    }

    await this.save();
  }

  async updateFeature(repoKey: string, branchName: string, updates: Partial<Feature>): Promise<boolean> {
    const repoState = this.getRepoState(repoKey);
    const feature = repoState.features.find(f => f.branch === branchName);

    if (!feature) {
      return false;
    }

    Object.assign(feature, updates, { updatedAt: Date.now() });
    await this.save();
    return true;
  }

  async removeFeature(repoKey: string, branchName: string): Promise<boolean> {
    const repoState = this.getRepoState(repoKey);
    const initialLength = repoState.features.length;
    repoState.features = repoState.features.filter(f => f.branch !== branchName);

    if (repoState.features.length < initialLength) {
      await this.save();
      return true;
    }

    return false;
  }

  async addDeployHistory(repoKey: string, branchName: string, env: Env): Promise<void> {
    const feature = this.getFeature(repoKey, branchName);
    if (!feature) {
      return;
    }

    if (!feature.deployHistory) {
      feature.deployHistory = [];
    }

    feature.deployHistory.push({
      env,
      at: Date.now()
    });

    await this.save();
  }
}

// ============ 统一的存储管理器 ============
export class Storage {
  config: ConfigStorage;
  state: StateStorage;

  constructor() {
    this.config = new ConfigStorage();
    this.state = new StateStorage();
  }

  async init(): Promise<void> {
    try {
      await this.config.init();
      await this.state.init();
    } catch (error: any) {
      throw new Error(`初始化存储失败: ${error.message}`);
    }
  }
}
