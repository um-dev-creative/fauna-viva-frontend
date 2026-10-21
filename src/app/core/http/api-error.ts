import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorMessage {
  /** Key under `errors.` in the translations, used when the API gave nothing readable of its own. */
  key: string;
  /** The `detail` of an RFC 9457 `problem+json` body: written for the person, so it wins over the generic text. */
  detail?: string;
}

/** What the person should be told about a failed call; `undefined` for statuses a screen handles itself. */
export function describeApiError(error: HttpErrorResponse): ApiErrorMessage | undefined {
  const body = error.error as { detail?: unknown } | null;
  const detail = typeof body?.detail === 'string' && body.detail.trim() !== '' ? body.detail : undefined;
  switch (true) {
    case error.status === 0:
      return { key: 'network' };
    case error.status === 403:
      return { key: 'forbidden', detail };
    case error.status === 412:
      return { key: 'stale', detail };
    case error.status === 429:
      return { key: 'tooMany', detail };
    case error.status >= 500:
      return { key: 'server', detail };
    default:
      return undefined;
  }
}
