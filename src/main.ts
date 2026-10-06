import { AudioSystem } from "./audio";
import { Renderer } from "./renderer";
import { CaromGame, makeInput } from "./simulation";
import type { Action, ActionInput, Mode, Screen, Side } from "./types";

const KEY_ACTIONS: Record<string, Action[]> = {
  KeyW: ["p1-up"],
  KeyS: ["p1-down"],
  ArrowUp: ["p2-up"],
  ArrowDown: ["p2-down"],
  Enter: ["confirm"],
  Space: ["confirm"],
  Escape: ["back", "pause"],
  KeyP: ["pause"],
  KeyM: ["mute"],
};

declare global {
  interface Window {
    __carom: ReturnType<typeof makeDebugSurface>;
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage");
if (!canvas) {
  throw new Error("Missing #stage canvas");
}
const context = canvas.getContext("2d");
if (!context) {
  throw new Error("2D canvas is unavailable");
}

const game = new CaromGame(false);
const renderer = new Renderer(canvas, context, game);
const audio = new AudioSystem();
const held = new Set<Action>();
const pressed = new Set<Action>();
let pointerInput: NonNullable<ActionInput["pointer"]> = {};
let touchInput: NonNullable<ActionInput["touch"]> = {};
let debugVisible = false;
let lastTime = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  if (game.autoStep) {
    step(dt);
  } else {
    renderer.render(debugLines());
    clearEdges();
  }
  requestAnimationFrame(frame);
}

function step(dt: number): void {
  const result = game.update(dt, {
    held: new Set(held),
    pressed: new Set(pressed),
    pointer: pointerInput,
    touch: touchInput,
  });
  for (const cue of result.cues) {
    audio.play(cue, game.state.muted);
  }
  renderer.render(debugLines());
  clearEdges();
}

function clearEdges(): void {
  pressed.clear();
  pointerInput = {};
  touchInput = {};
}

function debugLines(): string[] {
  if (!debugVisible) {
    return [];
  }
  const snap = game.snapshot();
  const ball = snap.ball;
  return [
    `screen ${snap.screen} | mode ${snap.mode} | score ${snap.score.p1}-${snap.score.p2}`,
    ball
      ? `ball ${ball.x.toFixed(1)},${ball.y.toFixed(1)} v ${ball.vx.toFixed(1)},${ball.vy.toFixed(1)} s ${ball.speed.toFixed(1)} spin ${ball.spin.toFixed(1)}`
      : "ball absent",
    `left cy ${snap.paddles.left.cy.toFixed(1)} vy ${snap.paddles.left.vy.toFixed(1)}`,
    `right cy ${snap.paddles.right.cy.toFixed(1)} vy ${snap.paddles.right.vy.toFixed(1)}`,
  ];
}

function actionsFor(code: string): Action[] {
  return KEY_ACTIONS[code] ?? [];
}

window.addEventListener("keydown", (event) => {
  audio.arm();
  if (event.code === "Backquote") {
    debugVisible = !debugVisible;
    event.preventDefault();
    return;
  }
  for (const action of actionsFor(event.code)) {
    if (!held.has(action)) {
      pressed.add(action);
    }
    held.add(action);
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  for (const action of actionsFor(event.code)) {
    held.delete(action);
    event.preventDefault();
  }
});

canvas.addEventListener("pointermove", (event) => {
  pointerInput.move = renderer.clientToField(event.clientX, event.clientY);
});
canvas.addEventListener("pointerdown", (event) => {
  audio.arm();
  canvas.setPointerCapture(event.pointerId);
  pointerInput.down = renderer.clientToField(event.clientX, event.clientY);
});
canvas.addEventListener("pointerup", (event) => {
  pointerInput.up = renderer.clientToField(event.clientX, event.clientY);
});
canvas.addEventListener(
  "touchstart",
  (event) => {
    audio.arm();
    const touch = event.changedTouches.item(0);
    if (touch)
      touchInput.start = renderer.clientToField(touch.clientX, touch.clientY);
    event.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener(
  "touchmove",
  (event) => {
    const touch = event.changedTouches.item(0);
    if (touch)
      touchInput.move = renderer.clientToField(touch.clientX, touch.clientY);
    event.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener(
  "touchend",
  (event) => {
    const touch = event.changedTouches.item(0);
    if (touch)
      touchInput.end = renderer.clientToField(touch.clientX, touch.clientY);
    event.preventDefault();
  },
  { passive: false },
);

function makeDebugSurface() {
  return {
    version: 1,
    setAutoStep(enabled: boolean) {
      game.autoStep = enabled;
    },
    advance(seconds: number, frames = 1) {
      const count = Math.max(1, Math.floor(frames));
      const dt = seconds / count;
      for (let i = 0; i < count; i += 1) {
        step(dt);
      }
    },
    clearWorld: () => game.clearWorld(),
    spawnBall: () => game.spawnBall(),
    spawnObstacle: (index: number) => game.spawnObstacle(index),
    reset: () => game.reset(),
    reconcile: () => game.reconcile(),
    setScreen: (screen: Screen) => game.setScreen(screen),
    setMode: (mode: Mode) => game.setMode(mode),
    setMenuIndex: (index: number) => game.setMenuIndex(index),
    setTitleIndex: (index: number) => game.setTitleIndex(index),
    setResumeScreen: (screen: "countdown" | "playing") =>
      game.setResumeScreen(screen),
    setScore: (p1: number, p2: number) => game.setScore(p1, p2),
    setWinner: (side: Side | null) => game.setWinner(side),
    setReceiver: (side: Side) => game.setReceiver(side),
    setPaddleCy: (side: Side, cy: number) => game.setPaddleCy(side, cy),
    setPaddleVy: (side: Side, vy: number) => game.setPaddleVy(side, vy),
    setPaddleDriven: (side: Side, driven: boolean) =>
      game.setPaddleDriven(side, driven),
    setBallPosition: (x: number, y: number) => game.setBallPosition(x, y),
    setBallVelocity: (vx: number, vy: number) => game.setBallVelocity(vx, vy),
    setBallSpin: (spin: number) => game.setBallSpin(spin),
    setBallHeld: (heldBall: boolean) => game.setBallHeld(heldBall),
    setBallHoldTimer: (seconds: number) => game.setBallHoldTimer(seconds),
    setBallServeSign: (sign: 1 | -1) => game.setBallServeSign(sign),
    drawBallServeSign: () => game.drawBallServeSign(),
    setAiTracking: (enabled: boolean) => game.setAiTracking(enabled),
    setAiMovement: (enabled: boolean) => game.setAiMovement(enabled),
    setMuted: (muted: boolean) => game.setMuted(muted),
    snapshot: () => game.snapshot(),
    menuItemRect: (index: number) => game.menuItemRect(index),
  };
}

window.__carom = makeDebugSurface();
renderer.render();
requestAnimationFrame(frame);

export { game, makeInput };
