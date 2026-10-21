import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClinicService } from './clinic.service';
import { Role } from './models/clinic.model';

/** Refuses a section to a role that does not see it in the menu; the person lands on the start. */
export const roleGuard: CanActivateFn = (route) => {
  const allowed = (route.data['roles'] ?? []) as readonly Role[];
  return inject(ClinicService).hasAnyRole(allowed) ? true : inject(Router).createUrlTree(['/']);
};
