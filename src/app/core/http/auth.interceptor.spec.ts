import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../auth/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let expire: jasmine.Spy;

  beforeEach(() => {
    expire = jasmine.createSpy('expire').and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { expire } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });
  afterEach(() => controller.verify());

  it('marks every call to the BFF with the CSRF header', () => {
    http.get('/api/v1/patients').subscribe();

    const req = controller.expectOne('/api/v1/patients');
    expect(req.request.headers.get('x-fv-csrf')).toBe('1');
    req.flush({});
  });

  it('leaves other calls alone', () => {
    http.get('/i18n/es-VE.json').subscribe();

    const req = controller.expectOne('/i18n/es-VE.json');
    expect(req.request.headers.has('x-fv-csrf')).toBeFalse();
    req.flush({});
  });

  it('a 401 on an ordinary call ends the session and still reaches the caller', () => {
    let status = 0;
    http.get('/api/v1/patients').subscribe({ error: (e) => (status = e.status) });

    controller.expectOne('/api/v1/patients').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(expire).toHaveBeenCalledTimes(1);
    expect(status).toBe(401);
  });

  it('a 401 from login or /me is an answer, not an expired session', () => {
    http.post('/api/v1/auth/login', {}).subscribe({ error: () => undefined });
    controller.expectOne('/api/v1/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.get('/api/v1/auth/me').subscribe({ error: () => undefined });
    controller.expectOne('/api/v1/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(expire).not.toHaveBeenCalled();
  });

  it('other errors do not end the session', () => {
    http.get('/api/v1/patients').subscribe({ error: () => undefined });

    controller.expectOne('/api/v1/patients').flush({}, { status: 500, statusText: 'Error' });

    expect(expire).not.toHaveBeenCalled();
  });
});
