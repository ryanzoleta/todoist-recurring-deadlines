import { and, eq, isNull } from "drizzle-orm";
import type { Pool } from "pg";
import { SdkTodoistClient } from "../../src/todoist/client";
import { TodoistAuthError } from "../../src/todoist/sync";
import { runPoll } from "../../src/worker/poller";
import { db, pool, type Db } from "../lib/db/client";
import { account, repairEvents, serviceSettings } from "../lib/db/schema";
import { postgresStateStore } from "./postgres-state-store";

const TICK_INTERVAL_MS = 5 * 60 * 1000;
const TODOIST_PROVIDER_ID = "todoist";

const shutdown = { requested: false };
process.on("SIGTERM", () => {
  shutdown.requested = true;
  console.log("worker received SIGTERM");
});
process.on("SIGINT", () => {
  shutdown.requested = true;
  console.log("worker received SIGINT");
});

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  await waitForDb(pool);
  console.log("worker started");

  while (!shutdown.requested) {
    const tickStart = Date.now();
    try {
      await runTick();
    } catch (err) {
      console.error("tick failed:", err instanceof Error ? err.message : err);
    }
    const elapsed = Date.now() - tickStart;
    const wait = TICK_INTERVAL_MS - elapsed;
    if (wait > 0 && !shutdown.requested) await sleepInterruptible(wait);
  }

  console.log("worker shutting down");
  await pool.end();
}

async function waitForDb(p: Pool): Promise<void> {
  const deadline = Date.now() + 30_000;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      await p.query("SELECT 1");
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw lastErr ?? new Error("database not ready");
}

async function runTick(): Promise<void> {
  const rows = await db
    .select({
      userId: serviceSettings.userId,
      optInLabel: serviceSettings.optInLabel,
      fullReconcileIntervalHours: serviceSettings.fullReconcileIntervalHours,
      accessToken: account.accessToken,
    })
    .from(serviceSettings)
    .innerJoin(
      account,
      and(eq(account.userId, serviceSettings.userId), eq(account.providerId, TODOIST_PROVIDER_ID)),
    )
    .where(and(eq(serviceSettings.enabled, true), isNull(serviceSettings.tokenRevokedAt)));

  for (const row of rows) {
    if (shutdown.requested) break;
    if (!row.accessToken) continue;

    try {
      const store = postgresStateStore(pool, db, row.userId);
      const client = new SdkTodoistClient(row.accessToken);
      const summary = await runPoll(store, client, {
        fullReconcileIntervalHours: row.fullReconcileIntervalHours,
        optInLabel: row.optInLabel,
        onRepair: async (event) => {
          await db.insert(repairEvents).values({
            userId: row.userId,
            taskId: event.taskId,
            previousDeadline: event.previousDeadline,
            newDeadline: event.deadline,
          });
        },
      });
      console.log(
        `user=${row.userId} scanned=${summary.scanned} updated=${summary.updated} skipped=${summary.skipped}`,
      );
    } catch (err) {
      if (err instanceof TodoistAuthError) {
        await db
          .update(serviceSettings)
          .set({ tokenRevokedAt: new Date(), updatedAt: new Date() })
          .where(eq(serviceSettings.userId, row.userId));
        console.warn(`user=${row.userId} token revoked (status=${err.status})`);
      } else {
        console.error(`user=${row.userId} failed:`, err instanceof Error ? err.message : err);
      }
    }
  }
}

function sleepInterruptible(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (shutdown.requested || Date.now() - start >= ms) {
        resolve();
        return;
      }
      setTimeout(tick, 200);
    };
    setTimeout(tick, 200);
  });
}

// Db type re-export so external consumers can match the worker's drizzle instance.
export type { Db };

main().catch((err) => {
  console.error("worker fatal:", err);
  process.exit(1);
});
