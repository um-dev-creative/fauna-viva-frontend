import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { provideTestTranslate } from '../../../../testing/translate';
import { RegisterComponent, registerErrorFor } from './register.component';

describe('RegisterComponent', () => {
  let auth: { register: jasmine.Spy; verifyEmail: jasmine.Spy; resendVerification: jasmine.Spy };

  const setup = () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const settle = async () => {
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const fill = (values: string[]) => {
      el.querySelectorAll<HTMLInputElement>('input').forEach((input, i) => {
        input.value = values[i];
        input.dispatchEvent(new Event('input'));
      });
    };
    const submit = async () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      await settle();
    };
    const buttons = () => Array.from(el.querySelectorAll('button'));
    return { fixture, el, fill, submit, settle, buttons };
  };
  const VALID = ['María', 'Pérez', 'maria.p', 'm@x.co', 'S3cret!pass'];

  beforeEach(() => {
    auth = {
      register: jasmine.createSpy('register').and.resolveTo({}),
      verifyEmail: jasmine.createSpy('verifyEmail').and.resolveTo({}),
      resendVerification: jasmine.createSpy('resendVerification').and.resolveTo({}),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideTestTranslate(), { provide: AuthService, useValue: auth }],
    });
  });

  it('registers the guardian, then asks for the code', async () => {
    const { el, fill, submit } = setup();
    fill(VALID);

    await submit();

    expect(auth.register).toHaveBeenCalledWith({
      alias: 'maria.p',
      email: 'm@x.co',
      password: 'S3cret!pass',
      displayName: 'María Pérez',
      language: 'es',
      person: { firstName: 'María', lastName: 'Pérez' },
    });
    expect(el.textContent).toContain('código de 6 dígitos');
  });

  it('does not call the API with incomplete data', async () => {
    const { el, fill, submit } = setup();
    fill(['María', '', 'ab', 'bad', 'short']);

    await submit();

    expect(auth.register).not.toHaveBeenCalled();
    expect(el.querySelector('[role=alert]')!.textContent).toContain('Completa todos');
  });

  it('says so when the account already exists', async () => {
    auth.register.and.rejectWith(new HttpErrorResponse({ status: 409 }));
    const { el, fill, submit } = setup();
    fill(VALID);

    await submit();

    expect(el.querySelector('[role=alert]')!.textContent).toContain('Ya existe una cuenta');
  });

  describe('confirming the e-mail', () => {
    const toCodeStep = async () => {
      const s = setup();
      s.fill(VALID);
      await s.submit();
      return s;
    };

    it('confirms with a six-digit code and offers the login', async () => {
      const { el, fill, submit } = await toCodeStep();
      fill(['123456']);

      await submit();

      expect(auth.verifyEmail).toHaveBeenCalledWith('maria.p', '123456');
      expect(el.textContent).toContain('quedó confirmado');
      expect(el.querySelector('a')!.getAttribute('href')).toBe('/login');
    });

    it('refuses a code that is not six digits without calling the API', async () => {
      const { el, fill, submit } = await toCodeStep();
      fill(['12']);

      await submit();

      expect(auth.verifyEmail).not.toHaveBeenCalled();
      expect(el.querySelector('[role=alert]')!.textContent).toContain('código no es válido');
    });

    it('a code the API rejects (400/422) is a bad code; anything else is a service problem', async () => {
      const { el, fill, submit } = await toCodeStep();
      fill(['123456']);
      auth.verifyEmail.and.rejectWith(new HttpErrorResponse({ status: 422 }));
      await submit();
      expect(el.querySelector('[role=alert]')!.textContent).toContain('código no es válido');

      auth.verifyEmail.and.rejectWith(new HttpErrorResponse({ status: 503 }));
      await submit();
      expect(el.querySelector('[role=alert]')!.textContent).toContain('No pudimos completar');
    });

    it('sends another code on request and says so', async () => {
      const { el, buttons, settle } = await toCodeStep();

      buttons()[1].click();
      await settle();

      expect(auth.resendVerification).toHaveBeenCalledWith('maria.p', 'es');
      expect(el.querySelector('[role=status]')!.textContent).toContain('código nuevo');
    });

    it('uses the current language when sending the code', async () => {
      TestBed.inject(TranslateService).use('es-VE');
      const { buttons, settle } = await toCodeStep();

      buttons()[1].click();
      await settle();

      expect(auth.resendVerification.calls.mostRecent().args[1]).toBe('es');
    });
  });

  it('maps each answer to a message', () => {
    const http = (status: number) => new HttpErrorResponse({ status });

    expect(registerErrorFor(http(409))).toBe('exists');
    expect(registerErrorFor(http(400))).toBe('invalid');
    expect(registerErrorFor(http(422))).toBe('invalid');
    expect(registerErrorFor(http(429))).toBe('tooMany');
    expect(registerErrorFor(http(503))).toBe('unavailable');
    expect(registerErrorFor(new Error('network'))).toBe('unavailable');
  });
});
