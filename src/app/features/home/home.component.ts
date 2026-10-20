import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6">
      <p class="text-sm font-bold uppercase tracking-widest text-fv-teal">{{ 'app.name' | translate }}</p>
      <h1 class="font-display text-4xl font-bold">{{ 'home.title' | translate }}</h1>
      <p class="text-lg">{{ 'home.subtitle' | translate }}</p>
      <p class="rounded-xl border border-fv-line bg-fv-card px-4 py-3">{{ 'home.status' | translate }}</p>
    </main>
  `,
})
export class HomeComponent {}
