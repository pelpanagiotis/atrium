export function toMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  return toMonthKey(new Date(Date.UTC(year!, (month ?? 1) - 1 + delta, 1)));
}

export function parseMonthKey(monthKey: string): { year: number; monthIndex: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year: year!, monthIndex: (month ?? 1) - 1 };
}

export function calendarMonthHref(monthKey: string, currentKey: string): string {
  return monthKey === currentKey ? "/calendar" : `/calendar?month=${monthKey}`;
}
