import { format } from 'date-fns';
import type { Locale } from 'date-fns';

interface SafeFormatOptions {
  locale?: Locale;
  fallback?: string;
  noon?: boolean;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

export function parseDateValue(value: unknown, options: { noon?: boolean } = {}) {
  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = DATE_ONLY_PATTERN.test(trimmed)
    ? new Date(`${trimmed}T${options.noon ? '12:00:00' : '00:00:00'}`)
    : new Date(trimmed);

  return isValidDate(date) ? date : null;
}

export function toDateOnlyString(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const dateOnly = trimmed.split('T')[0];
    if (DATE_ONLY_PATTERN.test(dateOnly)) return dateOnly;
  }

  const date = parseDateValue(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

export function formatDateSafe(
  value: unknown,
  pattern: string,
  { locale, fallback = '--', noon = false }: SafeFormatOptions = {},
) {
  const date = parseDateValue(value, { noon });
  if (!date) return fallback;

  return format(date, pattern, locale ? { locale } : undefined);
}
