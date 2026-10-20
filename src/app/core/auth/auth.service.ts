import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { AuthUser, Credentials, RegistrationData } from './models/auth.model';

interface SessionAnswer {
  authenticated: boolean;
  user?: AuthUser;
}

/**
 * The session of the portal. The tokens never reach this code: the BFF keeps them in httpOnly cookies and only
 * tells us who is signed in. `restore()` runs once at start-up so a reload does not ask for the password again.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiBaseUrl}/auth`;
  private readonly current = signal<AuthUser | null>(null);

  readonly user = this.current.asReadonly();
  readonly isAuthenticated = computed(() => this.current() !== null);

  /** Asks the BFF who is signed in; any failure just means nobody is. */
  async restore(): Promise<void> {
    try {
      const answer = await firstValueFrom(this.http.get<SessionAnswer>(`${this.base}/me`));
      this.current.set(answer.authenticated && answer.user ? answer.user : null);
    } catch {
      this.current.set(null);
    }
  }

  /** Signs in; rejects with the HTTP error (401 = wrong credentials, 429 = too many attempts, 502 = service down). */
  async login(credentials: Credentials): Promise<void> {
    const answer = await firstValueFrom(this.http.post<SessionAnswer>(`${this.base}/login`, credentials));
    this.current.set(answer.user ?? null);
  }

  /** Ends the session on the BFF and here; the cookies are gone even if the BFF could not reach Backbone. */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(`${this.base}/logout`, {}));
    } finally {
      this.forget();
      await this.router.navigateByUrl('/login');
    }
  }

  /** The session is gone (the BFF answered 401 to a call): forget the person and go to the login. */
  async expire(): Promise<void> {
    this.forget();
    await this.router.navigateByUrl('/login');
  }

  register(data: RegistrationData): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/register`, data));
  }

  verifyEmail(alias: string, code: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/verify-email`, { alias, code }));
  }

  resendVerification(alias: string, language?: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/resend-verification`, { alias, language }));
  }

  private forget(): void {
    this.current.set(null);
  }
}
