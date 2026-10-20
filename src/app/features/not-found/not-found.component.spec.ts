import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFoundComponent } from './not-found.component';
import { provideTestTranslate } from '../../../testing/translate';

describe('NotFoundComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]), provideTestTranslate()] }));

  it('says the page does not exist and links back to the start', () => {
    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('No encontrada');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/');
  });
});
