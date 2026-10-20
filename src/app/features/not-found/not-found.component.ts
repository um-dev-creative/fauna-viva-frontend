import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6">
      <h1 class="font-display text-4xl font-bold">{{ 'notFound.title' | translate }}</h1>
      <a routerLink="/" class="font-bold text-fv-teal underline">{{ 'notFound.back' | translate }}</a>
    </main>
  `,
})
export class NotFoundComponent {}
