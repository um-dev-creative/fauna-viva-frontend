import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ClinicService } from './clinic.service';
import { Clinic } from './models/clinic.model';

const A: Clinic = { id: 'a', nombre: 'Clínica A', roles: ['VETERINARIO'], sedes: [{ id: 's1', nombre: 'Centro' }] };
const B: Clinic = { id: 'b', nombre: 'Clínica B', roles: ['RECEPCION', 'ADMIN_CLINICA'], sedes: [] };

describe('ClinicService', () => {
  const user = signal<{ id: string } | null>({ id: 'u-1' });
  let service: ClinicService;
  let http: HttpTestingController;

  const load = async (clinics: Clinic[], force = false) => {
    const done = service.load(force);
    http.expectOne('/api/v1/me/clinicas').flush(clinics);
    await done;
  };

  beforeEach(() => {
    localStorage.clear();
    user.set({ id: 'u-1' });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: { user } }],
    });
    service = TestBed.inject(ClinicService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('starts empty', () => {
    expect(service.clinics()).toEqual([]);
    expect(service.active()).toBeNull();
    expect(service.roles()).toEqual([]);
    expect(service.hasSeveral()).toBeFalse();
  });

  it('works in the first clinic when none was chosen before', async () => {
    await load([A, B]);

    expect(service.active()).toEqual(A);
    expect(service.roles()).toEqual(['VETERINARIO']);
    expect(service.hasSeveral()).toBeTrue();
  });

  it('does not ask again for the same person, unless forced', async () => {
    await load([A]);
    await service.load();
    await load([A, B], true);

    expect(service.clinics().length).toBe(2);
  });

  it('a person with no clinics has no active one', async () => {
    await load([]);

    expect(service.active()).toBeNull();
  });

  it('nobody signed in loads nothing', async () => {
    user.set(null);

    await service.load();

    expect(service.clinics()).toEqual([]);
  });

  it('select() changes the clinic, bumps the version and is remembered for that person', async () => {
    await load([A, B]);
    const before = service.version();

    service.select('b');

    expect(service.active()).toEqual(B);
    expect(service.roles()).toEqual(['RECEPCION', 'ADMIN_CLINICA']);
    expect(service.version()).toBe(before + 1);
    expect(localStorage.getItem('fv.clinic.u-1')).toBe('b');
  });

  it('the remembered clinic is used next time, and an unknown one is ignored', async () => {
    localStorage.setItem('fv.clinic.u-1', 'b');
    await load([A, B]);
    expect(service.active()).toEqual(B);

    localStorage.setItem('fv.clinic.u-1', 'gone');
    await load([A, B], true);
    expect(service.active()).toEqual(A);
  });

  it('select() ignores the clinic already active, an unknown one, and no session', async () => {
    await load([A, B]);
    const before = service.version();

    service.select('a');
    service.select('zzz');
    user.set(null);
    service.select('b');

    expect(service.version()).toBe(before);
    expect(service.active()).toEqual(A);
  });

  it('works when browser storage is not available', async () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('blocked');
    spyOn(Storage.prototype, 'setItem').and.throwError('blocked');
    await load([A, B]);

    service.select('b');

    expect(service.active()).toEqual(B);
  });

  it('clear() forgets the clinics and changes the version', async () => {
    await load([A, B]);
    const before = service.version();

    service.clear();

    expect(service.clinics()).toEqual([]);
    expect(service.active()).toBeNull();
    expect(service.version()).toBe(before + 1);
  });

  it('a different person gets their own list, never the previous one', async () => {
    await load([A, B]);
    user.set({ id: 'u-2' });

    await load([B]);

    expect(service.clinics()).toEqual([B]);
  });

  it('hasAnyRole() looks at the roles of the active clinic only', async () => {
    await load([A, B]);

    expect(service.hasAnyRole(['VETERINARIO'])).toBeTrue();
    expect(service.hasAnyRole(['ADMIN_CLINICA'])).toBeFalse();
    service.select('b');
    expect(service.hasAnyRole(['ADMIN_CLINICA'])).toBeTrue();
  });
});
