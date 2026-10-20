import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { ClinicService } from '../../core/clinic/clinic.service';
import { visibleNav } from '../../core/nav/nav.config';
import { NotificationService } from '../../core/notify/notification.service';

/**
 * The frame every signed-in screen lives in: the menu of the active clinic's roles, the clinic selector (only when the
 * person has several), who is signed in, and the messages. The routed screen is rebuilt when the clinic changes, so nothing
 * of the previous clinic stays on screen.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  protected readonly clinic = inject(ClinicService);
  protected readonly notifications = inject(NotificationService);

  protected readonly menuOpen = signal(false);
  protected readonly items = computed(() => visibleNav(this.clinic.roles()));
  protected readonly name = computed(() => {
    const user = this.auth.user();
    return user?.firstname || user?.username || '';
  });
  /** One entry whose identity changes with the clinic: the outlet inside is destroyed and created again. */
  protected readonly screenKey = computed(() => [this.clinic.version()]);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected choose(event: Event): void {
    this.clinic.select((event.target as HTMLSelectElement).value);
    this.closeMenu();
  }

  protected logout(): Promise<void> {
    this.clinic.clear();
    return this.auth.logout();
  }
}
