import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '../auth/auth.service';
import { Clinic, Role } from './models/clinic.model';

const STORAGE_PREFIX = 'fv.clinic.';

/**
 * The clinics of the signed-in person and the one they are working in. The roles come from the system (ADR 012), never from
 * the token. The chosen clinic is remembered per person in this browser; `version` changes with every choice so a screen can
 * drop what it loaded for the previous clinic.
 */
@Injectable({ providedIn: 'root' })
export class ClinicService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly all = signal<Clinic[]>([]);
  private readonly activeId = signal<string | null>(null);
  private readonly counter = signal(0);
  private loadedFor: string | null = null;

  readonly clinics = this.all.asReadonly();
  readonly version = this.counter.asReadonly();
  readonly active = computed(() => this.all().find((c) => c.id === this.activeId()) ?? null);
  readonly roles = computed<Role[]>(() => this.active()?.roles ?? []);
  readonly hasSeveral = computed(() => this.all().length > 1);

  /** Loads the clinics once per person; a different person (or `force`) loads them again. */
  async load(force = false): Promise<void> {
    const userId = this.auth.user()?.id ?? null;
    if (!force && userId !== null && userId === this.loadedFor) return;
    this.clear();
    if (userId === null) return;
    const clinics = await firstValueFrom(this.http.get<Clinic[]>(`${environment.apiBaseUrl}/me/clinicas`));
    this.all.set(clinics);
    this.loadedFor = userId;
    const remembered = this.read(userId);
    this.activeId.set(clinics.find((c) => c.id === remembered)?.id ?? clinics[0]?.id ?? null);
  }

  /** Works in another clinic of the person's list; anything else is ignored. */
  select(id: string): void {
    const userId = this.auth.user()?.id;
    if (!userId || id === this.activeId() || !this.all().some((c) => c.id === id)) return;
    this.activeId.set(id);
    this.counter.update((n) => n + 1);
    this.write(userId, id);
  }

  /** Forgets everything (the person signed out). */
  clear(): void {
    this.all.set([]);
    this.activeId.set(null);
    this.loadedFor = null;
    this.counter.update((n) => n + 1);
  }

  hasAnyRole(allowed: readonly Role[]): boolean {
    const mine = this.roles();
    return allowed.some((role) => mine.includes(role));
  }

  // Browser storage can be missing or throw (private window, blocked site data): the choice is a convenience, never required.
  private read(userId: string): string | null {
    try {
      return localStorage.getItem(STORAGE_PREFIX + userId);
    } catch {
      return null;
    }
  }

  private write(userId: string, id: string): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + userId, id);
    } catch {
      /* not remembered */
    }
  }
}
