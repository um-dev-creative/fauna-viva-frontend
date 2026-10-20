import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { ClinicService } from './clinic.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let hasAnyRole: jasmine.Spy;
  const run = (roles?: string[]) =>
    TestBed.runInInjectionContext(() =>
      roleGuard({ data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  beforeEach(() => {
    hasAnyRole = jasmine.createSpy('hasAnyRole');
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: ClinicService, useValue: { hasAnyRole } }] });
  });

  it('lets through a role the section allows', () => {
    hasAnyRole.and.returnValue(true);

    expect(run(['ADMIN_CLINICA'])).toBeTrue();
    expect(hasAnyRole).toHaveBeenCalledWith(['ADMIN_CLINICA']);
  });

  it('sends anyone else to the start', () => {
    hasAnyRole.and.returnValue(false);

    expect(TestBed.inject(Router).serializeUrl(run(['ADMIN_CLINICA']) as UrlTree)).toBe('/');
  });

  it('a section that names no role is closed', () => {
    hasAnyRole.and.returnValue(false);

    run();

    expect(hasAnyRole).toHaveBeenCalledWith([]);
  });
});
