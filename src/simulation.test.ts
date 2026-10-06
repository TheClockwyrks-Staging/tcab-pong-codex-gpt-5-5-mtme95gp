import { describe, expect, it } from "vitest";
import {
  BALL_R,
  FIELD_CX,
  FIELD_CY,
  FIELD_W,
  HOLD_TIME,
  P1_X1,
  PADDLE_MAX_CY,
  PADDLE_SPEED,
  SERVE_SPEED,
  SPEED_MULT,
  SPIN_CLAMP,
} from "./constants";
import { CaromGame, makeInput } from "./simulation";

describe("CaromGame", () => {
  it("starts on the title screen with the declared world", () => {
    const game = new CaromGame(false);
    const snap = game.snapshot();
    expect(snap.version).toBe(1);
    expect(snap.screen).toBe("title");
    expect(snap.mode).toBe("solo");
    expect(snap.ball?.x).toBe(FIELD_CX);
    expect(snap.ball?.y).toBe(FIELD_CY);
    expect(snap.ball?.held).toBe(true);
    expect(snap.obstacles).toHaveLength(2);
  });

  it("serves toward player one after the countdown elapses", () => {
    const game = new CaromGame(false);
    game.startMatch("solo");
    game.setBallServeSign(1);
    game.update(HOLD_TIME, makeInput());
    const ball = game.snapshot().ball;
    expect(game.snapshot().screen).toBe("playing");
    expect(ball?.held).toBe(false);
    expect(ball?.vx).toBeLessThan(0);
    expect(ball?.speed).toBeCloseTo(SERVE_SPEED, 5);
    expect(ball?.trail).toHaveLength(1);
  });

  it("uses the integrated paddle velocity for spin on paddle hits", () => {
    const game = new CaromGame(false);
    game.startMatch("versus");
    game.setScreen("playing");
    game.setBallHeld(false);
    game.setBallPosition(P1_X1 + BALL_R + 1, FIELD_CY);
    game.setBallVelocity(-SERVE_SPEED, 0);
    game.update(1 / 60, makeInput(["p1-down"]));
    const ball = game.snapshot().ball;
    expect(ball?.vx).toBeGreaterThan(0);
    expect(ball?.speed).toBeCloseTo(SERVE_SPEED * SPEED_MULT, 5);
    expect(ball?.spin).toBeGreaterThan(PADDLE_SPEED * 0.8);
    expect(ball?.spin).toBeLessThanOrEqual(PADDLE_SPEED * 0.85);
  });

  it("clamps driven paddle velocity at field bounds", () => {
    const game = new CaromGame(false);
    game.setPaddleCy("left", PADDLE_MAX_CY);
    game.setPaddleVy("left", 500);
    game.setPaddleDriven("left", true);
    game.setScreen("playing");
    game.setBallHeld(false);
    game.update(0.1, makeInput());
    const paddle = game.snapshot().paddles.left;
    expect(paddle.cy).toBe(PADDLE_MAX_CY);
    expect(paddle.vy).toBe(0);
    expect(paddle.drivenVy).toBe(500);
  });

  it("scores points and enters matchover only when the lead rule holds", () => {
    const game = new CaromGame(false);
    game.startMatch("solo");
    game.setScreen("playing");
    game.setScore(10, 10);
    game.setBallHeld(false);
    game.setBallPosition(FIELD_W + BALL_R + 1, FIELD_CY);
    game.setBallVelocity(100, 0);
    game.update(0, makeInput());
    expect(game.snapshot().score).toEqual({ p1: 11, p2: 10 });
    expect(game.snapshot().screen).toBe("countdown");
    game.setScreen("playing");
    game.setBallHeld(false);
    game.setBallPosition(FIELD_W + BALL_R + 1, FIELD_CY);
    game.setBallVelocity(100, 0);
    game.update(0, makeInput());
    expect(game.snapshot().winner).toBe("left");
    expect(game.snapshot().screen).toBe("matchover");
  });

  it("keeps scripted runs close across different frame sizes", () => {
    const fast = driveScriptedRally(1 / 500);
    const slow = driveScriptedRally(1 / 80);
    expect(Math.abs(fast.time - slow.time) / fast.time).toBeLessThan(0.08);
    expect(Math.abs(fast.speed - slow.speed)).toBeLessThan(10);
    expect(Math.sign(fast.vx)).toBe(Math.sign(slow.vx));
    expect(
      Math.abs(fast.vy) < 120 || Math.sign(fast.vy) === Math.sign(slow.vy),
    ).toBe(true);
  });

  it("throws loudly when a missing ball is posed", () => {
    const game = new CaromGame(false);
    game.clearWorld();
    expect(() => game.setBallSpin(SPIN_CLAMP)).toThrow("No ball");
  });
});

function driveScriptedRally(dt: number): {
  time: number;
  speed: number;
  vx: number;
  vy: number;
} {
  const game = new CaromGame(false);
  game.startMatch("versus");
  game.setPaddleDriven("left", true);
  game.setPaddleDriven("right", true);
  game.setPaddleVy("left", 220);
  game.setPaddleVy("right", -180);
  game.setBallServeSign(1);
  let elapsed = 0;
  while (game.snapshot().screen !== "playing") {
    game.update(dt, makeInput());
    elapsed += dt;
  }
  while (elapsed < 3.2) {
    game.update(dt, makeInput());
    elapsed += dt;
  }
  const ball = game.snapshot().ball;
  if (!ball) {
    throw new Error("Expected ball");
  }
  return { time: elapsed, speed: ball.speed, vx: ball.vx, vy: ball.vy };
}
