/**
 * Axumite AI - Interactive Audio Chime Engine
 * Provides subtle, elegant Web Audio API synthesized confirmation tones
 * for voice command triggers, cursor guide navigation, and haptic audio feedback.
 */

class AudioChimeEngine {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Subtle ascending golden chime when activating Voice Command / Mic HUD
   */
  public playVoiceTriggerChime(volume = 0.12): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Elegant Axumite Golden Frequency pair: D5 (587.33Hz) -> A5 (880.00Hz)
      const frequencies = [587.33, 880.00];

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        // Soft exponential envelope
        gain.gain.setValueAtTime(0.0001, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(volume, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.35);
      });
    } catch {
      // Graceful silence if browser blocks audio
    }
  }

  /**
   * Subtle confirmation tone when AxumiteCursorGuide locks on target or user clicks it
   */
  public playCursorGuideChime(volume = 0.09): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // High-precision shimmering harmonic chord (F#5, A5, C#6)
      const notes = [739.99, 880.00, 1108.73];

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.0001, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(volume, now + i * 0.05 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.3);
      });
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Reassuring success chime when voice command or action successfully executes
   */
  public playCommandSuccessChime(volume = 0.12): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Triumphant triad: E5 (659.25Hz) -> G#5 (830.61Hz) -> B5 (987.77Hz)
      const triad = [659.25, 830.61, 987.77];

      triad.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(volume, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.42);
      });
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Soft descending chime when microphone is paused or voice overlay closed
   */
  public playVoiceDeactivateChime(volume = 0.08): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [783.99, 523.25]; // G5 -> C5

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(volume, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Subtle tactile 'snap' / 'click' micro-sound synced with committed tab swipe transitions
   */
  public playHapticSnapClick(
    direction: 'left' | 'right' = 'left',
    intensity: 'light' | 'medium' | 'crisp' = 'medium'
  ): boolean {
    try {
      const ctx = this.getContext();
      if (!ctx) return false;

      const now = ctx.currentTime;
      const peakGain =
        intensity === 'light' ? 0.045 : intensity === 'crisp' ? 0.1 : 0.07;

      // 1. Soft wood/ceramic resonant thump-snap body
      const bodyOsc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      bodyOsc.type = 'sine';
      const startFreq = direction === 'left' ? 760 : 640;
      const endFreq = direction === 'left' ? 230 : 190;
      bodyOsc.frequency.setValueAtTime(startFreq, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.028);

      bodyGain.gain.setValueAtTime(0.0001, now);
      bodyGain.gain.linearRampToValueAtTime(peakGain, now + 0.004);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.036);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.04);

      // 2. Micro-click crisp transient edge
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(direction === 'left' ? 1850 : 1620, now);
      clickOsc.frequency.exponentialRampToValueAtTime(920, now + 0.012);

      clickGain.gain.setValueAtTime(0.0001, now);
      clickGain.gain.linearRampToValueAtTime(peakGain * 0.45, now + 0.002);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.018);

      return true;
    } catch {
      return false;
    }
  }
}

export const audioChime = new AudioChimeEngine();

export function playVoiceTriggerChime(volume?: number): void {
  audioChime.playVoiceTriggerChime(volume);
}

export function playCursorGuideChime(volume?: number): void {
  audioChime.playCursorGuideChime(volume);
}

export function playCommandSuccessChime(volume?: number): void {
  audioChime.playCommandSuccessChime(volume);
}

export function playVoiceDeactivateChime(volume?: number): void {
  audioChime.playVoiceDeactivateChime(volume);
}

export function playHapticSnapClick(
  direction?: 'left' | 'right',
  intensity?: 'light' | 'medium' | 'crisp'
): boolean {
  return audioChime.playHapticSnapClick(direction, intensity);
}
