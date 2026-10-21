import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ClinicService } from '../../core/clinic/clinic.service';
import { HomeComponent } from './home.component';
import { provideTestTranslate } from '../../../testing/translate';

describe('HomeComponent', () => {
  const active = signal<{ nombre: string } | null>({ nombre: 'Clínica Centro' });

  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideTestTranslate(), { provide: ClinicService, useValue: { active } }] }),
  );

  it('shows the clinic, the translated title, subtitle and status', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Clínica Centro');
    expect(text).toContain('Bienvenido');
    expect(text).toContain('Subtítulo');
    expect(text).toContain('En construcción');
  });
});
