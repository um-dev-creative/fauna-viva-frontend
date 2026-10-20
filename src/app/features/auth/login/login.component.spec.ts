import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { provideTestTranslate } from '../../../../testing/translate';
import { LoginComponent, loginErrorFor } from './login.component';

describe('LoginComponent', () => {
  let login: jasmine.Spy;
  let navigate: jasmine.Spy;

  const setup = () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const type = async (name: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(`input[type=${name}]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const submit = async () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, el, type, submit };
  };

  beforeEach(() => {
    login = jasmine.createSpy('login').and.resolveTo();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideTestTranslate(), { provide: AuthService, useValue: { login } }],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  });

  it('signs in with what was typed and goes to the start', async () => {
    const { type, submit } = setup();
    await type('email', 'a@b.c');
    await type('password', 'pw');

    await submit();

    expect(login).toHaveBeenCalledWith({ email: 'a@b.c', password: 'pw' });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('asks for both fields and does not call the service when one is missing', async () => {
    const { el, type, submit } = setup();
    await type('email', 'a@b.c');

    await submit();

    expect(login).not.toHaveBeenCalled();
    expect(el.querySelector('[role=alert]')!.textContent).toContain('Escribe tu correo');
  });

  it('says "incorrect" for a 401 and clears the password', async () => {
    login.and.rejectWith(new HttpErrorResponse({ status: 401 }));
    const { el, type, submit } = setup();
    await type('email', 'a@b.c');
    await type('password', 'bad');

    await submit();

    expect(el.querySelector('[role=alert]')!.textContent).toContain('incorrectos');
    expect(el.querySelector<HTMLInputElement>('input[type=password]')!.value).toBe('');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignores a second submit while one is in flight', async () => {
    let release!: () => void;
    login.and.returnValue(new Promise<void>((r) => (release = r)));
    const { fixture, type, submit } = setup();
    await type('email', 'a@b.c');
    await type('password', 'pw');

    const first = submit();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    release();
    await first;

    expect(login).toHaveBeenCalledTimes(1);
  });

  it('links to the sign-up screen', () => {
    const { el } = setup();

    expect(el.querySelector('a')!.getAttribute('href')).toBe('/registro');
  });

  it('maps each answer to a message', () => {
    const http = (status: number) => new HttpErrorResponse({ status });

    expect(loginErrorFor(http(401))).toBe('invalid');
    expect(loginErrorFor(http(400))).toBe('invalid');
    expect(loginErrorFor(http(429))).toBe('tooMany');
    expect(loginErrorFor(http(502))).toBe('unavailable');
    expect(loginErrorFor(new Error('network'))).toBe('unavailable');
  });
});
