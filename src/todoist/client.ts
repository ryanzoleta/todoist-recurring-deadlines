import { TodoistApi, type Task } from "@doist/todoist-api-typescript";
import { OPT_IN_LABEL } from "../core/types.ts";
import { mapTask } from "./mapper.ts";
import { syncItems, type SyncResponse } from "./sync.ts";
import type { CoreTask } from "../core/types.ts";

export interface TodoistClient {
  validateToken(): Promise<void>;
  ensureOptInLabel(): Promise<void>;
  syncItems(syncToken: string): Promise<SyncResponse>;
  updateDeadline(taskId: string, deadline: string): Promise<void>;
  getActiveTasksByLabel(label: string): Promise<CoreTask[]>;
}

export class SdkTodoistClient implements TodoistClient {
  private readonly api: TodoistApi;

  constructor(private readonly apiToken: string) {
    this.api = new TodoistApi(apiToken);
  }

  async validateToken(): Promise<void> {
    await this.api.getTasks({ limit: 1 });
  }

  async ensureOptInLabel(): Promise<void> {
    const labels = await this.api.getLabels();
    if (labels.results.some((label) => label.name === OPT_IN_LABEL)) return;
    await this.api.addLabel({ name: OPT_IN_LABEL });
  }

  async syncItems(syncToken: string): Promise<SyncResponse> {
    return await syncItems(this.apiToken, syncToken);
  }

  async updateDeadline(taskId: string, deadline: string): Promise<void> {
    await this.api.updateTask(taskId, { deadlineDate: deadline });
  }

  async getActiveTasksByLabel(label: string): Promise<CoreTask[]> {
    const tasks: Task[] = [];
    let cursor: string | null | undefined;

    do {
      const response = await this.api.getTasks({ label, cursor, limit: 200 });
      tasks.push(...response.results);
      cursor = response.nextCursor;
    } while (cursor);

    return tasks.map(mapTask);
  }
}
