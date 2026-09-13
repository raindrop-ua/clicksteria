import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'play' },
  { path: 'play', loadChildren: () => import('./features/game/game.routes') },
  {
    path: 'rules',
    title: 'Rules · Clixie',
    loadComponent: () => import('./features/rules/rules-page'),
  },
  {
    path: '**',
    title: 'Page not found · Clixie',
    loadComponent: () => import('./features/not-found/not-found-page'),
  },
];
