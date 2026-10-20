import { Role } from '../clinic/models/clinic.model';
import { NAV_ITEMS, visibleNav } from './nav.config';

const keys = (roles: Role[]) => visibleNav(roles).map((i) => i.key);

describe('navigation by role', () => {
  it('a guardian sees no staff sections', () => {
    const mine = keys(['APODERADO']);

    expect(mine).toEqual(['agenda', 'pacientes', 'examenes']);
    for (const staffOnly of ['personal', 'clinica', 'urgencias', 'historia']) expect(mine).not.toContain(staffOnly);
  });

  it('reception does not see the clinical record', () => {
    const mine = keys(['RECEPCION']);

    expect(mine).not.toContain('historia');
    expect(mine).not.toContain('examenes');
    expect(mine).toContain('agenda');
    expect(mine).toContain('urgencias');
  });

  it('a veterinarian sees the clinical sections but not the administration', () => {
    const mine = keys(['VETERINARIO']);

    expect(mine).toContain('historia');
    expect(mine).not.toContain('personal');
  });

  it('a clinic administrator sees everything but the guardian-only parts', () => {
    expect(keys(['ADMIN_CLINICA'])).toEqual(NAV_ITEMS.map((i) => i.key));
  });

  it('several roles add up and no role shows nothing', () => {
    expect(keys(['RECEPCION', 'VETERINARIO'])).toContain('historia');
    expect(keys([])).toEqual([]);
  });
});
