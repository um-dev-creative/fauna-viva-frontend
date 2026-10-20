import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { provideTestTranslate } from '../testing/translate';
import { HomeComponent } from './features/home/home.component';
import { NotFoundComponent } from './features/not-found/not-found.component';

describe('routes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes), provideTestTranslate()] }));

  it('shows the home screen at the root', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/');

    expect(component).toBeInstanceOf(HomeComponent);
  });

  it('shows the not-found screen for any unknown path', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/no-existe');

    expect(component).toBeInstanceOf(NotFoundComponent);
    expect(TestBed.inject(Router).url).toBe('/no-existe');
  });
});
