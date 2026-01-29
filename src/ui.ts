import { AppState } from "@/app";
import { Deployment, DeploymentState, getDeploymentUrl } from "@/vercel";

type ViewName = "auth" | "project-select" | "deployments" | "loading";

const $ = <T extends HTMLElement>(selector: string): T | null =>
  document.querySelector(selector);

export class UI {
  private onGetToken: () => void = () => {};
  private onLogin: (token: string) => void = () => {};
  private onRefresh: () => void = () => {};
  private onLogout: () => void = () => {};
  private onChangeProject: () => void = () => {};
  private onSelectProject: (id: string, name: string) => void = () => {};
  private onOpenDeployment: (url: string) => void = () => {};

  init(handlers: {
    onGetToken: () => void;
    onLogin: (token: string) => void;
    onRefresh: () => void;
    onLogout: () => void;
    onChangeProject: () => void;
    onSelectProject: (id: string, name: string) => void;
    onOpenDeployment: (url: string) => void;
  }): void {
    this.onGetToken = handlers.onGetToken;
    this.onLogin = handlers.onLogin;
    this.onRefresh = handlers.onRefresh;
    this.onLogout = handlers.onLogout;
    this.onChangeProject = handlers.onChangeProject;
    this.onSelectProject = handlers.onSelectProject;
    this.onOpenDeployment = handlers.onOpenDeployment;

    this.bindEvents();
  }

  private bindEvents(): void {
    $("#get-token-btn")?.addEventListener("click", () => this.onGetToken());

    $("#token-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $<HTMLInputElement>("#token-input");
      const token = input?.value.trim();
      if (token) {
        this.onLogin(token);
        if (input) input.value = "";
      }
    });

    $("#refresh-btn")?.addEventListener("click", () => this.onRefresh());
    $("#logout-btn")?.addEventListener("click", () => {
      this.toggleMenu();
      this.onLogout();
    });
    $("#project-logout-btn")?.addEventListener("click", () => this.onLogout());
    $("#change-project-btn")?.addEventListener("click", () => {
      this.toggleMenu();
      this.onChangeProject();
    });
    $("#menu-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    $("#project-search")?.addEventListener("input", (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      document.querySelectorAll<HTMLLIElement>("#project-list li").forEach((li) => {
        const name = li.textContent?.toLowerCase() ?? "";
        li.style.display = name.includes(query) ? "block" : "none";
      });
    });

    document.addEventListener("click", (e) => {
      const menu = $("#menu-dropdown");
      const menuBtn = $("#menu-btn");
      if (menu && !menu.contains(e.target as Node) && !menuBtn?.contains(e.target as Node)) {
        menu.classList.add("hidden");
      }
    });
  }

  private toggleMenu(): void {
    $("#menu-dropdown")?.classList.toggle("hidden");
  }

  render(state: AppState): void {
    const showHeader = Boolean(state.accessToken && state.projectId);
    $("header")?.classList.toggle("hidden", !showHeader);

    if (state.isLoading) {
      this.showView("loading");
      return;
    }

    if (!state.accessToken) {
      this.showView("auth");
      return;
    }

    if (!state.projectId) {
      this.showView("project-select");
      this.renderProjects(state.projects, state.error);
      return;
    }

    this.showView("deployments");
    this.setHeaderProject(state.projectName);
    this.renderDeployments(state.deployments, state.projectName);
  }

  private setHeaderProject(name: string | null): void {
    const el = $("#header-project-name");
    if (el) el.textContent = name ?? "";
  }

  private showView(view: ViewName): void {
    document.querySelectorAll<HTMLElement>(".view").forEach((v) => v.classList.add("hidden"));
    $(`#${view}-view`)?.classList.remove("hidden");
  }

  private renderProjects(projects: { id: string; name: string }[], error: string | null): void {
    const list = $<HTMLUListElement>("#project-list");
    if (!list) return;

    if (error) {
      list.innerHTML = `<li class="empty-projects" style="color: var(--error);">${this.escape(error)}</li>`;
      return;
    }

    if (projects.length === 0) {
      list.innerHTML = '<li class="empty-projects">No projects found. Check your token permissions.</li>';
      return;
    }

    list.innerHTML = projects
      .map((p) => `<li data-id="${p.id}" data-name="${p.name}">${this.escape(p.name)}</li>`)
      .join("");

    list.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => {
        const id = (li as HTMLElement).dataset.id!;
        const name = (li as HTMLElement).dataset.name!;
        this.onSelectProject(id, name);
      });
    });
  }

  private renderDeployments(deployments: Deployment[], projectName: string | null): void {
    const list = $<HTMLUListElement>("#deployment-list");
    const emptyState = $("#empty-state");
    if (!list || !emptyState) return;

    if (deployments.length === 0) {
      list.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    list.classList.remove("hidden");
    emptyState.classList.add("hidden");

    list.innerHTML = deployments.map((d) => this.renderDeploymentItem(d, projectName)).join("");

    list.querySelectorAll(".deployment-item").forEach((item) => {
      item.addEventListener("click", () => {
        const url = (item as HTMLElement).dataset.url;
        if (url) this.onOpenDeployment(url);
      });
    });
  }

  private renderDeploymentItem(d: Deployment, projectName: string | null): string {
    const commitMessage = d.commitMessage ?? d.name;
    const branch = d.branch ?? "main";
    const time = this.formatRelativeTime(d.createdAt);
    const statusClass = d.state.toLowerCase();
    const statusText = this.getStatusText(d.state);

    return `
      <li class="deployment-item" data-url="${getDeploymentUrl(projectName ?? "", d.uid)}">
        <span class="status-triangle ${statusClass}"></span>
        <div class="deployment-info">
          <div class="deployment-title">${this.escape(commitMessage)}</div>
          <div class="deployment-meta">
            <span class="deployment-status">${statusText}</span>
            <span class="deployment-time">${time}</span>
          </div>
        </div>
        <div class="deployment-branch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 3v12" stroke-linecap="round"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="6" r="3"/>
            <path d="M18 9a9 9 0 01-9 9" stroke-linecap="round"/>
          </svg>
          <span>${this.escape(branch)}</span>
        </div>
      </li>
    `;
  }

  private getStatusText(state: DeploymentState): string {
    switch (state) {
      case DeploymentState.Ready:
        return "Ready";
      case DeploymentState.Building:
        return "Building";
      case DeploymentState.Queued:
        return "Queued";
      case DeploymentState.Initializing:
        return "Initializing";
      case DeploymentState.Error:
        return "Error";
      case DeploymentState.Canceled:
        return "Canceled";
      default:
        return "Unknown";
    }
  }

  private formatRelativeTime(timestamp: number): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now.getTime() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 12) return `${hours}h ago`;

    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "today";
    if (isYesterday) return "yesterday";

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  private escape(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

export const ui = new UI();
