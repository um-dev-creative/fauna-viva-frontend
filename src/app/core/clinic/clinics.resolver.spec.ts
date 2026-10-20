import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ClinicService } from './clinic.service';
import { clinicsResolver } from './clinics.resolver';

describe('clinicsResolver', () => {
  const run = () =>
    TestBed.runInInjectionContext(() => clinicsResolver({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)) as Promise<boolean>;

  it('loads the clinics and says so', async () => {
    const load = jasmine.createSpy('load').and.resolveTo();
    TestBed.configureTestingModule({ providers: [{ provide: ClinicService, useValue: { load } }] });

    expect(await run()).toBeTrue();
    expect(load).toHaveBeenCalled();
  });

  it('a failure does not stop the shell from opening', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ClinicService, useValue: { load: () => Promise.reject(new Error('down')) } }],
    });

    expect(await run()).toBeFalse();
  });
});
