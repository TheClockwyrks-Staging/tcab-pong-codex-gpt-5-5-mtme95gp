# Carom

## Overview

Carom is a top-down paddle duel for the browser. Two paddles face each other
across a dark field while a ball ricochets between them, off the top and bottom
walls, and off a pair of obstacles in the middle of the field. A player scores
when the ball passes the far edge behind their opponent's paddle.

Carom's defining mechanic is spin: the motion of a paddle at the moment it
strikes a ball curves that ball's flight afterward. The obstacles turn the open
field into a bank-shot puzzle.

Carom has its own name, look, spin mechanic, and obstacle layout, and its assets,
branding, and design are original to it.

The specification spans several files under `specs/`. Read all of them and build
the game they describe as one cohesive whole.

## The runtime

This game stands on no engine, so the runtime under it is yours to write: the
frame loop and the delta time it measures, the canvas fit, input, audio cues,
and the debug overlay. Where this specification speaks of the runtime it means
that layer, and it states only what Carom needs from it. How the layer is
structured is yours to decide.

## The project you build in

The project at the root of this repository is already wired up, and its
`README.md` describes it. It is a TypeScript project built with Vite, tested with
Vitest, linted with ESLint, and formatted with Prettier. That toolchain is fixed
and supplied.

### What you implement

Everything under `src/`. The directory does not exist yet.

`index.html` loads `/src/main.ts` as its entry point, so that module is where
your build starts. Beyond that the structure is yours: the frame loop and the
canvas fit, input, audio, the diagnostics overlay, the debug and automation
surface, the figures this specification fixes, and the game itself.

### What stays as it is

- `index.html`, the page and the canvas the field is fitted into.
- The configuration: `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`,
  `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, and `.gitignore`.

`package.json` takes one kind of change: a dependency you genuinely need, added
along with the updated `package-lock.json`. Its existing entries and scripts stay
as they are.

### Every figure comes from this specification

Every number, key binding, cue name, and piece of screen copy this specification
fixes is stated here under a name, and the value stated here is authoritative.
Anything this specification does not name is yours to decide.

### Your own tests

Write unit tests for what you build, beside your sources as `src/**/*.test.ts`.
`npm test` runs them in process with Vitest, in Node, with coverage measured over
`src/`. A test drives the game over its own clock for a counted number of frames,
so it needs no browser, and `@napi-rs/canvas` is installed for a test that wants
a real 2D context.

### The checks the repository passes

Four commands run over the finished repository before it is reviewed:

| Command | Checks |
| --- | --- |
| `npx tsc --noEmit` | The code type-checks. A repository that does not compile is not reviewed. |
| `npx eslint .` | The code is lint-clean. |
| `npx prettier --check .` | The code is formatted. |
| `npx vitest run --coverage` | Your tests pass, with their count and coverage reported. |

They run on the repository as you leave it. `npm run typecheck`, `npm run lint`,
`npm run format`, and `npm test` run the same four locally.

### The build interface

`npm ci` followed by `npm run build` produces the complete static site into
`dist/` at the repository root, with an `index.html` at the root of that
directory as the entry point. That directory runs correctly when served as-is at
the root of any static file server. The scripts that do this are already in
`package.json`.

## Goal of this build

Produce a complete, polished, playable game that runs entirely in a browser.
This is a substantial front-end build: real-time rendered graphics, a physics
loop, multiple game states and menus, an AI opponent, and a local two-player
mode. Aim for a game a person would enjoy playing.

### Hard requirements

- Write the runtime the game stands on: the frame loop and its delta time, the
  canvas fit, input handling, audio, and the debug overlay.
- Render real graphics on the canvas, drawn as shapes and text rather than as an
  ASCII or text-only rendering.
- Draw everything in code. The build ships no art or audio files and fetches
  nothing at runtime.
- Run in the browser with no backend. Everything needed to play is
  self-contained, and no API key or credential is needed to build, run, or play.
- Replace the starter `README.md` with one explaining what the game is, how to
  install dependencies, how to run it in development, how to produce the static
  production build, and the controls.
- Ship the showcase `specs/showcase.md` defines: the store-page description, the
  carousel manifest, and the media it names.

## Code quality

The code is fit for a long-lived codebase shared with human developers. The
type-check, lint, and format checks pass, and unit tests cover the simulation.

## Coordinate system and presentation

All positions, sizes, and speeds in this specification are given in the field's
own logical units on a fixed play area of `FIELD_W x FIELD_H` (`1280 x 720`,
16:9). The origin `(0, 0)` is the top-left; `x` increases to the right and `y`
increases downward. The field center is `(FIELD_CX, FIELD_CY)` (`640, 360`).

- `FIELD_W x FIELD_H` is the game's logical design size. Fitting it to the
  browser window is the runtime's: the uniform scale that preserves the aspect
  ratio, the letterboxed centering, and the device pixel ratio. The complete
  field is therefore on screen at every window size, on load and at any pixel
  density.
- The letterbox bars around the field are the field's background color.
- Draw in logical units, and take the canvas element's own size from the runtime
  alone.
- Gameplay logic operates in logical units, independent of the rendered scale.
- A pointer or touch position reaches the game in these same logical units, taken
  through that same fit, so a position the game reads and a region the game
  reports lie in one coordinate space.

Every rate in this specification is per second and every duration is in seconds,
integrated against the delta time the runtime hands each update.

## Visual design

The field is dark. The left paddle, the right paddle, the ball, and the
obstacles are each drawn as a solid body in a bright color that stands clearly
apart from the field background. The two paddles are clearly distinguishable from
each other by color, and the obstacles are distinguishable from both paddles. The
palette, type, glow, and every other aspect of the look are yours.

- A dashed center net is drawn at `x = NET_X` (`640`). It is decoration and has
  no collision.
- During a match the two scores are drawn near the top of the field, player one's
  at a position left of `FIELD_CX` and player two's at a position right of it,
  and a label naming the mode is drawn somewhere on the field. The label's copy
  is yours.
- The moving ball has a motion trail: behind the ball, draw its path over the
  last `TRAIL_TIME` (`0.13`) seconds of travel, from the samples the state
  records. Its length is therefore proportional to the ball's speed, and it
  curves where the flight curved. How the trail is styled is yours.
- Each screen draws the contents `specs/ui.md` states it shows.
