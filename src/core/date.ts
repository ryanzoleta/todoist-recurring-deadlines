const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const date = parseDateOnly(value);
  return formatDateOnly(date) === value;
}

export function compareDateOnly(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function addDays(date: string, days: number): string {
  const parsed = parseDateOnly(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatDateOnly(parsed);
}

export function addMonthsClamped(date: string, months: number): string {
  const parsed = parseDateOnly(date);
  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth();
  const day = parsed.getUTCDate();
  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = daysInMonth(targetYear, normalizedMonth);
  return formatDateOnly(new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay))));
}

export function addYearsClamped(date: string, years: number): string {
  const parsed = parseDateOnly(date);
  const targetYear = parsed.getUTCFullYear() + years;
  const month = parsed.getUTCMonth();
  const day = parsed.getUTCDate();
  const lastDay = daysInMonth(targetYear, month);
  return formatDateOnly(new Date(Date.UTC(targetYear, month, Math.min(day, lastDay))));
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, zeroBasedMonth: number): number {
  return new Date(Date.UTC(year, zeroBasedMonth + 1, 0)).getUTCDate();
}
