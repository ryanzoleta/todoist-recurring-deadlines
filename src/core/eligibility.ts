import { isDateOnly } from "./date";
import { parseRecurrenceInterval } from "./recurrence";
import { OPT_IN_LABEL, type CoreTask, type EligibilityResult } from "./types";

export function checkEligibility(task: CoreTask): EligibilityResult {
  if (task.isDeleted) return { eligible: false, reason: "task is deleted" };
  if (task.checked) return { eligible: false, reason: "task is completed" };
  if (!task.labels.includes(OPT_IN_LABEL)) return { eligible: false, reason: `missing ${OPT_IN_LABEL} label` };
  if (!task.due) return { eligible: false, reason: "missing due date" };
  if (!task.due.isRecurring) return { eligible: false, reason: "due date is not recurring" };
  if (task.due.datetime) return { eligible: false, reason: "due datetime is unsupported" };
  if (!isDateOnly(task.due.date)) return { eligible: false, reason: "due date is not date-only" };
  if (!task.deadline) return { eligible: false, reason: "missing deadline" };
  if (!isDateOnly(task.deadline.date)) return { eligible: false, reason: "deadline is not date-only" };

  const interval = parseRecurrenceInterval(task.due.string);
  if (!interval) return { eligible: false, reason: `unsupported recurrence: ${task.due.string}` };

  return { eligible: true, interval };
}
