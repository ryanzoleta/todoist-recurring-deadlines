import { eq } from "drizzle-orm";
import type { Pool } from "pg";
import type { AppState, StateStore } from "../../src/state/state-store";
import type { Db } from "../lib/db/client";
import { syncState } from "../lib/db/schema";

export function postgresStateStore(pool: Pool, db: Db, userId: string): StateStore {
  return {
    async load(): Promise<AppState> {
      const [row] = await db
        .select()
        .from(syncState)
        .where(eq(syncState.userId, userId))
        .limit(1);
      if (!row) return {};
      return {
        syncToken: row.syncToken ?? undefined,
        lastSyncAt: row.lastSyncAt?.toISOString(),
        lastFullReconcileAt: row.lastFullReconcileAt?.toISOString(),
      };
    },

    async save(state: AppState): Promise<void> {
      const lastSyncAt = state.lastSyncAt ? new Date(state.lastSyncAt) : null;
      const lastFullReconcileAt = state.lastFullReconcileAt ? new Date(state.lastFullReconcileAt) : null;
      await db
        .insert(syncState)
        .values({
          userId,
          syncToken: state.syncToken ?? null,
          lastSyncAt,
          lastFullReconcileAt,
        })
        .onConflictDoUpdate({
          target: syncState.userId,
          set: {
            syncToken: state.syncToken ?? null,
            lastSyncAt,
            lastFullReconcileAt,
          },
        });
    },

    async withLock<T>(fn: () => Promise<T>): Promise<T | null> {
      const client = await pool.connect();
      try {
        const acquireResult = await client.query<{ acquired: boolean }>(
          "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
          [userId],
        );
        const acquired = acquireResult.rows[0]?.acquired === true;
        if (!acquired) return null;
        try {
          return await fn();
        } finally {
          await client.query("SELECT pg_advisory_unlock(hashtext($1))", [userId]);
        }
      } finally {
        client.release();
      }
    },
  };
}
