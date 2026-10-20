/** What a person can be in a clinic (the MVP roles; a guardian is not staff). */
export type Role = 'VETERINARIO' | 'TECNICO' | 'RECEPCION' | 'ADMIN_CLINICA' | 'APODERADO';

export interface Site {
  id: string;
  nombre: string;
}

/** One clinic the person belongs to, with the roles they hold there: `GET /api/v1/me/clinicas`. */
export interface Clinic {
  id: string;
  nombre: string;
  roles: Role[];
  sedes: Site[];
}
