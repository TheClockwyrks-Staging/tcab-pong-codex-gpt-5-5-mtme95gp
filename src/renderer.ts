import {
  BALL_R,
  FIELD_CX,
  FIELD_CY,
  FIELD_H,
  FIELD_W,
  MATCHOVER_ITEMS,
  NET_X,
  OBSTACLE_H,
  OBSTACLE_W,
  P1_X0,
  P2_X0,
  PADDLE_H,
  PADDLE_W,
  PAUSE_ITEMS,
  TITLE_ITEMS,
  TITLE_TEXT,
} from "./constants";
import type { CaromGame } from "./simulation";
import type { Rect, Snapshot } from "./types";

const COLORS = {
  field: "#071013",
  line: "#29434b",
  text: "#e9fbff",
  dim: "rgba(233, 251, 255, 0.52)",
  left: "#23d18b",
  right: "#ff5c7a",
  ball: "#ffe66d",
  obstacle: "#49a7ff",
  panel: "rgba(3, 10, 13, 0.72)",
  selected: "#ffffff",
  shadow: "rgba(0, 0, 0, 0.35)",
};

export class Renderer {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: CanvasRenderingContext2D,
    private readonly game: CaromGame,
  ) {}

  render(debugLines: string[] = []): void {
    const snapshot = this.game.snapshot();
    const fit = this.fit();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = COLORS.field;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(fit.scale, 0, 0, fit.scale, fit.x, fit.y);
    this.drawField(snapshot);
    if (snapshot.screen === "title") this.drawTitle(snapshot);
    if (snapshot.screen === "howto") this.drawHowTo(snapshot);
    if (snapshot.screen === "paused") this.drawPaused(snapshot);
    if (snapshot.screen === "matchover") this.drawMatchOver(snapshot);
    if (debugLines.length > 0) this.drawDebug(debugLines);
  }

  fit(): { x: number; y: number; scale: number; cssScale: number } {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const scale = Math.min(width / FIELD_W, height / FIELD_H);
    return {
      x: (width - FIELD_W * scale) / 2,
      y: (height - FIELD_H * scale) / 2,
      scale,
      cssScale: scale / dpr,
    };
  }

  clientToField(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const fit = this.fit();
    return {
      x: ((clientX - rect.left) * dpr - fit.x) / fit.scale,
      y: ((clientY - rect.top) * dpr - fit.y) / fit.scale,
    };
  }

  private drawField(snapshot: Snapshot): void {
    const liveAlpha =
      snapshot.screen === "title" || snapshot.screen === "howto" ? 0.44 : 1;
    this.ctx.fillStyle = COLORS.field;
    this.ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    this.drawCourtLines();
    this.ctx.save();
    this.ctx.globalAlpha = liveAlpha;
    this.drawObstacles(snapshot);
    this.drawPaddles(snapshot);
    this.drawBall(snapshot);
    this.ctx.restore();
    if (snapshot.screen === "playing" || snapshot.screen === "countdown") {
      this.drawHud(snapshot);
      if (snapshot.screen === "countdown" && snapshot.ball) {
        this.centerText(
          Math.ceil(snapshot.ball.holdTimer).toString(),
          FIELD_CY,
          92,
          COLORS.text,
        );
      }
    }
  }

  private drawCourtLines(): void {
    this.ctx.strokeStyle = COLORS.line;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(18, 18, FIELD_W - 36, FIELD_H - 36);
    this.ctx.setLineDash([18, 18]);
    this.ctx.beginPath();
    this.ctx.moveTo(NET_X, 34);
    this.ctx.lineTo(NET_X, FIELD_H - 34);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawPaddles(snapshot: Snapshot): void {
    this.roundRect(
      P1_X0,
      snapshot.paddles.left.cy - PADDLE_H / 2,
      PADDLE_W,
      PADDLE_H,
      8,
      COLORS.left,
    );
    this.roundRect(
      P2_X0,
      snapshot.paddles.right.cy - PADDLE_H / 2,
      PADDLE_W,
      PADDLE_H,
      8,
      COLORS.right,
    );
  }

  private drawObstacles(snapshot: Snapshot): void {
    for (const obstacle of snapshot.obstacles) {
      this.roundRect(
        obstacle.cx - OBSTACLE_W / 2,
        obstacle.cy - OBSTACLE_H / 2,
        OBSTACLE_W,
        OBSTACLE_H,
        9,
        COLORS.obstacle,
      );
    }
  }

  private drawBall(snapshot: Snapshot): void {
    const ball = snapshot.ball;
    if (!ball) return;
    if (ball.trail.length > 1) {
      this.ctx.lineCap = "round";
      for (let i = 1; i < ball.trail.length; i += 1) {
        const age = snapshot.simTime - ball.trail[i].t;
        this.ctx.strokeStyle = `rgba(255, 230, 109, ${Math.max(0, 1 - age / 0.13) * 0.5})`;
        this.ctx.lineWidth = BALL_R * (1 - i / (ball.trail.length + 4)) + 2;
        this.ctx.beginPath();
        this.ctx.moveTo(ball.trail[i - 1].x, ball.trail[i - 1].y);
        this.ctx.lineTo(ball.trail[i].x, ball.trail[i].y);
        this.ctx.stroke();
      }
    }
    this.ctx.shadowColor = COLORS.ball;
    this.ctx.shadowBlur = 18;
    this.ctx.fillStyle = COLORS.ball;
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private drawHud(snapshot: Snapshot): void {
    this.text(
      `${snapshot.score.p1}`,
      FIELD_CX - 120,
      76,
      56,
      COLORS.left,
      "center",
    );
    this.text(
      `${snapshot.score.p2}`,
      FIELD_CX + 120,
      76,
      56,
      COLORS.right,
      "center",
    );
    this.text(
      snapshot.mode === "solo" ? "SOLO" : "VERSUS",
      FIELD_CX,
      42,
      20,
      COLORS.dim,
      "center",
    );
  }

  private drawTitle(snapshot: Snapshot): void {
    this.overlay();
    this.centerText(TITLE_TEXT, 194, 104, COLORS.text);
    this.text(
      "spin the rally, bank the angle",
      FIELD_CX,
      272,
      24,
      COLORS.dim,
      "center",
    );
    this.drawMenu(TITLE_ITEMS, snapshot.menuIndex);
  }

  private drawHowTo(snapshot: Snapshot): void {
    this.overlay();
    this.centerText("HOW TO PLAY", 118, 56, COLORS.text);
    const lines = [
      "W/S move the left paddle. Arrow keys move the right paddle in Versus.",
      "Enter or Space confirms. P or Escape pauses. M mutes the blips.",
      "Move through contact to add spin; the ball keeps curving after the hit.",
      "Use the blue bars for bank shots, angles, and awkward saves.",
    ];
    lines.forEach((line, index) =>
      this.text(line, FIELD_CX, 218 + index * 46, 25, COLORS.text, "center"),
    );
    this.drawMenu(["BACK"], snapshot.menuIndex);
  }

  private drawPaused(snapshot: Snapshot): void {
    this.overlay();
    this.centerText("PAUSED", 220, 70, COLORS.text);
    this.drawMenu(PAUSE_ITEMS, snapshot.menuIndex);
  }

  private drawMatchOver(snapshot: Snapshot): void {
    this.overlay();
    const winner =
      snapshot.winner === "left" ? "PLAYER ONE WINS" : "PLAYER TWO WINS";
    this.centerText(winner, 196, 66, COLORS.text);
    this.text(
      `FINAL ${snapshot.score.p1} - ${snapshot.score.p2}`,
      FIELD_CX,
      290,
      34,
      COLORS.dim,
      "center",
    );
    this.drawMenu(MATCHOVER_ITEMS, snapshot.menuIndex);
  }

  private drawMenu(items: readonly string[], selected: number): void {
    items.forEach((item, index) => {
      const rect = this.game.menuItemRect(index);
      if (!rect) return;
      const active = index === selected;
      this.roundRect(
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        8,
        active ? COLORS.selected : "rgba(233,251,255,0.1)",
      );
      this.text(
        item,
        rect.x + rect.w / 2,
        rect.y + 38,
        25,
        active ? COLORS.field : COLORS.text,
        "center",
      );
    });
  }

  private drawDebug(lines: string[]): void {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    this.ctx.fillRect(14, 14, 420, 24 + lines.length * 18);
    lines.forEach((line, index) =>
      this.text(line, 26, 38 + index * 18, 14, "#baf7d3", "left"),
    );
  }

  private overlay(): void {
    this.ctx.fillStyle = COLORS.panel;
    this.ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  }

  private centerText(
    copy: string,
    y: number,
    size: number,
    color: string,
  ): void {
    this.text(copy, FIELD_CX, y, size, color, "center", "700");
  }

  private text(
    copy: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign,
    weight = "600",
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${weight} ${size}px Inter, ui-sans-serif, system-ui, sans-serif`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = "alphabetic";
    this.ctx.shadowColor = COLORS.shadow;
    this.ctx.shadowBlur = 4;
    this.ctx.fillText(copy, x, y);
    this.ctx.shadowBlur = 0;
  }

  private roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
  ): void {
    this.ctx.fillStyle = fill;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, r);
    this.ctx.fill();
  }
}

export function rectCenter(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}
