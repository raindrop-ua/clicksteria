import { Routes } from '@angular/router';
import type { SeoData } from './core/services/seo.service';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'play' },
  { path: 'play', loadChildren: () => import('./features/game/game.routes') },
  {
    path: 'rules',
    title: 'How to Play Clicksteria — Rules & Scoring',
    data: {
      seo: {
        description:
          'Learn how to play Clicksteria: match groups of colorful blocks, create space, plan your moves, and score more points by clearing larger groups.',
        socialDescription:
          'Learn the rules, plan better moves, and score more points in Clicksteria.',
        canonicalPath: '/rules',
      } satisfies SeoData,
    },
    loadComponent: () => import('./features/rules/rules-page'),
  },
  {
    path: '**',
    title: 'Page not found · Clicksteria',
    data: {
      seo: {
        description: 'This Clicksteria page does not exist. Return to the game and keep matching.',
        robots: 'noindex, nofollow',
      } satisfies SeoData,
    },
    loadComponent: () => import('./features/not-found/not-found-page'),
  },
];
