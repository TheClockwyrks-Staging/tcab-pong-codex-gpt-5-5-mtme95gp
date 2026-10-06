export const FIELD_W = 1280;
export const FIELD_H = 720;
export const FIELD_CX = 640;
export const FIELD_CY = 360;
export const NET_X = 640;

export const PADDLE_W = 16;
export const PADDLE_H = 110;
export const PADDLE_HALF = 55;
export const P1_X0 = 48;
export const P1_X1 = 64;
export const P2_X0 = 1216;
export const P2_X1 = 1232;
export const PADDLE_MIN_CY = 55;
export const PADDLE_MAX_CY = 665;
export const PADDLE_SPEED = 720;

export const OBSTACLE_W = 20;
export const OBSTACLE_H = 140;
export const OBSTACLE_HW = 10;
export const OBSTACLE_HH = 70;
export const OBSTACLE_CENTERS = [
  { cx: 490, cy: 220 },
  { cx: 790, cy: 500 },
] as const;

export const BALL_R = 11;
export const SERVE_SPEED = 520;
export const SPEED_MULT = 1.04;
export const SPEED_CAP = 980;
export const MAX_SUBSTEP = 4;
export const MAX_BOUNCE_ANGLE = (55 * Math.PI) / 180;
export const SERVE_ANGLE = (12 * Math.PI) / 180;
export const SPIN_FROM_PADDLE = 0.85;
export const SPIN_CLAMP = 900;
export const SPIN_HALFLIFE = 0.8;
export const HOLD_TIME = 1;
export const TRAIL_TIME = 0.13;
export const WIN_SCORE = 11;
export const WIN_LEAD = 2;

export const AI_SPEED = 560;
export const AI_REACT = 0.12;
export const AI_DEADZONE = 10;
export const AI_HOME_Y = 360;
export const AI_HOME_DEADZONE = 18;

export const TITLE_TEXT = "CAROM";
export const TITLE_ITEMS = ["SOLO", "VERSUS", "HOW TO PLAY"] as const;
export const PAUSE_ITEMS = ["RESUME", "RESTART", "QUIT TO MENU"] as const;
export const MATCHOVER_ITEMS = ["PLAY AGAIN", "MENU"] as const;
export const CAROM_DEBUG_VERSION = 1;
