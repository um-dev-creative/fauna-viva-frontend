import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import * as axe from 'axe-core';
import { AuthService } from '../../core/auth/auth.service';
import { ClinicService } from '../../core/clinic/clinic.service';
import { Clinic, Role } from '../../core/clinic/models/clinic.model';
import { NotificationService } from '../../core/notify/notification.service';
import { provideTestTranslate } from '../../../testing/translate';
import { ShellComponent } from './shell.component';

@Component({ template: '<p id="screen">pantalla</p>' })
class ScreenComponent {}

const clinic = (id: string, roles: Role[]): Clinic => ({ id, nombre: `Clínica ${id}`, roles, sedes: [] });

describe('ShellComponent', () => {
  const clinics = signal<Clinic[]>([]);
  const activeId = signal<string | null>(null);
  const version = signal(0);
  const user = signal<{ id: string; username: string; firstname?: string } | null>({ id: 'u', username: 'luis', firstname: 'Luis' });
  let select: jasmine.Spy;
  let clear: jasmine.Spy;
  let logout: jasmine.Spy;

  const clinicService = () => {
    const active = () => clinics().find((c) => c.id === activeId()) ?? null;
    return {
      clinics,
      version,
      active,
      roles: () => active()?.roles ?? [],
      hasSeveral: () => clinics().length > 1,
      select,
      clear,
    };
  };

  const open = async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    harness.detectChanges();
    return harness;
  };

  beforeEach(() => {
    select = jasmine.createSpy('select');
    clear = jasmine.createSpy('clear');
    logout = jasmine.createSpy('logout').and.resolveTo();
    clinics.set([clinic('a', ['VETERINARIO'])]);
    activeId.set('a');
    version.set(0);
    user.set({ id: 'u', username: 'luis', firstname: 'Luis' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: ShellComponent, children: [{ path: '', component: ScreenComponent }] }]),
        provideTestTranslate(),
        { provide: AuthService, useValue: { user, logout } },
        { provide: ClinicService, useValue: clinicService() },
      ],
    });
  });

  it('shows the menu of the active clinic\'s roles', async () => {
    const { routeNativeElement: el } = await open();

    const labels = Array.from(el!.querySelectorAll('nav a')).map((a) => a.textContent!.trim());
    expect(labels).toEqual(['Agenda', 'Pacientes', 'Urgencias', 'Historia clínica', 'Exámenes']);
    expect(el!.querySelector('#screen')).not.toBeNull();
  });

  it('changes the menu with the clinic: a guardian sees no staff sections', async () => {
    clinics.set([clinic('a', ['VETERINARIO']), clinic('b', ['APODERADO'])]);
    const harness = await open();
    const links = () => Array.from(harness.routeNativeElement!.querySelectorAll('nav a')).map((a) => a.textContent!.trim());

    activeId.set('b');
    harness.detectChanges();

    expect(links()).toEqual(['Agenda', 'Pacientes', 'Exámenes']);
  });

  it('shows the clinic selector only when the person has several', async () => {
    const harness = await open();
    expect(harness.routeNativeElement!.querySelector('select')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('header')!.textContent).toContain('Clínica a');

    clinics.set([clinic('a', ['VETERINARIO']), clinic('b', ['RECEPCION'])]);
    harness.detectChanges();

    const select = harness.routeNativeElement!.querySelector('select')!;
    expect(Array.from(select.options).map((o) => o.textContent!.trim())).toEqual(['Clínica a', 'Clínica b']);
    expect(select.value).toBe('a');
  });

  it('choosing another clinic asks the service to switch and closes the menu', async () => {
    clinics.set([clinic('a', ['VETERINARIO']), clinic('b', ['RECEPCION'])]);
    const harness = await open();
    const el = harness.routeNativeElement!;
    el.querySelector<HTMLButtonElement>('button[aria-controls]')!.click();
    harness.detectChanges();

    const picker = el.querySelector('select')!;
    picker.value = 'b';
    picker.dispatchEvent(new Event('change'));
    harness.detectChanges();

    expect(select).toHaveBeenCalledWith('b');
    expect(el.querySelector('button[aria-controls]')!.getAttribute('aria-expanded')).toBe('false');
  });

  it('rebuilds the screen when the clinic changes, so nothing of the previous one stays', async () => {
    const harness = await open();
    const before = harness.routeNativeElement!.querySelector('#screen');

    version.update((n) => n + 1);
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('#screen')).not.toBe(before);
  });

  it('the menu button opens and closes the menu for small screens', async () => {
    const harness = await open();
    const el = harness.routeNativeElement!;
    const button = el.querySelector<HTMLButtonElement>('button[aria-controls="menu-principal"]')!;
    const nav = el.querySelector('#menu-principal')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(nav.classList).toContain('hidden');

    button.click();
    harness.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(nav.classList).not.toContain('hidden');

    el.querySelector<HTMLAnchorElement>('nav a')!.click();
    harness.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('greets the person by first name, or by username when there is none', async () => {
    const harness = await open();
    expect(harness.routeNativeElement!.textContent).toContain('Hola, Luis');

    user.set({ id: 'u', username: 'luis' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Hola, luis');

    user.set(null);
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Hola,');
  });

  it('signing out forgets the clinics and ends the session', async () => {
    const harness = await open();
    const buttons = Array.from(harness.routeNativeElement!.querySelectorAll('header button'));

    (buttons.find((b) => b.textContent!.includes('Cerrar sesión')) as HTMLButtonElement).click();

    expect(clear).toHaveBeenCalled();
    expect(logout).toHaveBeenCalled();
  });

  it('says so when the account belongs to no clinic, with no menu', async () => {
    clinics.set([]);
    activeId.set(null);

    const harness = await open();

    expect(harness.routeNativeElement!.textContent).toContain('Aún no tienes una clínica');
    expect(harness.routeNativeElement!.querySelector('nav a')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('#screen')).toBeNull();
  });

  it('shows the notifications and lets the person dismiss them', async () => {
    const harness = await open();
    const notices = TestBed.inject(NotificationService);

    notices.push('Algo pasó');
    harness.detectChanges();
    const el = harness.routeNativeElement!;
    expect(el.querySelector('[role=status]')!.textContent).toContain('Algo pasó');

    el.querySelector<HTMLButtonElement>('[role=status] button')!.click();
    harness.detectChanges();
    expect(el.querySelector('[role=status]')!.textContent).not.toContain('Algo pasó');
  });

  it('marks the section being viewed', async () => {
    const harness = await open();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement!.querySelector('a[href="#contenido"]')).not.toBeNull();
  });

  it('has no accessibility violations in its structure (axe)', async () => {
    clinics.set([clinic('a', ['VETERINARIO']), clinic('b', ['ADMIN_CLINICA'])]);
    const harness = await open();

    const result = await axe.run(harness.routeNativeElement!, { rules: { region: { enabled: false } } });

    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
