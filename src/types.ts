export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export type Cue = "paddle-hit" | "wall-bounce" | "obstacle-bounce" | "score";
export type Action =
  | "p1-up"
  | "p1-down"
  | "p2-up"
  | "p2-down"
  | "confirm"
  | "back"
  | "pause"
  | "mute";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ActionInput {
  held: ReadonlySet<Action>;
  pressed: ReadonlySet<Action>;
  pointer?: {
    move?: { x: number; y: number };
    down?: { x: number; y: number };
    up?: { x: number; y: number };
  };
  touch?: {
    start?: { x: number; y: number };
    move?: { x: number; y: number };
    end?: { x: number; y: number };
  };
}

export interface PaddleState {
  cy: number;
  vy: number;
  driven: boolean;
  drivenVy: number;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  held: boolean;
  holdTimer: number;
  serveSign: 1 | -1;
  trail: Array<{ x: number; y: number; t: number }>;
}

export interface ObstacleState {
  index: number;
  cx: number;
  cy: number;
}

export interface GameState {
  screen: Screen;
  mode: Mode;
  menuIndex: number;
  titleIndex: number;
  resumeScreen: "countdown" | "playing";
  score: { p1: number; p2: number };
  winner: Side | null;
  receiver: Side;
  paddles: { left: PaddleState; right: PaddleState };
  ai: { tracking: boolean; movement: boolean };
  ball: BallState | null;
  obstacles: ObstacleState[];
  simTime: number;
  muted: boolean;
}

export interface Snapshot extends Omit<GameState, "ball"> {
  version: 1;
  ball:
    | (BallState & {
        speed: number;
      })
    | null;
  autoStep: boolean;
}
