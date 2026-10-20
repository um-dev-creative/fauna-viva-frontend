import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { appConfig } from './app.config';

describe('appConfig', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting()] }));

  it('provides the HTTP client and the router', () => {
    expect(TestBed.inject(HttpClient)).toBeTruthy();
    expect(TestBed.inject(Router).config.length).toBeGreaterThan(0);
  });

  it('starts in Venezuelan Spanish, with Spanish as the fallback', () => {
    const translate = TestBed.inject(TranslateService);

    expect(translate.getCurrentLang()).toBe('es-VE');
    expect(translate.getFallbackLang()).toBe('es-VE');
  });

  it('asks the BFF who is signed in before the first screen, marking the call for CSRF', async () => {
    const ready = TestBed.inject(ApplicationInitStatus).donePromise;

    const req = TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/me');
    expect(req.request.headers.get('x-fv-csrf')).toBe('1');
    req.flush({ authenticated: false });

    await ready;
  });
});
