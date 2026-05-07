import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TodoistClient } from "../../src/todoist/client";
import { fileStateStore, loadState } from "../../src/state/file-state-store";
import { runPoll } from "../../src/worker/poller";

describe("runPoll", () => {
  test("forceFullSync uses sync_token=* and saves returned token", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trd-poller-"));
    const statePath = join(dir, "state.json");
    const lockPath = join(dir, "poller.lock");
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

    const summary = await runPoll(fileStateStore({ statePath, lockPath }), client, {
      forceFullSync: true,
      fullReconcileIntervalHours: 24,
      optInLabel: "recurring-deadline",
    });

    expect(requestedTokens).toEqual(["*"]);
    expect(await loadState(statePath)).toMatchObject({ syncToken: "fresh-token" });
    expect(summary).toEqual({ scanned: 0, updated: 0, skipped: 0 });
  });
});
