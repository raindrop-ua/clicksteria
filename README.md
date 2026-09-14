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

Installing dependencies also activates the Husky pre-commit hook. It runs ESLint and Prettier only on staged files, keeping commits fast while preventing new lint and formatting issues.

## Architecture

```text
src/
  main.ts               Browser bootstrap
  main.server.ts        Angular server bootstrap
  server.ts             Express SSR server entry point
  app/
    app.routes.ts       Top-level lazy routes and route SEO data
    app.routes.server.ts
                        Prerender policy for every route
    core/
      audio/            Sound preference and lazy Web Audio playback
      services/         SEO metadata and record persistence
      theme/            System/light/dark preference and browser sync
    layout/             Persistent shell, navigation, route focus
    shared/ui/          Reusable icons and preference controls
    features/
      game/
        domain/         Immutable models and pure TypeScript rules
        data-access/    Signal store: session, history, preview, record
        ui/             Accessible board and presentational sidebar
        pages/          Feature composition and browser initialization
        game.routes.ts  Lazy game route and SEO metadata
      rules/            Lazy rules page
      not-found/        Lazy wildcard page
```

The router lazy-loads the game route collection and the standalone rules and not-found pages. `AppShell` stays mounted around them, owns global navigation and focus restoration, and starts route-driven SEO updates. Angular prerenders all routes on the server, then hydrates them in the browser.

Inside the game feature, dependencies flow from page/UI → `GameStore` → domain engine. The domain imports no Angular APIs, keeps board transformations immutable, and accepts an injectable random function for deterministic tests. The board receives state and emits user intents; it does not own scoring, history, persistence, or sound. The sidebar is presentational.

`GameStore` is a root singleton, so the current session and undo history survive navigation between Play and Rules. It coordinates domain operations with the app-wide record and sound services, while browser-only initialization stays in `afterNextRender` to avoid SSR and hydration mismatches. Theme, sound, and record preferences degrade to in-memory behavior when browser storage is unavailable.

New routes belong in `app.routes.ts` and should be lazy by default. Keep game-specific state and behavior under `features/game`; put truly app-wide browser concerns in `core`; keep `shared/ui` limited to reusable presentational controls.

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

## Appearance

The header offers System, Light, and Dark modes. System is the default and follows OS changes without saving an override. Choosing Light or Dark persists `clicksteria.theme`; choosing System removes it. Preferences synchronize between tabs, and blocked storage falls back to an in-memory choice.

`src/index.html` applies the preference before first paint. Keep its storage key and theme-color values synchronized with `core/theme/theme.service.ts`. The service initializes browser listeners after hydration and releases them on destruction. `shared/ui/theme-switcher` owns the controls; `src/styles.css` owns the `light-dark()` semantic palette. Game tiles retain their colors in both themes.

## Sound

Block clicks (mouse, touch, or keyboard) play a short, quiet synthesized pop. The speaker button toggles game sounds; the preference is stored as `true` or `false` under `clicksteria.sound` and synchronizes across tabs. Sound is on by default.

`core/audio/sound.service.ts` owns the preference, storage, lazy Web Audio context, playback, and cleanup. The toggle only displays state and calls the service; `GameStore.play()` triggers the effect. Muting stops the current sound and cancels pending playback. Missing or blocked audio/storage never interrupts the game, and no audio is initialized during SSR or page load.
