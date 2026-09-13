import { Routes } from '@angular/router';
import type { SeoData } from '../../core/services/seo.service';

export default [
  {
    path: '',
    title: 'Clicksteria — Free Block-Matching Puzzle Game',
    data: {
      seo: {
        description:
          'Play Clicksteria, a free and relaxing block-matching puzzle. Match colorful groups, clear the board, and beat your best score. No timer. No rush.',
        socialDescription:
          'Match colorful blocks, clear the board, and beat your best score. No timer. No rush.',
        canonicalPath: '/play',
      } satisfies SeoData,
    },
    loadComponent: () => import('./pages/game-page'),
  },
] satisfies Routes;
