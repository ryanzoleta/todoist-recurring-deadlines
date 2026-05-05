import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AppConfig } from "../../src/config/config.ts";
import type { TodoistClient } from "../../src/todoist/client.ts";
import { loadState } from "../../src/state/file-state-store.ts";
import { runPoll } from "../../src/worker/poller.ts";

describe("runPoll", () => {
  test("forceFullSync uses sync_token=* and saves returned token", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trd-poller-"));
    const statePath = join(dir, "state.json");
    const requestedTokens: string[] = [];
    const client: TodoistClient = {
      validateToken: async () => {},
      ensureOptInLabel: async () => {},
      syncItems: async (syncToken) => {
        requestedTokens.push(syncToken);
        return { syncToken: "fresh-token", items: [] };
      },
      updateDeadline: async () => {},
      getActiveTasksByLabel: async () => [],
    };

    const summary = await runPoll(configFor(dir, statePath), client, { forceFullSync: true });

    expect(requestedTokens).toEqual(["*"]);
    expect(await loadState(statePath)).toMatchObject({ syncToken: "fresh-token" });
    expect(summary).toEqual({ scanned: 0, updated: 0, skipped: 0 });
  });
});

function configFor(dir: string, statePath: string): AppConfig {
  return {
    todoistApiToken: "token",
    optInLabel: "recurring-deadline",
    pollIntervalSeconds: 300,
    fullReconcileIntervalHours: 24,
    configPath: join(dir, "config.json"),
    statePath,
    lockPath: join(dir, "poller.lock"),
  };
}
