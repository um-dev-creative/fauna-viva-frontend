/** The portal shows dates and times in Venezuela's time zone, whatever the browser's. */
export const TIME_ZONE = 'America/Caracas';
export const LOCALE = 'es-VE';

export type Currency = 'USD' | 'VES';

const asDate = (value: Date | string | number): Date => (value instanceof Date ? value : new Date(value));

export function formatDate(value: Date | string | number): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, dateStyle: 'medium' }).format(asDate(value));
}

export function formatDateTime(value: Date | string | number): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' }).format(asDate(value));
}

/** An amount in dollars or bolívares, with the symbol each is known by in Venezuela. */
export function formatMoney(amount: number, currency: Currency): string {
  const number = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return currency === 'USD' ? `$${number}` : `Bs. ${number}`;
}
