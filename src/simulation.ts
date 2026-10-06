import {
  AI_DEADZONE,
  AI_HOME_DEADZONE,
  AI_HOME_Y,
  AI_REACT,
  AI_SPEED,
  BALL_R,
  CAROM_DEBUG_VERSION,
  FIELD_CX,
  FIELD_CY,
  FIELD_H,
  FIELD_W,
  HOLD_TIME,
  MATCHOVER_ITEMS,
  MAX_BOUNCE_ANGLE,
  MAX_SUBSTEP,
  OBSTACLE_CENTERS,
  OBSTACLE_HH,
  OBSTACLE_HW,
  P1_X0,
  P1_X1,
  P2_X0,
  P2_X1,
  PADDLE_HALF,
  PADDLE_MAX_CY,
  PADDLE_MIN_CY,
  PADDLE_SPEED,
  PAUSE_ITEMS,
  SERVE_ANGLE,
  SERVE_SPEED,
  SPEED_CAP,
  SPEED_MULT,
  SPIN_CLAMP,
  SPIN_FROM_PADDLE,
  SPIN_HALFLIFE,
  TITLE_ITEMS,
  TRAIL_TIME,
  WIN_LEAD,
  WIN_SCORE,
} from "./constants";
import type {
  Action,
  ActionInput,
  BallState,
  Cue,
  GameState,
  Mode,
  ObstacleState,
  PaddleState,
  Rect,
  Screen,
  Side,
  Snapshot,
} from "./types";

const EMPTY_INPUT: ActionInput = {
  held: new Set(),
  pressed: new Set(),
};

export interface StepResult {
  cues: Cue[];
}

export class CaromGame {
  state: GameState;
  autoStep = true;
  private pointerDownIndex: number | null = null;
  private touchDownIndex: number | null = null;

  constructor(muted = false) {
    this.state = this.makeTitleState(muted);
  }

  update(dt: number, input: ActionInput = EMPTY_INPUT): StepResult {
    const cues = new Set<Cue>();
    const startScreen = this.state.screen;
    this.state.simTime += dt;
    if (input.pressed.has("mute")) {
      this.state.muted = !this.state.muted;
    }
    this.handleScreenInput(startScreen, input);
    switch (this.state.screen) {
      case "countdown":
        this.movePaddles(dt, input);
        this.updateCountdown(dt);
        this.recordTrail();
        break;
      case "playing":
        this.movePaddles(dt, input);
        this.advanceBall(dt, cues);
        this.recordTrail();
        this.scoreIfNeeded(cues);
        break;
      case "title":
      case "howto":
      case "paused":
      case "matchover":
        break;
    }
    return { cues: [...cues] };
  }

  startMatch(mode: Mode): void {
    this.state.mode = mode;
    this.state.screen = "countdown";
    this.state.resumeScreen = "playing";
    this.state.menuIndex = 0;
    this.state.score = { p1: 0, p2: 0 };
    this.state.winner = null;
    this.state.receiver = "left";
    this.spawnBall();
    for (const side of ["left", "right"] as const) {
      this.state.paddles[side].cy = FIELD_CY;
      this.state.paddles[side].vy = 0;
    }
  }

  returnToTitle(): void {
    const { titleIndex, simTime, muted } = this.state;
    this.state = this.makeTitleState(muted);
    this.state.titleIndex = titleIndex;
    this.state.menuIndex = titleIndex;
    this.state.simTime = simTime;
  }

  reset(): void {
    const muted = this.state.muted;
    this.state = this.makeTitleState(muted);
  }

  clearWorld(): void {
    this.state.ball = null;
    this.state.obstacles = [];
  }

  spawnBall(): void {
    this.state.ball = this.parkedBall();
  }

