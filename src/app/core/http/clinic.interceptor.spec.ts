import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ClinicService } from '../clinic/clinic.service';
import { clinicInterceptor } from './clinic.interceptor';

describe('clinicInterceptor', () => {
  const active = signal<{ id: string } | null>({ id: 'c-1' });
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    active.set({ id: 'c-1' });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([clinicInterceptor])),
        provideHttpClientTesting(),
        { provide: ClinicService, useValue: { active } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });
  afterEach(() => controller.verify());

  const header = (url: string) => {
    http.get(url).subscribe();
    const req = controller.expectOne(url);
    req.flush({});
    return req.request.headers.get('X-Clinic-Id');
  };

  it('names the active clinic on every call to the API', () => {
    expect(header('/api/v1/patients')).toBe('c-1');
  });

  it('does not on the session routes, the list of clinics or other hosts', () => {
    expect(header('/api/v1/auth/me')).toBeNull();
    expect(header('/api/v1/me/clinicas')).toBeNull();
    expect(header('/i18n/es-VE.json')).toBeNull();
  });

  it('does not invent a clinic when there is none', () => {
    active.set(null);

    expect(header('/api/v1/patients')).toBeNull();
  });
});
