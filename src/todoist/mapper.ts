import type { Task } from "@doist/todoist-api-typescript";
import type { CoreTask } from "../core/types";

type TaskLike = Task & {
  due?: (Task["due"] & { is_recurring?: boolean }) | null;
  is_deleted?: boolean;
};

export function mapTask(task: TaskLike): CoreTask {
  return {
    id: task.id,
    labels: task.labels,
    due: task.due
      ? {
          date: task.due.date,
          datetime: task.due.datetime,
          isRecurring: task.due.isRecurring ?? task.due.is_recurring ?? false,
          string: task.due.string,
        }
      : null,
    deadline: task.deadline ? { date: task.deadline.date } : null,
    checked: task.checked,
    isDeleted: task.isDeleted ?? task.is_deleted,
  };
}
