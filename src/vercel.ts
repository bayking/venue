import { fetch } from "@tauri-apps/plugin-http";

export const VERCEL_TOKEN_URL = "https://vercel.com/account/tokens";

export function getDeploymentUrl(projectName: string, deploymentId: string): string {
  return `https://vercel.com/${projectName}/${deploymentId}`;
}

export interface Project {
  id: string;
  name: string;
}

export interface Deployment {
  uid: string;
  name: string;
  state: DeploymentState;
  commitMessage: string | null;
  branch: string | null;
  createdAt: number;
}

export enum DeploymentState {
  Building = "BUILDING",
  Queued = "QUEUED",
  Initializing = "INITIALIZING",
  Ready = "READY",
  Error = "ERROR",
  Canceled = "CANCELED",
}

const ACTIVE_STATES = [
  DeploymentState.Building,
  DeploymentState.Queued,
  DeploymentState.Initializing,
];

const API_BASE = "https://api.vercel.com";

export class VercelClient {
  private token: string;

  constructor(accessToken: string) {
    this.token = accessToken;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async listProjects(): Promise<Project[]> {
    const result = await this.request<{ projects: Array<{ id: string; name: string }> }>(
      "/v9/projects?limit=100"
    );
    return result.projects.map((p) => ({ id: p.id, name: p.name }));
  }

  async listDeployments(projectId: string, limit = 10): Promise<Deployment[]> {
    const result = await this.request<{
      deployments: Array<{
        uid: string;
        name: string;
        state?: string;
        meta?: { githubCommitMessage?: string; gitlabCommitMessage?: string; githubCommitRef?: string; gitlabCommitRef?: string };
        created: number;
      }>;
    }>(`/v6/deployments?projectId=${projectId}&limit=${limit}`);

    return result.deployments.map((d) => ({
      uid: d.uid,
      name: d.name,
      state: (d.state ?? "READY") as DeploymentState,
      commitMessage: d.meta?.githubCommitMessage ?? d.meta?.gitlabCommitMessage ?? null,
      branch: d.meta?.githubCommitRef ?? d.meta?.gitlabCommitRef ?? null,
      createdAt: d.created,
    }));
  }

  hasActiveDeployment(deployments: Deployment[]): boolean {
    return deployments.some((d) => ACTIVE_STATES.includes(d.state));
  }
}
