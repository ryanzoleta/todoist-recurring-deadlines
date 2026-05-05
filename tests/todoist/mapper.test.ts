import { describe, expect, test } from "bun:test";
import { mapTask } from "../../src/todoist/mapper.ts";

describe("mapTask", () => {
  test("normalizes Sync API snake_case recurring due fields", () => {
    const task = mapTask({
      id: "task-1",
      labels: ["recurring-deadline"],
      due: {
        date: "2026-05-05",
        string: "every month",
        is_recurring: true,
      },
      deadline: { date: "2026-04-05" },
      checked: false,
      is_deleted: false,
    } as never);

    expect(task.due?.isRecurring).toBe(true);
    expect(task.isDeleted).toBe(false);
  });
});
