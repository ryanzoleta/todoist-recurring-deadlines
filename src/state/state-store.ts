import type { AppState } from "./app-state";

export type { AppState };

export interface StateStore {
  load(): Promise<AppState>;
  save(state: AppState): Promise<void>;
  withLock<T>(fn: () => Promise<T>): Promise<T | null>;
}
