/**
 * Date bounds are interpreted as UTC calendar days and the upper bound is
 * extended to 23:59:59.999 so `to=2026-10-10` includes that whole day.
 * Storing and comparing in UTC keeps the "date-wise" filter stable regardless
 * of which Render region serves the request.
 */
export function buildDateRange(
  field: string,
  from?: string,
  to?: string,
): Record<string, { $gte?: Date; $lte?: Date }> {
  const range: { $gte?: Date; $lte?: Date } = {};

  if (from) {
    const start = new Date(`${from}T00:00:00.000Z`);
    if (!Number.isNaN(start.getTime())) range.$gte = start;
  }
  if (to) {
    const end = new Date(`${to}T23:59:59.999Z`);
    if (!Number.isNaN(end.getTime())) range.$lte = end;
  }

  return Object.keys(range).length > 0 ? { [field]: range } : {};
}

export function monthsAgo(count: number): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - count);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function startOfCurrentMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(): Date {
  const d = new Date();
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
