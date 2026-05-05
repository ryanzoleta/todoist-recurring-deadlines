import { OPT_IN_LABEL } from "../core/types.ts";
import { defaultPaths, writeSavedConfig } from "./config.ts";
import type { TodoistClient } from "../todoist/client.ts";

export interface SetupOptions {
  token: string;
  configPath?: string;
}

export async function runSetup(options: SetupOptions, client: TodoistClient): Promise<void> {
  await client.validateToken();
  await client.ensureOptInLabel();
  const configPath = options.configPath ?? defaultPaths().configPath;

  await writeSavedConfig(configPath, {
    todoistApiToken: options.token,
    optInLabel: OPT_IN_LABEL,
    pollIntervalSeconds: 300,
    fullReconcileIntervalHours: 24,
  });
}
