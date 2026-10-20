import { Pipe, PipeTransform } from '@angular/core';
import { Currency, formatDate, formatDateTime, formatMoney } from './format';

@Pipe({ name: 'fvDate' })
export class FvDatePipe implements PipeTransform {
  transform(value: Date | string | number | null | undefined): string {
    return value == null ? '' : formatDate(value);
  }
}

@Pipe({ name: 'fvDateTime' })
export class FvDateTimePipe implements PipeTransform {
  transform(value: Date | string | number | null | undefined): string {
    return value == null ? '' : formatDateTime(value);
  }
}

@Pipe({ name: 'fvMoney' })
export class FvMoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency: Currency = 'USD'): string {
    return value == null ? '' : formatMoney(value, currency);
  }
}
