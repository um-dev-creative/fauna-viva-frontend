import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { ClinicService } from './core/clinic/clinic.service';
import { Role } from './core/clinic/models/clinic.model';
import { provideTestTranslate } from '../testing/translate';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { NotFoundComponent } from './features/not-found/not-found.component';

const inShell = (harness: RouterTestingHarness, selector: string) =>
  harness.routeNativeElement!.querySelector(`main ${selector}`) !== null;

describe('routes', () => {
  const authenticated = signal(false);
  const roles = signal<Role[]>(['VETERINARIO']);
  const load = jasmine.createSpy('load');

  beforeEach(() => {
    authenticated.set(false);
    roles.set(['VETERINARIO']);
    load.calls.reset();
    load.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideTestTranslate(),
        { provide: AuthService, useValue: { isAuthenticated: authenticated, user: signal({ id: 'u', username: 'luis' }) } },
        {
          provide: ClinicService,
          useValue: {
            load,
            roles,
            active: () => ({ id: 'a', nombre: 'Clínica A' }),
            clinics: () => [{ id: 'a', nombre: 'Clínica A' }],
            version: () => 0,
            hasSeveral: () => false,
            hasAnyRole: (allowed: Role[]) => allowed.some((r) => roles().includes(r)),
          },
        },
      ],
    });
  });

  it('shows the home screen inside the shell to a signed-in person, after loading their clinics', async () => {
    authenticated.set(true);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/');

    expect(inShell(harness, 'app-home')).toBeTrue();
    expect(load).toHaveBeenCalled();
    expect(harness.routeNativeElement!.querySelector('nav')).not.toBeNull();
  });

  it('sends a visitor from the root to the login', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/');

    expect(component).toBeInstanceOf(LoginComponent);
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(load).not.toHaveBeenCalled();
  });

  it('shows the sign-up screen to a visitor', async () => {
    const harness = await RouterTestingHarness.create();

    expect(await harness.navigateByUrl('/registro')).toBeInstanceOf(RegisterComponent);
  });

  it('sends a signed-in person away from the login and the sign-up', async () => {
    authenticated.set(true);
    const harness = await RouterTestingHarness.create();

    for (const path of ['/login', '/registro']) {
      await harness.navigateByUrl(path);
      expect(TestBed.inject(Router).url).toBe('/');
      expect(inShell(harness, 'app-home')).toBeTrue();
    }
  });

  it('opens a section the role sees and refuses one it does not', async () => {
    authenticated.set(true);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/historia');
    expect(inShell(harness, 'app-coming-soon')).toBeTrue();

    await harness.navigateByUrl('/personal');
    expect(TestBed.inject(Router).url).toBe('/');
    expect(inShell(harness, 'app-home')).toBeTrue();
  });

  it('a guardian is refused the clinical record even by typing its address', async () => {
    authenticated.set(true);
    roles.set(['APODERADO']);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/historia');

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('shows the not-found screen for any unknown path', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/no-existe');

    expect(component).toBeInstanceOf(NotFoundComponent);
    expect(TestBed.inject(Router).url).toBe('/no-existe');
  });
});