  spawnObstacle(index: number): void {
    const center = OBSTACLE_CENTERS[index];
    if (!center) {
      throw new Error(`Unknown obstacle index ${index}`);
    }
    const obstacle = { index, cx: center.cx, cy: center.cy };
    const existing = this.state.obstacles.findIndex(
      (item) => item.index === index,
    );
    if (existing >= 0) {
      this.state.obstacles[existing] = obstacle;
    } else {
      this.state.obstacles.push(obstacle);
      this.state.obstacles.sort((a, b) => a.index - b.index);
    }
  }

  menuItemRect(index: number): Rect | null {
    const count = this.menuItems().length;
    if (index < 0 || index >= count || count === 0) {
      return null;
    }
    const w = this.state.screen === "howto" ? 240 : 330;
    const h = 58;
    const gap = 18;
    const startY =
      this.state.screen === "title"
        ? 378
        : this.state.screen === "howto"
          ? 576
          : this.state.screen === "paused"
            ? 334
            : 414;
    return { x: FIELD_CX - w / 2, y: startY + index * (h + gap), w, h };
  }

  snapshot(): Snapshot {
    const ball = this.state.ball
      ? {
          ...this.state.ball,
          trail: this.state.ball.trail.map((sample) => ({ ...sample })),
          speed: Math.hypot(this.state.ball.vx, this.state.ball.vy),
        }
      : null;
    return {
      version: CAROM_DEBUG_VERSION,
      screen: this.state.screen,
      mode: this.state.mode,
      menuIndex: this.state.menuIndex,
      titleIndex: this.state.titleIndex,
      resumeScreen: this.state.resumeScreen,
      score: { ...this.state.score },
      winner: this.state.winner,
      muted: this.state.muted,
      paddles: {
        left: { ...this.state.paddles.left },
        right: { ...this.state.paddles.right },
      },
      ai: { ...this.state.ai },
      receiver: this.state.receiver,
      ball,
      obstacles: this.state.obstacles.map((obstacle) => ({ ...obstacle })),
      autoStep: this.autoStep,
      simTime: this.state.simTime,
    };
  }

  setScreen(screen: Screen): void {
    this.state.screen = screen;
  }

  setMode(mode: Mode): void {
    this.state.mode = mode;
  }

  setMenuIndex(index: number): void {
    this.state.menuIndex = index;
  }

  setTitleIndex(index: number): void {
    this.state.titleIndex = index;
  }

  setResumeScreen(screen: "countdown" | "playing"): void {
    this.state.resumeScreen = screen;
  }

  setScore(p1: number, p2: number): void {
    this.state.score = { p1, p2 };
  }

  setWinner(side: Side | null): void {
    this.state.winner = side;
  }

  setReceiver(side: Side): void {
    this.state.receiver = side;
  }

  setPaddleCy(side: Side, cy: number): void {
    this.state.paddles[side].cy = cy;
  }

  setPaddleVy(side: Side, vy: number): void {
    this.state.paddles[side].drivenVy = vy;
  }

  setPaddleDriven(side: Side, driven: boolean): void {
    this.state.paddles[side].driven = driven;
  }

  setBallPosition(x: number, y: number): void {
    this.requireBall().x = x;
    this.requireBall().y = y;
  }

  setBallVelocity(vx: number, vy: number): void {
    this.requireBall().vx = vx;
    this.requireBall().vy = vy;
  }

  setBallSpin(spin: number): void {
    this.requireBall().spin = spin;
  }

  setBallHeld(held: boolean): void {
    this.requireBall().held = held;
  }

  setBallHoldTimer(seconds: number): void {
    this.requireBall().holdTimer = seconds;
  }

  setBallServeSign(sign: 1 | -1): void {
    this.requireBall().serveSign = sign;
  }

  drawBallServeSign(): void {
    this.requireBall().serveSign = this.drawServeSign();
  }

  setAiTracking(enabled: boolean): void {
    this.state.ai.tracking = enabled;
  }

  setAiMovement(enabled: boolean): void {
    this.state.ai.movement = enabled;
  }

  setMuted(muted: boolean): void {
    this.state.muted = muted;
  }

  reconcile(): void {
    return;
  }

