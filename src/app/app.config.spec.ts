import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { appConfig } from './app.config';

describe('appConfig', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: appConfig.providers }));

  it('provides the HTTP client and the router', () => {
    expect(TestBed.inject(HttpClient)).toBeTruthy();
    expect(TestBed.inject(Router).config.length).toBeGreaterThan(0);
  });

  it('starts in Venezuelan Spanish, with Spanish as the fallback', () => {
    const translate = TestBed.inject(TranslateService);

    expect(translate.getCurrentLang()).toBe('es-VE');
    expect(translate.getFallbackLang()).toBe('es-VE');
  });
});
