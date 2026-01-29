import { openUrl } from "@tauri-apps/plugin-opener";
import { app } from "@/app";
import { ui } from "@/ui";
import { VERCEL_TOKEN_URL } from "@/vercel";

async function init(): Promise<void> {
  ui.init({
    onGetToken: () => openUrl(VERCEL_TOKEN_URL),
    onLogin: (token) => app.setAccessToken(token),
    onRefresh: () => app.refresh(),
    onLogout: () => app.logout(),
    onChangeProject: () => app.changeProject(),
    onSelectProject: (id, name) => app.selectProject(id, name),
    onOpenDeployment: (url) => openUrl(url),
  });

  app.subscribe((state) => ui.render(state));

  await app.init();
}

window.addEventListener("DOMContentLoaded", init);
