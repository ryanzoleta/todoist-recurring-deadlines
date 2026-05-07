import { ensureParentDirectory } from "../config/config";
import type { AppState } from "./app-state";
import type { StateStore } from "./state-store";
import { acquireLock } from "./lock-file";

export type { AppState };

export async function loadState(path: string): Promise<AppState> {
  const file = Bun.file(path);
  if (!(await file.exists())) return {};
  return await file.json();
}

export async function writeStateAtomic(path: string, state: AppState): Promise<void> {
  await ensureParentDirectory(path);
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await Bun.write(tempPath, JSON.stringify(state, null, 2));
  await Bun.$`mv ${tempPath} ${path}`.quiet();
}

export function shouldRunFullReconcile(state: AppState, intervalHours: number, now = new Date()): boolean {
  if (!state.lastFullReconcileAt) return true;
  const last = new Date(state.lastFullReconcileAt).getTime();
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= intervalHours * 60 * 60 * 1000;
}

export function fileStateStore(opts: { statePath: string; lockPath: string }): StateStore {
  return {
    load: () => loadState(opts.statePath),
    save: (state) => writeStateAtomic(opts.statePath, state),
    withLock: async <T>(fn: () => Promise<T>): Promise<T | null> => {
      const lock = await acquireLock(opts.lockPath);
      if (!lock.acquired) return null;
      try {
        return await fn();
      } finally {
        await lock.release();
      }
    },
  };
}
