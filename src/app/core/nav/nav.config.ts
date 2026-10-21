import { Role } from '../clinic/models/clinic.model';

export interface NavItem {
  /** Last segment of the path and key of the label (`nav.<key>`). */
  key: string;
  roles: readonly Role[];
}

const STAFF: readonly Role[] = ['VETERINARIO', 'TECNICO', 'RECEPCION', 'ADMIN_CLINICA'];
const CLINICAL: readonly Role[] = ['VETERINARIO', 'TECNICO', 'ADMIN_CLINICA'];

/**
 * The portal's sections and who sees each one. The menu and the route guards both read this list, so what is hidden is
 * also refused. The screens arrive with their own tasks; until then a section shows "coming soon".
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'agenda', roles: [...STAFF, 'APODERADO'] },
  { key: 'pacientes', roles: [...STAFF, 'APODERADO'] },
  { key: 'urgencias', roles: ['VETERINARIO', 'TECNICO', 'RECEPCION', 'ADMIN_CLINICA'] },
  { key: 'historia', roles: CLINICAL },
  { key: 'examenes', roles: [...CLINICAL, 'APODERADO'] },
  { key: 'personal', roles: ['ADMIN_CLINICA'] },
  { key: 'clinica', roles: ['ADMIN_CLINICA'] },
];

export const visibleNav = (roles: readonly Role[]): NavItem[] =>
  NAV_ITEMS.filter((item) => item.roles.some((role) => roles.includes(role)));
