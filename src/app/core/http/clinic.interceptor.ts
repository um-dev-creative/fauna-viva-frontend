import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env/environment';
import { ClinicService } from '../clinic/clinic.service';

export const CLINIC_HEADER = 'X-Clinic-Id';

// The session and the list of clinics are asked before there is a clinic to name.
const WITHOUT_CLINIC = [`${environment.apiBaseUrl}/auth/`, `${environment.apiBaseUrl}/me/clinicas`];

/** Tells the API which clinic the person is working in (it checks their membership and role there). */
export const clinicInterceptor: HttpInterceptorFn = (req, next) => {
  const clinic = inject(ClinicService).active();
  if (!clinic || !req.url.startsWith(environment.apiBaseUrl) || WITHOUT_CLINIC.some((p) => req.url.startsWith(p))) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { [CLINIC_HEADER]: clinic.id } }));
};