  private makeTitleState(muted: boolean): GameState {
    return {
      screen: "title",
      mode: "solo",
      menuIndex: 0,
      titleIndex: 0,
      resumeScreen: "playing",
      score: { p1: 0, p2: 0 },
      winner: null,
      receiver: "left",
      paddles: {
        left: this.newPaddle(),
        right: this.newPaddle(),
      },
      ai: { tracking: true, movement: true },
      ball: this.parkedBall(),
      obstacles: OBSTACLE_CENTERS.map((center, index) => ({
        index,
        cx: center.cx,
        cy: center.cy,
      })),
      simTime: 0,
      muted,
    };
  }

  private newPaddle(): PaddleState {
    return { cy: FIELD_CY, vy: 0, driven: false, drivenVy: 0 };
  }

  private parkedBall(): BallState {
    return {
      x: FIELD_CX,
      y: FIELD_CY,
      vx: 0,
      vy: 0,
      spin: 0,
      held: true,
      holdTimer: HOLD_TIME,
      serveSign: this.drawServeSign(),
      trail: [],
    };
  }

  private drawServeSign(): 1 | -1 {
    return Math.random() < 0.5 ? -1 : 1;
  }

  private requireBall(): BallState {
    if (!this.state.ball) {
      throw new Error("No ball is present");
    }
    return this.state.ball;
  }

  private handleScreenInput(startScreen: Screen, input: ActionInput): void {
    if (startScreen === "countdown" || startScreen === "playing") {
      if (input.pressed.has("pause")) {
        this.state.resumeScreen = startScreen;
        this.state.screen = "paused";
        this.state.menuIndex = 0;
      }
      return;
    }
    if (
      startScreen === "paused" &&
      (input.pressed.has("pause") || input.pressed.has("back"))
    ) {
      this.state.screen = this.state.resumeScreen;
      return;
    }
    const keyboardMoved = this.handleKeyboardMenu(startScreen, input);
    this.handlePointerMenu(input, keyboardMoved);
  }

  private handleKeyboardMenu(screen: Screen, input: ActionInput): boolean {
    if (screen === "title" || screen === "paused" || screen === "matchover") {
      const items = this.menuItems();
      const up = input.pressed.has("p1-up") || input.pressed.has("p2-up");
      const down = input.pressed.has("p1-down") || input.pressed.has("p2-down");
      if (up || down) {
        const delta = up ? -1 : 1;
        this.state.menuIndex =
          (this.state.menuIndex + delta + items.length) % items.length;
        return true;
      }
      if (input.pressed.has("confirm")) {
        this.confirmMenuItem(screen, this.state.menuIndex);
      } else if (screen === "matchover" && input.pressed.has("back")) {
        this.returnToTitle();
      }
      return false;
    }
    if (
      screen === "howto" &&
      (input.pressed.has("confirm") || input.pressed.has("back"))
    ) {
      this.returnToTitle();
    }
    return false;
  }

  private handlePointerMenu(input: ActionInput, keyboardMoved: boolean): void {
    if (input.pressed.has("confirm")) {
      return;
    }
    const applyPoint = (
      point: { x: number; y: number } | undefined,
    ): number | null => {
      if (!point) {
        return null;
      }
      const index = this.itemAt(point.x, point.y);
      if (index !== null) {
        this.state.menuIndex = index;
      }
      return index;
    };
    if (!keyboardMoved) {
      applyPoint(input.pointer?.move);
      applyPoint(input.touch?.move);
    }
    if (input.pointer?.down) {
      this.pointerDownIndex = applyPoint(input.pointer.down);
    }
    if (input.touch?.start) {
      this.touchDownIndex = applyPoint(input.touch.start);
    }
    if (input.pointer?.up) {
      const upIndex = applyPoint(input.pointer.up);
      if (upIndex !== null && upIndex === this.pointerDownIndex) {
        this.confirmMenuItem(this.state.screen, this.state.menuIndex);
      }
      this.pointerDownIndex = null;
    }
    if (input.touch?.end) {
      const upIndex = applyPoint(input.touch.end);
      if (upIndex !== null && upIndex === this.touchDownIndex) {
        this.confirmMenuItem(this.state.screen, this.state.menuIndex);
      }
      this.touchDownIndex = null;
    }
  }

