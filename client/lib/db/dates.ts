// Business date/time are stored as DATE and TIME(0) columns in company local
// time (data model D-04). The API speaks "YYYY-MM-DD" and "HH:mm" strings;
// these helpers convert at the boundary. Always build values as UTC so the
// calendar day cannot shift with the server timezone.
export function parseDate(value: string): Date {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d;
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseTime(value: string): Date {
  const t = new Date(`1970-01-01T${value.length === 5 ? `${value}:00` : value}.000Z`);
  if (Number.isNaN(t.getTime())) throw new Error(`Invalid time: ${value}`);
  return t;
}

export function formatTime(d: Date): string {
  return d.toISOString().slice(11, 16);
}
