# Clicksteria

A colorful block-matching puzzle game built with Angular 22 and Tailwind CSS 4. English interface, responsive layout, SSR/prerendering, lazy routes, and no backend or external runtime services.

## Development

Use pnpm 11.19.0 (pinned in `package.json`) with Node.js 24. If using Corepack, enable it with `corepack enable pnpm`.

```sh
pnpm install --frozen-lockfile
pnpm start
pnpm test --watch=false
pnpm build
```

Open http://localhost:4200. Production output is in `dist/clicksteria`; `pnpm serve:ssr:clicksteria` runs the generated server. Tailwind is integrated through `.postcssrc.json` and `src/styles.css`.

## Architecture

```text
src/app/
  core/services/        Optional browser persistence (record storage)
  layout/               Application shell, navigation, route focus
  shared/ui/            Small reusable UI primitives
  features/
    game/
      domain/           Immutable models and pure TypeScript rules
      data-access/      Signal store: session, history, previews, record
      ui/               Board rendering/input and score/control panel
      pages/            Game page composition and browser initialization
      game.routes.ts    Lazy feature entry point
    rules/              Independently lazy-loaded rules page
    not-found/          Wildcard route
```

The dependency direction is UI → store → domain. The domain imports no Angular APIs and accepts an injectable random function for deterministic tests. The board takes inputs and emits intents; it does not mutate state or know about scoring/storage. The sidebar is presentational. `GameStore` is an application-scoped session, loaded with the game feature, so visiting rules and returning preserves the game and undo history. New features should register lazy entries in `app.routes.ts`; keep feature-specific services inside their feature, not in `core` or `shared`.

Components use OnPush, standalone defaults, signal inputs/outputs, and native control flow. TypeScript and Angular template strictness are enabled. Page layout and chrome use Tailwind; scoped CSS handles tile geometry, colors, focus, and falling animation.

## Game rules

- 10 columns × 15 rows, five colors; every initial board has at least one legal move.
- Click any orthogonally connected group of at least two matching tiles.
- Remaining tiles fall down; empty columns collapse left.
- A group of `n` tiles awards `n × (n − 1)` points. Clearing the board adds 1,000.
- No remaining groups ends the game; an empty board is a win.
- Undo restores the exact prior board and score, up to the start of the current game.
- Hint highlights the largest current group, with no penalty; it does not guarantee a solution.
- A new game asks for confirmation if moves have been made and the game is still active.

The record is the highest score reached, including before undo. Only the record persists in localStorage (`clicksteria:classic:best:v1`); a reload starts a fresh game. Storage failures gracefully fall back to an in-memory record. Random board creation and storage reads run in `afterNextRender`, avoiding server/client hydration differences.

## Accessibility and verification

Tiles have both colors and distinct shapes plus descriptive accessible names. Tab enters/leaves the board; arrow keys move between tiles; Enter/Space plays. The board uses one tab stop, restores focus after removal, and announces moves through a live region. Reduced-motion preferences disable tile transitions.

Unit coverage includes branching adjacency, diagonal exclusion, invalid moves, gravity, empty-column collapse, immutable snapshots, scoring, wins, blocked boards, seeded complete games, undo, hints, and session initialization.