  private itemAt(x: number, y: number): number | null {
    for (let index = 0; index < this.menuItems().length; index += 1) {
      const rect = this.menuItemRect(index);
      if (
        rect &&
        x >= rect.x &&
        x <= rect.x + rect.w &&
        y >= rect.y &&
        y <= rect.y + rect.h
      ) {
        return index;
      }
    }
    return null;
  }

  private confirmMenuItem(screen: Screen, index: number): void {
    if (screen === "title") {
      this.state.titleIndex = index;
      if (index === 0) {
        this.startMatch("solo");
      } else if (index === 1) {
        this.startMatch("versus");
      } else {
        this.state.screen = "howto";
        this.state.menuIndex = 0;
      }
    } else if (screen === "howto") {
      this.returnToTitle();
    } else if (screen === "paused") {
      if (index === 0) {
        this.state.screen = this.state.resumeScreen;
      } else if (index === 1) {
        this.startMatch(this.state.mode);
      } else {
        this.returnToTitle();
      }
    } else if (screen === "matchover") {
      if (index === 0) {
        this.startMatch(this.state.mode);
      } else {
        this.returnToTitle();
      }
    }
  }

  private menuItems(): readonly string[] {
    if (this.state.screen === "title") {
      return TITLE_ITEMS;
    }
    if (this.state.screen === "paused") {
      return PAUSE_ITEMS;
    }
    if (this.state.screen === "matchover") {
      return MATCHOVER_ITEMS;
    }
    if (this.state.screen === "howto") {
      return ["BACK"];
    }
    return [];
  }

  private movePaddles(dt: number, input: ActionInput): void {
    this.moveLeftPaddle(dt, input);
    this.moveRightPaddle(dt, input);
  }

  private moveLeftPaddle(dt: number, input: ActionInput): void {
    const paddle = this.state.paddles.left;
    if (paddle.driven) {
      this.integratePaddle(paddle, paddle.drivenVy, dt);
      return;
    }
    this.integratePaddle(
      paddle,
      this.axisFor(input, "left") * PADDLE_SPEED,
      dt,
    );
  }

  private moveRightPaddle(dt: number, input: ActionInput): void {
    const paddle = this.state.paddles.right;
    if (paddle.driven) {
      this.integratePaddle(paddle, paddle.drivenVy, dt);
      return;
    }
    if (this.state.mode === "versus") {
      this.integratePaddle(
        paddle,
        this.axisFor(input, "right") * PADDLE_SPEED,
        dt,
      );
      return;
    }
    this.integratePaddle(paddle, this.aiVy(dt), dt);
  }

  private aiVy(dt: number): number {
    if (!this.state.ai.movement || dt <= 0) {
      return 0;
    }
    const paddle = this.state.paddles.right;
    const ball = this.state.ball;
    let target = AI_HOME_Y;
    let deadzone = AI_HOME_DEADZONE;
    if (
      this.state.ai.tracking &&
      this.state.screen === "playing" &&
      ball &&
      ball.vx > 0
    ) {
      target = ball.y - ball.vy * AI_REACT;
      deadzone = AI_DEADZONE;
    }
    const diff = target - paddle.cy;
    if (Math.abs(diff) <= deadzone) {
      return 0;
    }
    return Math.sign(diff) * Math.min(AI_SPEED, Math.abs(diff) / dt);
  }

  private axisFor(input: ActionInput, side: Side): number {
    if (this.state.mode === "solo" && side === "left") {
      const up = input.held.has("p1-up") || input.held.has("p2-up") ? 1 : 0;
      const down =
        input.held.has("p1-down") || input.held.has("p2-down") ? 1 : 0;
      return down - up;
    }
    const upAction = side === "left" ? "p1-up" : "p2-up";
    const downAction = side === "left" ? "p1-down" : "p2-down";
    const up = input.held.has(upAction) ? 1 : 0;
    const down = input.held.has(downAction) ? 1 : 0;
    return down - up;
  }

