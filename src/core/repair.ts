import { compareDateOnly } from "./date";
import { checkEligibility } from "./eligibility";
import { advanceDate } from "./recurrence";
import type { CoreTask, RepairResult } from "./types";

const MAX_ADVANCE_ITERATIONS = 500;

export function repairDeadline(task: CoreTask): RepairResult {
  const eligibility = checkEligibility(task);
  if (!eligibility.eligible) return { action: "noop", reason: eligibility.reason };

  const due = task.due!.date;
  const previousDeadline = task.deadline!.date;
  let deadline = previousDeadline;
  let iterations = 0;

  while (compareDateOnly(deadline, due) < 0) {
    deadline = advanceDate(deadline, eligibility.interval);
    iterations += 1;

    if (iterations > MAX_ADVANCE_ITERATIONS) {
      return { action: "noop", reason: "deadline advance exceeded safety cap" };
    }
  }

  if (deadline === previousDeadline) return { action: "noop", reason: "deadline is already valid" };

  return { action: "update", taskId: task.id, deadline, previousDeadline };
}
