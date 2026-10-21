import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { clinicsResolver } from './core/clinic/clinics.resolver';
import { roleGuard } from './core/clinic/role.guard';
import { NAV_ITEMS } from './core/nav/nav.config';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    // everything a signed-in person sees lives in the shell: menu by role, clinic selector, messages
    path: '',
    canActivate: [authGuard],
    resolve: { clinics: clinicsResolver },
    loadComponent: () => import('./features/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      // one route per section of the menu; each task swaps `loadComponent` for its real screen
      ...NAV_ITEMS.map((item) => ({
        path: item.key,
        canActivate: [roleGuard],
        data: { roles: item.roles, section: item.key },
        loadComponent: () =>
          import('./features/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
      })),
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
