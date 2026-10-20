import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { provideTestTranslate } from '../testing/translate';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { NotFoundComponent } from './features/not-found/not-found.component';

describe('routes', () => {
  const authenticated = signal(false);

  beforeEach(() => {
    authenticated.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideTestTranslate(),
        { provide: AuthService, useValue: { isAuthenticated: authenticated, user: signal(null) } },
      ],
    });
  });

  it('shows the home screen at the root to a signed-in person', async () => {
    authenticated.set(true);
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/');

    expect(component).toBeInstanceOf(HomeComponent);
  });

  it('sends a visitor from the root to the login', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/');

    expect(component).toBeInstanceOf(LoginComponent);
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('shows the sign-up screen to a visitor', async () => {
    const harness = await RouterTestingHarness.create();

    expect(await harness.navigateByUrl('/registro')).toBeInstanceOf(RegisterComponent);
  });

  it('sends a signed-in person away from the login and the sign-up', async () => {
    authenticated.set(true);
    const harness = await RouterTestingHarness.create();

    expect(await harness.navigateByUrl('/login')).toBeInstanceOf(HomeComponent);
    expect(await harness.navigateByUrl('/registro')).toBeInstanceOf(HomeComponent);
  });

  it('shows the not-found screen for any unknown path', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/no-existe');

    expect(component).toBeInstanceOf(NotFoundComponent);
    expect(TestBed.inject(Router).url).toBe('/no-existe');
  });
});