  private integratePaddle(
    paddle: PaddleState,
    intendedVy: number,
    dt: number,
  ): void {
    if (dt <= 0) {
      paddle.vy = intendedVy;
      return;
    }
    const old = paddle.cy;
    const next = clamp(old + intendedVy * dt, PADDLE_MIN_CY, PADDLE_MAX_CY);
    paddle.vy = next !== old ? (next - old) / dt : 0;
    paddle.cy = next;
  }

  private updateCountdown(dt: number): void {
    const ball = this.state.ball;
    if (!ball) {
      return;
    }
    ball.x = FIELD_CX;
    ball.y = FIELD_CY;
    ball.holdTimer -= dt;
    if (ball.holdTimer <= 0) {
      ball.holdTimer = 0;
      ball.held = false;
      ball.trail = [];
      const dir = this.state.receiver === "left" ? -1 : 1;
      ball.vx = dir * SERVE_SPEED * Math.cos(SERVE_ANGLE);
      ball.vy = ball.serveSign * SERVE_SPEED * Math.sin(SERVE_ANGLE);
      this.state.screen = "playing";
    }
  }

  private advanceBall(dt: number, cues: Set<Cue>): void {
    const ball = this.state.ball;
    if (!ball || ball.held) {
      return;
    }
    const speed = Math.hypot(ball.vx, ball.vy);
    const steps = Math.max(1, Math.ceil((speed * dt) / MAX_SUBSTEP));
    const h = dt / steps;
    for (let i = 0; i < steps; i += 1) {
      this.advanceBallStep(ball, h, cues);
    }
  }

