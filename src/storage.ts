import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { Data, Project, Branch, BuildType } from './types';

const DATA_DIR = path.join(os.homedir(), '.branch-manager');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

export class Storage {
  private data: Data = { projects: {} };

  async init(): Promise<void> {
    await fs.ensureDir(DATA_DIR);

    if (await fs.pathExists(DATA_FILE)) {
      const content = await fs.readJSON(DATA_FILE);
      this.data = content;
    } else {
      await this.save();
    }
  }

  private async save(): Promise<void> {
    await fs.writeJSON(DATA_FILE, this.data, { spaces: 2 });
  }

  getProject(projectKey: string): Project {
    if (!this.data.projects[projectKey]) {
      this.data.projects[projectKey] = { branches: [] };
    }
    return this.data.projects[projectKey];
  }

  getBranches(projectKey: string): Branch[] {
    return this.getProject(projectKey).branches;
  }

  getAllProjects(): Record<string, Project> {
    return this.data.projects;
  }

  getBranch(projectKey: string, branchName: string): Branch | undefined {
    return this.getProject(projectKey).branches.find(b => b.name === branchName);
  }

  async addBranch(projectKey: string, branch: Branch): Promise<void> {
    const project = this.getProject(projectKey);

    const existingIndex = project.branches.findIndex(b => b.name === branch.name);
    if (existingIndex >= 0) {
      project.branches[existingIndex] = branch;
    } else {
      project.branches.push(branch);
    }

    await this.save();
  }

  async updateBranch(projectKey: string, branchName: string, updates: Partial<Branch>): Promise<boolean> {
    const project = this.getProject(projectKey);
    const branch = project.branches.find(b => b.name === branchName);

    if (!branch) {
      return false;
    }

    Object.assign(branch, updates, { updatedAt: new Date().toISOString() });
    await this.save();
    return true;
  }

  async removeBranch(projectKey: string, branchName: string): Promise<boolean> {
    const project = this.getProject(projectKey);
    const initialLength = project.branches.length;
    project.branches = project.branches.filter(b => b.name !== branchName);

    if (project.branches.length < initialLength) {
      await this.save();
      return true;
    }

    return false;
  }

  getBuildUrl(projectKey: string, buildType: BuildType): string | undefined {
    const project = this.getProject(projectKey);
    if (!project.buildUrls) {
      return undefined;
    }
    return project.buildUrls[buildType];
  }

  async saveBuildUrl(projectKey: string, buildType: BuildType, url: string): Promise<void> {
    const project = this.getProject(projectKey);

    if (!project.buildUrls) {
      project.buildUrls = {};
    }

    project.buildUrls[buildType] = url;

    await this.save();
  }
}
