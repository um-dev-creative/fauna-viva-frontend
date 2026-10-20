import { HttpErrorResponse } from '@angular/common/http';
import { describeApiError } from './api-error';

const fail = (status: number, error?: unknown) => new HttpErrorResponse({ status, error });

describe('describeApiError', () => {
  it('names the failures every screen would otherwise handle', () => {
    expect(describeApiError(fail(0))).toEqual({ key: 'network' });
    expect(describeApiError(fail(403))?.key).toBe('forbidden');
    expect(describeApiError(fail(412))?.key).toBe('stale');
    expect(describeApiError(fail(429))?.key).toBe('tooMany');
    expect(describeApiError(fail(500))?.key).toBe('server');
    expect(describeApiError(fail(503))?.key).toBe('server');
  });

  it('prefers the readable detail of a problem+json body', () => {
    expect(describeApiError(fail(403, { title: 'Forbidden', detail: 'No eres veterinario aquí.' }))).toEqual({
      key: 'forbidden',
      detail: 'No eres veterinario aquí.',
    });
  });

  it('ignores a detail that is blank or not text', () => {
    expect(describeApiError(fail(412, { detail: '  ' }))?.detail).toBeUndefined();
    expect(describeApiError(fail(412, { detail: 7 }))?.detail).toBeUndefined();
    expect(describeApiError(fail(412, 'plain text'))?.detail).toBeUndefined();
  });

  it('leaves to the screen what is the screen\'s: validation, not found, conflict, 401', () => {
    for (const status of [400, 401, 404, 409, 422]) expect(describeApiError(fail(status))).toBeUndefined();
  });
});
