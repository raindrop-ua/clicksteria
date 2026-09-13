import { Routes } from '@angular/router';
export default [
  { path: '', title: 'Clicksteria', loadComponent: () => import('./pages/game-page') },
] satisfies Routes;
