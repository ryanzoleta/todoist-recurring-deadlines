import { describe, expect, test } from "bun:test";
import { repairDeadline } from "../../src/core/repair";
import type { CoreTask } from "../../src/core/types";

function task(overrides: Partial<CoreTask> = {}): CoreTask {
  return {
    id: "task-1",
    labels: ["recurring-deadline"],
    due: { date: "2026-06-01", isRecurring: true, string: "monthly" },
    deadline: { date: "2026-05-15" },
    ...overrides,
  };
}

describe("repairDeadline", () => {
  test("advances monthly deadline until it is at least the due date", () => {
    expect(repairDeadline(task())).toEqual({
      action: "update",
      taskId: "task-1",
      deadline: "2026-06-15",
      previousDeadline: "2026-05-15",
    });
  });

  test("advances repeatedly for long-stale deadlines", () => {
    expect(repairDeadline(task({ due: { date: "2026-08-01", isRecurring: true, string: "monthly" } }))).toMatchObject({
      action: "update",
      deadline: "2026-08-15",
    });
  });

  test("allows deadline equal to due date", () => {
    expect(repairDeadline(task({ deadline: { date: "2026-06-01" } }))).toEqual({
      action: "noop",
      reason: "deadline is already valid",
    });
  });

  test("clamps monthly overflow", () => {
    expect(repairDeadline(task({ due: { date: "2026-02-01", isRecurring: true, string: "monthly" }, deadline: { date: "2026-01-31" } }))).toMatchObject({
      action: "update",
      deadline: "2026-02-28",
    });
  });

  test("clamps yearly leap day overflow", () => {
    expect(repairDeadline(task({ due: { date: "2029-02-01", isRecurring: true, string: "yearly" }, deadline: { date: "2028-02-29" } }))).toMatchObject({
      action: "update",
      deadline: "2029-02-28",
    });
  });

  test("ignores unsupported recurrence", () => {
    expect(repairDeadline(task({ due: { date: "2026-06-01", isRecurring: true, string: "every weekday" } }))).toEqual({
      action: "noop",
      reason: "unsupported recurrence: every weekday",
    });
  });
});
