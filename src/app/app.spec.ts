import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('creates the root component', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('hosts the router outlet where every screen is rendered', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
