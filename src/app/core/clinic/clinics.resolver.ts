import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { ClinicService } from './clinic.service';

/** The shell opens with the person's clinics already known; a failure leaves the list empty and the shell says so. */
export const clinicsResolver: ResolveFn<boolean> = async () => {
  try {
    await inject(ClinicService).load();
    return true;
  } catch {
    return false;
  }
};
