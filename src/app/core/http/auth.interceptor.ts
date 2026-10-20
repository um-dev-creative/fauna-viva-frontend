import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '../auth/auth.service';

/** CSRF header every call to the BFF's `/api` carries (the BFF refuses a state-changing call without it). */
export const CSRF_HEADER = 'x-fv-csrf';

// A 401 from these is an answer, not an expired session: wrong password, or "nobody is signed in".
const ANSWERS_401 = [`${environment.apiBaseUrl}/auth/login`, `${environment.apiBaseUrl}/auth/me`];

/**
 * Marks every call to the BFF with the CSRF header and, when the BFF says the session is over (401 on any other call),
 * forgets the person and sends them to the login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);
  const auth = inject(AuthService);
  return next(req.clone({ setHeaders: { [CSRF_HEADER]: '1' } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !ANSWERS_401.includes(req.url)) {
        void auth.expire();
      }
      return throwError(() => error);
    }),
  );
};
