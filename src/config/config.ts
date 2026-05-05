export interface AppConfig {
  todoistApiToken: string;
  optInLabel: string;
  pollIntervalSeconds: number;
  fullReconcileIntervalHours: number;
  configPath: string;
  statePath: string;
  lockPath: string;
}

export interface SavedConfig {
  todoistApiToken?: string;
  optInLabel?: string;
  pollIntervalSeconds?: number;
  fullReconcileIntervalHours?: number;
}

const LOCAL_DIR = ".todoist-recurring-deadlines";

export function defaultPaths(env: NodeJS.ProcessEnv = process.env): Pick<AppConfig, "configPath" | "statePath" | "lockPath"> {
  if (env.TODOIST_DATA_DIR) {
    return {
      configPath: `${env.TODOIST_DATA_DIR}/config.json`,
      statePath: `${env.TODOIST_DATA_DIR}/state.json`,
      lockPath: `${env.TODOIST_DATA_DIR}/poller.lock`,
    };
  }

  return {
    configPath: env.TODOIST_CONFIG_PATH ?? `${LOCAL_DIR}/config.json`,
    statePath: env.TODOIST_STATE_PATH ?? `${LOCAL_DIR}/state.json`,
    lockPath: env.TODOIST_LOCK_PATH ?? `${LOCAL_DIR}/poller.lock`,
  };
}

export async function loadSavedConfig(path: string): Promise<SavedConfig> {
  const file = Bun.file(path);
  if (!(await file.exists())) return {};
  return await file.json();
}

export async function writeSavedConfig(path: string, config: SavedConfig): Promise<void> {
  await ensureParentDirectory(path);
  await Bun.write(path, JSON.stringify(config, null, 2));
  try {
    await chmod(path, 0o600);
  } catch {
    // Best effort: chmod is not available on every filesystem/platform.
  }
}

export async function loadConfig(env: NodeJS.ProcessEnv = process.env): Promise<AppConfig> {
  const paths = defaultPaths(env);
  const saved = await loadSavedConfig(paths.configPath);

  const todoistApiToken = env.TODOIST_API_TOKEN ?? saved.todoistApiToken;
  if (!todoistApiToken) {
    throw new Error("Missing Todoist API token. Run setup or set TODOIST_API_TOKEN.");
  }

  return {
    todoistApiToken,
    optInLabel: saved.optInLabel ?? "recurring-deadline",
    pollIntervalSeconds: numberFromEnv(env.TODOIST_POLL_INTERVAL_SECONDS) ?? saved.pollIntervalSeconds ?? 300,
    fullReconcileIntervalHours:
      numberFromEnv(env.TODOIST_FULL_RECONCILE_INTERVAL_HOURS) ?? saved.fullReconcileIntervalHours ?? 24,
    ...paths,
  };
}

export async function ensureParentDirectory(path: string): Promise<void> {
  const directory = path.split("/").slice(0, -1).join("/");
  if (directory) await Bun.$`mkdir -p ${directory}`.quiet();
}

function numberFromEnv(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function chmod(path: string, mode: number): Promise<void> {
  await Bun.$`chmod ${mode.toString(8)} ${path}`.quiet();
}
