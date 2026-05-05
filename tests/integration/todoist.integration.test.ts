import { TodoistApi, type Task } from "@doist/todoist-api-typescript";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AppConfig } from "../../src/config/config.ts";
import { loadConfig } from "../../src/config/config.ts";
import { OPT_IN_LABEL } from "../../src/core/types.ts";
import { loadState } from "../../src/state/file-state-store.ts";
import { SdkTodoistClient } from "../../src/todoist/client.ts";
import { runFullReconcile, runPoll } from "../../src/worker/poller.ts";

const createdTaskIds: string[] = [];

let baseConfig: AppConfig;
let api: TodoistApi;
let client: SdkTodoistClient;

describe("Todoist integration", () => {
  beforeAll(async () => {
    baseConfig = await loadConfig();
    api = new TodoistApi(baseConfig.todoistApiToken);
    client = new SdkTodoistClient(baseConfig.todoistApiToken);
    await client.ensureOptInLabel();
  });

  afterEach(async () => {
    while (createdTaskIds.length > 0) {
      const taskId = createdTaskIds.pop()!;
      try {
        await api.deleteTask(taskId);
      } catch {
        // Best effort cleanup. Recurring completion keeps the task active in normal cases.
      }
    }
  });

  test("poll --full repairs an active stale recurring task", async () => {
    const config = await isolatedConfig();
    const staleTask = await createStaleRecurringTask("poll-full");
    const staleDates = taskDates(staleTask);

    expect(staleTask.due?.isRecurring).toBe(true);
    expect(staleDates.deadline < staleDates.due).toBe(true);

    await Bun.sleep(2_000);

    const summary = await runPoll(config, client, { forceFullSync: true });
    const repairedTask = await api.getTask(staleTask.id);
    const repairedDates = taskDates(repairedTask);

    expect(summary.scanned).toBeGreaterThan(0);
    expect(summary.updated).toBeGreaterThan(0);
    expect(repairedDates.deadline >= repairedDates.due).toBe(true);
    expect(await loadState(config.statePath)).toMatchObject({ syncToken: expect.any(String) });
  }, 30_000);

  test("incremental poll repairs a changed active stale recurring task using the saved sync token", async () => {
    const config = await isolatedConfig();
    await runPoll(config, client, { forceFullSync: true });
    const initialState = await loadState(config.statePath);
    const staleTask = await createStaleRecurringTask("incremental-poll");
    const staleDates = taskDates(staleTask);

    expect(staleDates.deadline < staleDates.due).toBe(true);

    const summary = await runPoll(config, client);
    const repairedTask = await api.getTask(staleTask.id);
    const repairedDates = taskDates(repairedTask);
    const nextState = await loadState(config.statePath);

    expect(initialState.syncToken).toBeTruthy();
    expect(nextState.syncToken).toBeTruthy();
    expect(nextState.syncToken).not.toBe(initialState.syncToken);
    expect(summary.updated).toBeGreaterThan(0);
    expect(repairedDates.deadline >= repairedDates.due).toBe(true);
  }, 30_000);

  test("reconcile repairs an active labelled task without replacing the sync token", async () => {
    const config = await isolatedConfig();
    await runPoll(config, client, { forceFullSync: true });
    const stateBeforeReconcile = await loadState(config.statePath);
    const staleTask = await createStaleRecurringTask("reconcile");
    const staleDates = taskDates(staleTask);

    expect(staleDates.deadline < staleDates.due).toBe(true);

    const summary = await runFullReconcile(config, client);
    const repairedTask = await api.getTask(staleTask.id);
    const repairedDates = taskDates(repairedTask);
    const stateAfterReconcile = await loadState(config.statePath);

    expect(summary.updated).toBeGreaterThan(0);
    expect(repairedDates.deadline >= repairedDates.due).toBe(true);
    expect(stateAfterReconcile.syncToken).toBe(stateBeforeReconcile.syncToken);
    expect(stateAfterReconcile.lastFullReconcileAt).toEqual(expect.any(String));
  }, 30_000);
});

async function createStaleRecurringTask(testName: string): Promise<Task> {
  const task = await api.addTask({
    content: `[todoist-recurring-deadlines integration ${testName}] ${crypto.randomUUID()}`,
    labels: [OPT_IN_LABEL],
    dueString: "every month",
  });
  createdTaskIds.push(task.id);

  if (!task.due) throw new Error(`Test task ${task.id} is missing due date after creation`);
  const staleDeadline = addMonthsClamped(task.due.date, -1);
  return await api.updateTask(task.id, { deadlineDate: staleDeadline });
}

async function isolatedConfig(): Promise<AppConfig> {
  const directory = await mkdtemp(join(tmpdir(), "todoist-recurring-deadlines-integration-"));
  return {
    ...baseConfig,
    statePath: join(directory, "state.json"),
    lockPath: join(directory, "poller.lock"),
    configPath: join(directory, "config.json"),
    fullReconcileIntervalHours: 24,
  };
}

function taskDates(task: Task): { due: string; deadline: string } {
  if (!task.due) throw new Error(`Task ${task.id} is missing due date`);
  if (!task.deadline) throw new Error(`Task ${task.id} is missing deadline`);
  return { due: task.due.date, deadline: task.deadline.date };
}

function addMonthsClamped(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay))).toISOString().slice(0, 10);
}
