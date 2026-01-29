import { invoke } from "@tauri-apps/api/core";
import { load, Store } from "@tauri-apps/plugin-store";
import { VercelClient, Deployment, Project, DeploymentState } from "@/vercel";

export interface AppState {
  accessToken: string | null;
  projectId: string | null;
  projectName: string | null;
  deployments: Deployment[];
  projects: Project[];
  isLoading: boolean;
  error: string | null;
}

type StateListener = (state: AppState) => void;

export class App {
  private store: Store | null = null;
  private client: VercelClient | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: StateListener[] = [];

  private state: AppState = {
    accessToken: null,
    projectId: null,
    projectName: null,
    deployments: [],
    projects: [],
    isLoading: false,
    error: null,
  };

  async init(): Promise<void> {
    this.store = await load("venue.json", {
      defaults: {},
      autoSave: true,
    });

    const accessToken = await this.store.get<string>("accessToken");
    const projectId = await this.store.get<string>("projectId");
    const projectName = await this.store.get<string>("projectName");

    if (accessToken) {
      this.client = new VercelClient(accessToken);
      this.updateState({ accessToken, projectId, projectName });

      if (projectId) {
        this.startPolling();
      } else {
        await this.loadProjects();
      }
    } else {
      this.updateTrayIcon("gray");
    }
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateState(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l(this.state));
  }

  private updateTrayIcon(status: string): void {
    invoke("set_tray_status", { status }).catch(console.error);
  }

  private getLatestDeploymentStatus(): string {
    const latest = this.state.deployments[0];
    if (!latest) return "gray";

    switch (latest.state) {
      case DeploymentState.Ready:
        return "ready";
      case DeploymentState.Error:
      case DeploymentState.Canceled:
        return "error";
      case DeploymentState.Building:
      case DeploymentState.Queued:
      case DeploymentState.Initializing:
        return "building";
      default:
        return "gray";
    }
  }

  async setAccessToken(token: string): Promise<void> {
    this.client = new VercelClient(token);
    await this.store?.set("accessToken", token);
    this.updateState({ accessToken: token });
    await this.loadProjects();
  }

  async selectProject(projectId: string, projectName: string): Promise<void> {
    await this.store?.set("projectId", projectId);
    await this.store?.set("projectName", projectName);
    this.updateState({ projectId, projectName, isLoading: true });
    this.startPolling();
  }

  async loadProjects(): Promise<void> {
    if (!this.client) return;

    this.updateState({ isLoading: true });
    try {
      const projects = await this.client.listProjects();
      this.updateState({ projects, isLoading: false });
    } catch (error) {
      this.updateState({ isLoading: false, error: String(error) });
    }
  }

  async refresh(): Promise<void> {
    await this.fetchDeployments();
  }

  private startPolling(): void {
    this.fetchDeployments();
    this.scheduleNextPoll();
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private scheduleNextPoll(): void {
    this.stopPolling();
    const hasActive = this.client?.hasActiveDeployment(this.state.deployments) ?? false;
    const interval = hasActive ? 5000 : 30000;
    this.pollingTimer = setInterval(() => this.fetchDeployments(), interval);
  }

  private async fetchDeployments(): Promise<void> {
    if (!this.client || !this.state.projectId) return;

    try {
      const deployments = await this.client.listDeployments(this.state.projectId);
      const hadActive = this.client.hasActiveDeployment(this.state.deployments);
      const hasActive = this.client.hasActiveDeployment(deployments);

      this.updateState({ deployments, isLoading: false });
      this.updateTrayIcon(this.getLatestDeploymentStatus());

      if (hadActive !== hasActive) {
        this.scheduleNextPoll();
      }
    } catch {
      this.updateState({ isLoading: false });
    }
  }

  async changeProject(): Promise<void> {
    this.stopPolling();
    await this.store?.delete("projectId");
    await this.store?.delete("projectName");
    this.updateState({ projectId: null, projectName: null, deployments: [] });
    this.updateTrayIcon("gray");
    await this.loadProjects();
  }

  async logout(): Promise<void> {
    this.stopPolling();
    this.client = null;
    await this.store?.delete("accessToken");
    await this.store?.delete("projectId");
    await this.store?.delete("projectName");
    this.updateState({
      accessToken: null,
      projectId: null,
      projectName: null,
      deployments: [],
      projects: [],
    });
    this.updateTrayIcon("gray");
  }
}

export const app = new App();
