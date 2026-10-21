import { Injectable, signal } from '@angular/core';

export interface Notice {
  id: number;
  text: string;
}

const LIFETIME_MS = 8000;

/** Short messages the shell shows over the screen (an error the person should read, a confirmation). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private next = 1;
  private readonly list = signal<Notice[]>([]);

  readonly notices = this.list.asReadonly();

  push(text: string): void {
    const id = this.next++;
    this.list.update((all) => [...all.filter((n) => n.text !== text), { id, text }]);
    setTimeout(() => this.dismiss(id), LIFETIME_MS);
  }

  dismiss(id: number): void {
    this.list.update((all) => all.filter((n) => n.id !== id));
  }
}
