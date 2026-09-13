import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'play' },
  { path: 'play', loadChildren: () => import('./features/game/game.routes') },
  {
    path: 'rules',
    title: 'Rules · Clicksteria',
    loadComponent: () => import('./features/rules/rules-page'),
  },
  {
    path: '**',
    title: 'Page not found · Clicksteria',
    loadComponent: () => import('./features/not-found/not-found-page'),
  },
];
