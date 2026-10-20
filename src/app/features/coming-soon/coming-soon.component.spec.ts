import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideTestTranslate } from '../../../testing/translate';
import { ComingSoonComponent } from './coming-soon.component';

describe('ComingSoonComponent', () => {
  const create = (data: Record<string, unknown>) => {
    TestBed.configureTestingModule({
      providers: [provideTestTranslate(), { provide: ActivatedRoute, useValue: { snapshot: { data } } }],
    });
    const fixture = TestBed.createComponent(ComingSoonComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('names the section and says it is under construction', () => {
    const el = create({ section: 'agenda' });

    expect(el.querySelector('h1')!.textContent).toContain('Agenda');
    expect(el.textContent).toContain('en construcción');
  });

  it('copes with a route that gives no section', () => {
    expect(create({}).querySelector('h1')).not.toBeNull();
  });
});
