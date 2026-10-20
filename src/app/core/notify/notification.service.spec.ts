import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  beforeEach(() => {
    jasmine.clock().install();
    service = TestBed.inject(NotificationService);
  });
  afterEach(() => jasmine.clock().uninstall());

  it('keeps a message until it is dismissed', () => {
    service.push('Hola');

    expect(service.notices().map((n) => n.text)).toEqual(['Hola']);
    service.dismiss(service.notices()[0].id);
    expect(service.notices()).toEqual([]);
  });

  it('a message goes away by itself after a while', () => {
    service.push('Hola');

    jasmine.clock().tick(8001);

    expect(service.notices()).toEqual([]);
  });

  it('the same message is not stacked twice', () => {
    service.push('Igual');
    service.push('Igual');
    service.push('Otro');

    expect(service.notices().map((n) => n.text)).toEqual(['Igual', 'Otro']);
  });
});
