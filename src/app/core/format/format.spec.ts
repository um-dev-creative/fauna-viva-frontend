import { formatDate, formatDateTime, formatMoney } from './format';
import { FvDatePipe, FvDateTimePipe, FvMoneyPipe } from './format.pipes';

describe('formats', () => {
  // 2026-10-20T02:30:00Z is still the 19th at 22:30 in Caracas (UTC-4), whatever zone the browser is in
  const instant = '2026-10-20T02:30:00Z';

  it('shows dates and times in Venezuela\'s time zone', () => {
    expect(formatDate(instant)).toContain('19');
    expect(formatDateTime(instant)).toMatch(/22:30|10:30/);
  });

  it('accepts a Date and a timestamp as well', () => {
    expect(formatDate(new Date(instant))).toBe(formatDate(instant));
    expect(formatDate(Date.parse(instant))).toBe(formatDate(instant));
  });

  it('writes dollars and bolívares with the symbols Venezuela uses', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1.234,50');
    expect(formatMoney(1234.5, 'VES')).toBe('Bs. 1.234,50');
    expect(formatMoney(0, 'USD')).toBe('$0,00');
  });

  it('the pipes give an empty text for no value', () => {
    expect(new FvDatePipe().transform(null)).toBe('');
    expect(new FvDateTimePipe().transform(undefined)).toBe('');
    expect(new FvMoneyPipe().transform(null)).toBe('');
  });

  it('the pipes format like the functions, and money defaults to dollars', () => {
    expect(new FvDatePipe().transform(instant)).toBe(formatDate(instant));
    expect(new FvDateTimePipe().transform(instant)).toBe(formatDateTime(instant));
    expect(new FvMoneyPipe().transform(5)).toBe('$5,00');
    expect(new FvMoneyPipe().transform(5, 'VES')).toBe('Bs. 5,00');
  });
});
