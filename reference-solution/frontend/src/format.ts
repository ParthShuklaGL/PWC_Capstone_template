const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

/** Deal values are GBP with two decimals. */
export function formatMoney(value: number): string {
  return money.format(value);
}

/** PROSPECTING becomes Prospecting. */
export function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** 12 Oct 2026. A bare yyyy-MM-dd (a deal's close date) is read as a calendar day, so no time zone can move it. */
export function formatDate(iso: string): string {
  if (DATE_ONLY.test(iso)) {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
