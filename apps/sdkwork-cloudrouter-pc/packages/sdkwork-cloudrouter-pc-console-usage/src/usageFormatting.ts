function padDateTimePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatUsageLogLocalTime(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return '-';
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized;
  }

  const datePart = [
    date.getFullYear(),
    padDateTimePart(date.getMonth() + 1),
    padDateTimePart(date.getDate()),
  ].join('-');
  const timePart = [
    padDateTimePart(date.getHours()),
    padDateTimePart(date.getMinutes()),
    padDateTimePart(date.getSeconds()),
  ].join(':');

  return `${datePart} ${timePart}`;
}
