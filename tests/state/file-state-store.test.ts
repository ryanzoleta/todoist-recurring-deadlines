import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadState, shouldRunFullReconcile, writeStateAtomic } from "../../src/state/file-state-store.ts";

describe("file state store", () => {
  test("writes and reads state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trd-state-"));
    const path = join(dir, "state.json");

    await writeStateAtomic(path, { syncToken: "abc" });

    expect(await loadState(path)).toEqual({ syncToken: "abc" });
  });

  test("detects due full reconciliation", () => {
    expect(shouldRunFullReconcile({}, 24, new Date("2026-05-05T00:00:00.000Z"))).toBe(true);
    expect(
      shouldRunFullReconcile(
        { lastFullReconcileAt: "2026-05-04T00:00:00.000Z" },
        24,
        new Date("2026-05-05T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      shouldRunFullReconcile(
        { lastFullReconcileAt: "2026-05-04T12:00:00.000Z" },
        24,
        new Date("2026-05-05T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
