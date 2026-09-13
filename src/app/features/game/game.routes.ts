import { Routes } from '@angular/router';
export default [
  { path: '', title: 'Clickomania · Clixie', loadComponent: () => import('./pages/game-page') },
] satisfies Routes;
