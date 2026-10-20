import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ClinicService } from '../../core/clinic/clinic.service';

@Component({
  selector: 'app-home',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="text-sm font-bold uppercase tracking-widest text-fv-teal">{{ clinic.active()?.nombre }}</p>
    <h1 class="font-display text-4xl font-bold">{{ 'home.title' | translate }}</h1>
    <p class="mt-2 text-lg">{{ 'home.subtitle' | translate }}</p>
    <p class="mt-4 rounded-xl border border-fv-line bg-fv-card px-4 py-3">{{ 'home.status' | translate }}</p>
  `,
})
export class HomeComponent {
  protected readonly clinic = inject(ClinicService);
}
