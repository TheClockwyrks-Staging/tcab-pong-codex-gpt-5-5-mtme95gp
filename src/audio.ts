import type { Cue } from "./types";

const CUE_FREQ: Record<Cue, number> = {
  "paddle-hit": 420,
  "wall-bounce": 260,
  "obstacle-bounce": 620,
  score: 160,
};

export class AudioSystem {
  private context: AudioContext | null = null;

  arm(): void {
    if (!this.context) {
      this.context = new AudioContext();
    }
    void this.context.resume();
  }

  play(cue: Cue, muted: boolean): void {
    if (muted || !this.context) {
      return;
    }
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = cue === "score" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(CUE_FREQ[cue], now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }
}
