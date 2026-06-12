'use client';

/**
 * Triggers a short vibration (haptic feedback) on supported devices.
 */
export function triggerHaptic(duration = 15) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch {
      // Ignore security errors (e.g. if iframe or focus restrictions apply)
    }
  }
}

/**
 * Synthesizes a subtle, satisfying click/tick audio feedback using the Web Audio API.
 * This does not load external assets, keeping the page loading fast and 0-byte network footprint.
 */
export function playClickSound() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || 
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    
    // Resume context if suspended (common in browser autoplay security rules)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // A subtle high-to-low sweep creates a satisfying soft "tick/pop" sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.06);

    // Fade out extremely quickly so it is a micro-click rather than a beep
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    // Ignore context blocked or failed audio initializations
  }
}

/**
 * Triggers both haptic vibration and sound feedback.
 */
export function triggerFeedback(vibrateDuration = 15) {
  triggerHaptic(vibrateDuration);
  playClickSound();
}