  private advanceBallStep(ball: BallState, h: number, cues: Set<Cue>): void {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0) {
      const angle = (ball.spin / speed) * h;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const vx = ball.vx * cos - ball.vy * sin;
      ball.vy = ball.vx * sin + ball.vy * cos;
      ball.vx = vx;
    }
    ball.spin *= 0.5 ** (h / SPIN_HALFLIFE);
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;
    if (ball.y - BALL_R < 0 && ball.vy < 0) {
      ball.y = BALL_R;
      ball.vy = -ball.vy;
      cues.add("wall-bounce");
    } else if (ball.y + BALL_R > FIELD_H && ball.vy > 0) {
      ball.y = FIELD_H - BALL_R;
      ball.vy = -ball.vy;
      cues.add("wall-bounce");
    }
    this.resolvePaddle(ball, "left", cues);
    this.resolvePaddle(ball, "right", cues);
    for (const obstacle of this.state.obstacles) {
      if (this.resolveRect(ball, this.obstacleRect(obstacle))) {
        cues.add("obstacle-bounce");
      }
    }
  }

  private resolvePaddle(ball: BallState, side: Side, cues: Set<Cue>): void {
    const paddle = this.state.paddles[side];
    const rect =
      side === "left"
        ? {
            x0: P1_X0,
            x1: P1_X1,
            y0: paddle.cy - PADDLE_HALF,
            y1: paddle.cy + PADDLE_HALF,
          }
        : {
            x0: P2_X0,
            x1: P2_X1,
            y0: paddle.cy - PADDLE_HALF,
            y1: paddle.cy + PADDLE_HALF,
          };
    const face = this.resolveRect(ball, rect, false);
    if (!face) {
      return;
    }
    if (face === "left" || face === "right") {
      const offset = clamp((ball.y - paddle.cy) / PADDLE_HALF, -1, 1);
      const theta = offset * MAX_BOUNCE_ANGLE;
      const speed = Math.min(
        Math.hypot(ball.vx, ball.vy) * SPEED_MULT,
        SPEED_CAP,
      );
      const dir = side === "left" ? 1 : -1;
      ball.vx = dir * speed * Math.cos(theta);
      ball.vy = speed * Math.sin(theta);
      ball.spin = clamp(
        ball.spin + paddle.vy * SPIN_FROM_PADDLE,
        -SPIN_CLAMP,
        SPIN_CLAMP,
      );
      ball.x = side === "left" ? P1_X1 + BALL_R : P2_X0 - BALL_R;
      cues.add("paddle-hit");
    } else {
      cues.add("wall-bounce");
    }
  }

  private resolveRect(
    ball: BallState,
    rect: { x0: number; x1: number; y0: number; y1: number },
    apply = true,
  ): "left" | "right" | "top" | "bottom" | null {
    if (
      !(ball.x > rect.x0 - BALL_R && ball.x < rect.x1 + BALL_R) ||
      !(ball.y > rect.y0 - BALL_R && ball.y < rect.y1 + BALL_R)
    ) {
      return null;
    }
    const depths = [
      { face: "left" as const, depth: ball.x - (rect.x0 - BALL_R) },
      { face: "right" as const, depth: rect.x1 + BALL_R - ball.x },
      { face: "top" as const, depth: ball.y - (rect.y0 - BALL_R) },
      { face: "bottom" as const, depth: rect.y1 + BALL_R - ball.y },
    ];
    const face = depths.reduce((best, item) =>
      item.depth < best.depth ? item : best,
    ).face;
    if (face === "left") {
      ball.x = rect.x0 - BALL_R;
      if (ball.vx > 0) ball.vx = -ball.vx;
    } else if (face === "right") {
      ball.x = rect.x1 + BALL_R;
      if (ball.vx < 0) ball.vx = -ball.vx;
    } else if (face === "top") {
      ball.y = rect.y0 - BALL_R;
      if (ball.vy > 0) ball.vy = -ball.vy;
    } else {
      ball.y = rect.y1 + BALL_R;
      if (ball.vy < 0) ball.vy = -ball.vy;
    }
    if (!apply) {
      return face;
    }
    return face;
  }

  private obstacleRect(obstacle: ObstacleState): {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
  } {
    return {
      x0: obstacle.cx - OBSTACLE_HW,
      x1: obstacle.cx + OBSTACLE_HW,
      y0: obstacle.cy - OBSTACLE_HH,
      y1: obstacle.cy + OBSTACLE_HH,
    };
  }

  private scoreIfNeeded(cues: Set<Cue>): void {
    const ball = this.state.ball;
    if (!ball) {
      return;
    }
    let scorer: Side | null = null;
    if (ball.x - BALL_R > FIELD_W) {
      scorer = "left";
      this.state.score.p1 += 1;
    } else if (ball.x + BALL_R < 0) {
      scorer = "right";
      this.state.score.p2 += 1;
    }
    if (!scorer) {
      return;
    }
    cues.add("score");
    const { p1, p2 } = this.state.score;
    if (
      (p1 >= WIN_SCORE && p1 - p2 >= WIN_LEAD) ||
      (p2 >= WIN_SCORE && p2 - p1 >= WIN_LEAD)
    ) {
      this.state.winner = scorer;
      this.state.screen = "matchover";
      this.state.menuIndex = 0;
      return;
    }
    this.spawnBall();
    this.state.receiver = scorer === "left" ? "right" : "left";
    this.requireBall().holdTimer = HOLD_TIME;
    this.state.screen = "countdown";
  }

  private recordTrail(): void {
    const ball = this.state.ball;
    if (!ball) {
      return;
    }
    ball.trail.push({ x: ball.x, y: ball.y, t: this.state.simTime });
    ball.trail = ball.trail.filter(
      (sample) => this.state.simTime - sample.t <= TRAIL_TIME,
    );
  }
}

export function makeInput(
  held: Iterable<string> = [],
  pressed: Iterable<string> = [],
): ActionInput {
  return {
    held: new Set(held as Iterable<Action>),
    pressed: new Set(pressed as Iterable<Action>),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
