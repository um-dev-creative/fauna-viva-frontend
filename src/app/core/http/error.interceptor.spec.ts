import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationService } from '../notify/notification.service';
import { provideTestTranslate } from '../../../testing/translate';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let notices: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(), provideTestTranslate()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    notices = TestBed.inject(NotificationService);
  });
  afterEach(() => controller.verify());

  const fail = (url: string, status: number, body: object = {}) => {
    let caught = 0;
    http.get(url).subscribe({ error: (e) => (caught = e.status) });
    controller.expectOne(url).flush(body, { status, statusText: 'x' });
    return caught;
  };
  const texts = () => notices.notices().map((n) => n.text);

  it('tells the person in plain words and still lets the screen see the error', () => {
    expect(fail('/api/v1/patients', 403)).toBe(403);
    expect(texts()).toEqual(['No tienes permiso para hacer esto en esta clínica.']);
  });

  it('says a record changed (412), too many requests (429) and a failing service (500)', () => {
    fail('/api/v1/a', 412);
    fail('/api/v1/b', 429);
    fail('/api/v1/c', 500);

    expect(texts()).toEqual([
      'Alguien más cambió este registro. Recarga para ver la versión actual.',
      'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
      'El servicio tuvo un problema. Inténtalo de nuevo en unos minutos.',
    ]);
  });

  it('shows the readable detail of a problem+json error instead of the generic text', () => {
    fail('/api/v1/patients', 403, { detail: 'Solo el veterinario tratante puede firmar.' });

    expect(texts()).toEqual(['Solo el veterinario tratante puede firmar.']);
  });

  it('is quiet about what the screen handles: validation errors and the session routes', () => {
    fail('/api/v1/patients', 422);
    fail('/api/v1/auth/login', 500);
    fail('/i18n/x.json', 500);

    expect(texts()).toEqual([]);
  });

  it('says there is no connection when the call never got an answer', () => {
    http.get('/api/v1/patients').subscribe({ error: () => undefined });
    controller.expectOne('/api/v1/patients').error(new ProgressEvent('error'));

    expect(texts()[0]).toContain('No hay conexión');
  });
});
