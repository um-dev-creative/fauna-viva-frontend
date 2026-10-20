import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

const LUIS = { id: 'u-1', username: 'luis', firstname: 'Luis', lastname: 'Mata' };

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  });
  afterEach(() => http.verify());

  it('starts with nobody signed in', () => {
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('restore() takes the person the BFF says is signed in', async () => {
    const done = service.restore();
    http.expectOne('/api/v1/auth/me').flush({ authenticated: true, user: LUIS });
    await done;

    expect(service.user()).toEqual(LUIS);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('restore() leaves nobody signed in when the BFF says so or fails', async () => {
    let done = service.restore();
    http.expectOne('/api/v1/auth/me').flush({ authenticated: false });
    await done;
    expect(service.user()).toBeNull();

    done = service.restore();
    http.expectOne('/api/v1/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    await done;
    expect(service.user()).toBeNull();
  });

  it('login() posts the credentials and remembers the person', async () => {
    const done = service.login({ email: 'a@b.c', password: 'pw' });
    const req = http.expectOne('/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.c', password: 'pw' });
    req.flush({ authenticated: true, user: LUIS });
    await done;

    expect(service.user()).toEqual(LUIS);
  });

  it('login() rejects with the HTTP error and signs nobody in', async () => {
    const done = service.login({ email: 'a@b.c', password: 'bad' });
    http.expectOne('/api/v1/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });

    await expectAsync(done).toBeRejected();
    expect(service.user()).toBeNull();
  });

  it('login() without a user in the answer leaves nobody signed in', async () => {
    const done = service.login({ email: 'a@b.c', password: 'pw' });
    http.expectOne('/api/v1/auth/login').flush({ authenticated: true });
    await done;

    expect(service.user()).toBeNull();
  });

  it('logout() ends the session and goes to the login', async () => {
    const login = service.login({ email: 'a@b.c', password: 'pw' });
    http.expectOne('/api/v1/auth/login').flush({ authenticated: true, user: LUIS });
    await login;

    const done = service.logout();
    http.expectOne('/api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await done;

    expect(service.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('logout() forgets the person even when the BFF fails', async () => {
    const done = service.logout();
    http.expectOne('/api/v1/auth/logout').flush({}, { status: 500, statusText: 'Error' });

    await expectAsync(done).toBeRejected();
    expect(service.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('expire() forgets the person and goes to the login', async () => {
    await service.expire();

    expect(service.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('register, verifyEmail and resendVerification post to the BFF', async () => {
    const data = { alias: 'maria', email: 'm@x.co', password: 'S3cret!pass', person: { firstName: 'María' } };

    const registered = service.register(data);
    const register = http.expectOne('/api/v1/auth/register');
    expect(register.request.body).toEqual(data);
    register.flush({});
    await registered;

    const verified = service.verifyEmail('maria', '123456');
    const verify = http.expectOne('/api/v1/auth/verify-email');
    expect(verify.request.body).toEqual({ alias: 'maria', code: '123456' });
    verify.flush({});
    await verified;

    const resent = service.resendVerification('maria', 'es');
    const resend = http.expectOne('/api/v1/auth/resend-verification');
    expect(resend.request.body).toEqual({ alias: 'maria', language: 'es' });
    resend.flush({});
    await resent;
  });
});
