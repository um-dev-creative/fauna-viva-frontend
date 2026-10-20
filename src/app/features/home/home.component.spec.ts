import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { HomeComponent } from './home.component';
import { provideTestTranslate } from '../../../testing/translate';

describe('HomeComponent', () => {
  const user = signal<{ id: string; username: string; firstname?: string } | null>({ id: 'u', username: 'luis', firstname: 'Luis' });
  const logout = jasmine.createSpy('logout').and.resolveTo();

  beforeEach(() => {
    logout.calls.reset();
    TestBed.configureTestingModule({
      providers: [provideTestTranslate(), { provide: AuthService, useValue: { user, logout } }],
    });
  });

  it('shows the translated title, subtitle and status', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Fauna Viva');
    expect(text).toContain('Bienvenido');
    expect(text).toContain('Subtítulo');
    expect(text).toContain('En construcción');
  });

  it('greets the person by first name, or by username when there is none', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hola, Luis');

    user.set({ id: 'u', username: 'luis' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hola, luis');

    user.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hola,');
  });

  it('signs out from the button', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();

    expect(logout).toHaveBeenCalled();
  });
});
