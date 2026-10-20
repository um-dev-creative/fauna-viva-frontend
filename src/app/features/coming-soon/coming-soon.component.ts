import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

/** Stands in for a section whose screen has not been built yet; its task replaces the route's component. */
@Component({
  selector: 'app-coming-soon',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="font-display text-3xl font-bold">{{ 'nav.' + section | translate }}</h1>
    <p class="mt-2">{{ 'comingSoon.text' | translate }}</p>
  `,
})
export class ComingSoonComponent {
  protected readonly section: string = inject(ActivatedRoute).snapshot.data['section'] ?? '';
}
