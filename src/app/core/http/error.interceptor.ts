import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { NotificationService } from '../notify/notification.service';
import { describeApiError } from './api-error';

/**
 * Tells the person, in plain words, about the failures every screen would otherwise have to handle: no access (403), a record
 * somebody else changed (412), too many requests (429), the service failing or being unreachable. The error still reaches the
 * caller. The session routes are left to their own screens, and a 401 is the auth interceptor's.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl) || req.url.startsWith(`${environment.apiBaseUrl}/auth/`)) return next(req);
  const notices = inject(NotificationService);
  const translate = inject(TranslateService);
  return next(req).pipe(
    catchError((error: unknown) => {
      const message = error instanceof HttpErrorResponse ? describeApiError(error) : undefined;
      if (message) notices.push(message.detail ?? translate.instant(`errors.${message.key}`));
      return throwError(() => error);
    }),
  );
};
