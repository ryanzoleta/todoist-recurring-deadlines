import { repairDeadline } from "../core/repair.ts";
import { mapTask } from "../todoist/mapper.ts";
import { InvalidSyncTokenError } from "../todoist/sync.ts";
import { loadState, shouldRunFullReconcile, writeStateAtomic, type AppState } from "../state/file-state-store.ts";
import { acquireLock } from "../state/lock-file.ts";
import type { AppConfig } from "../config/config.ts";
import type { CoreTask } from "../core/types.ts";
import type { TodoistClient } from "../todoist/client.ts";

export interface RunSummary {
  scanned: number;
  updated: number;
  skipped: number;
}

export interface PollOptions {
  forceFullSync?: boolean;
}

export async function runPoll(config: AppConfig, client: TodoistClient, options: PollOptions = {}): Promise<RunSummary> {
  return await withLock(config.lockPath, async () => {
    let state = await loadState(config.statePath);
    const syncToken = options.forceFullSync ? "*" : (state.syncToken ?? "*");

    try {
      const response = await client.syncItems(syncToken);
      const summary = await processTasks(response.items.map(mapTask), client);
      state = { ...state, syncToken: response.syncToken, lastSyncAt: new Date().toISOString() };

      if (!options.forceFullSync && shouldRunFullReconcile(state, config.fullReconcileIntervalHours)) {
        const fullSummary = await runFullReconcileWithoutLock(config, client, state);
        return combineSummaries(summary, fullSummary);
      }

      await writeStateAtomic(config.statePath, state);
      return summary;
    } catch (error) {
      if (!(error instanceof InvalidSyncTokenError)) throw error;

      const response = await client.syncItems("*");
      const summary = await processTasks(response.items.map(mapTask), client);
      await writeStateAtomic(config.statePath, {
        ...state,
        syncToken: response.syncToken,
        lastSyncAt: new Date().toISOString(),
      });
      return summary;
    }
  });
}

export async function runFullReconcile(config: AppConfig, client: TodoistClient): Promise<RunSummary> {
  return await withLock(config.lockPath, async () => {
    const state = await loadState(config.statePath);
    return await runFullReconcileWithoutLock(config, client, state);
  });
}

async function runFullReconcileWithoutLock(
  config: AppConfig,
  client: TodoistClient,
  state: AppState,
): Promise<RunSummary> {
  const tasks = await client.getActiveTasksByLabel(config.optInLabel);
  const summary = await processTasks(tasks, client);
  await writeStateAtomic(config.statePath, { ...state, lastFullReconcileAt: new Date().toISOString() });
  return summary;
}

async function processTasks(tasks: CoreTask[], client: TodoistClient): Promise<RunSummary> {
  const summary: RunSummary = { scanned: 0, updated: 0, skipped: 0 };

  for (const task of tasks) {
    summary.scanned += 1;
    const result = repairDeadline(task);

    if (result.action === "update") {
      await client.updateDeadline(result.taskId, result.deadline);
      summary.updated += 1;
    } else {
      summary.skipped += 1;
    }
  }

  return summary;
}

async function withLock(path: string, fn: () => Promise<RunSummary>): Promise<RunSummary> {
  const lock = await acquireLock(path);
  if (!lock.acquired) return { scanned: 0, updated: 0, skipped: 0 };

  try {
    return await fn();
  } finally {
    await lock.release();
  }
}

function combineSummaries(left: RunSummary, right: RunSummary): RunSummary {
  return {
    scanned: left.scanned + right.scanned,
    updated: left.updated + right.updated,
    skipped: left.skipped + right.skipped,
  };
}
