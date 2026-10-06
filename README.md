# Carom

Carom is a top-down browser paddle duel built on a custom TypeScript canvas
runtime. Two paddles trade a fast ball across a dark field, with spin from paddle
motion bending each rally and two center obstacles turning clean shots into bank
shots.

## Install

```sh
npm ci
```

## Development

```sh
npm run dev
```

Open the Vite URL in a browser. The game runs entirely client-side and fetches
nothing at runtime.

## Production Build

```sh
npm run build
```

The static site is emitted to `dist/`, with `dist/index.html` as the entry point.

## Controls

- `W` / `S`: move player one's paddle.
- `ArrowUp` / `ArrowDown`: move player two in Versus, or player one in Solo.
- `Enter` or `Space`: confirm menu items.
- `P` or `Escape`: pause and resume a match.
- `Escape`: go back from menus that support it.
- `M`: mute or unmute sound.
- Backquote: toggle the diagnostics overlay.

Solo puts player one on the left against an AI paddle on the right. Versus is two
local players sharing the keyboard.
