import { TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { provideTestTranslate } from '../../../testing/translate';

describe('HomeComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestTranslate()] }));

  it('shows the translated title, subtitle and status', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Fauna Viva');
    expect(text).toContain('Bienvenido');
    expect(text).toContain('Subtítulo');
    expect(text).toContain('En construcción');
  });
});
