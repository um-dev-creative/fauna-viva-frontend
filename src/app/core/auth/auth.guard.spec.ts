import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { AuthService } from './auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('route guards', () => {
  const authenticated = signal(false);
  const run = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  beforeEach(() => {
    authenticated.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: authenticated } },
      ],
    });
  });

  it('authGuard lets a signed-in person through', () => {
    authenticated.set(true);
    expect(run(authGuard)).toBeTrue();
  });

  it('authGuard sends anyone else to the login', () => {
    const result = run(authGuard) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login');
  });

  it('guestGuard lets a visitor see the login and sign-up', () => {
    expect(run(guestGuard)).toBeTrue();
  });

  it('guestGuard sends a signed-in person to the start', () => {
    authenticated.set(true);
    const result = run(guestGuard) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/');
  });
});
