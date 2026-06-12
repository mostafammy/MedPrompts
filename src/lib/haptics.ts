'use client';

let feedbackEnabled = true;

// Initialize from local storage if running in browser
if (typeof window !== 'undefined') {
  try {
    feedbackEnabled = localStorage.getItem('medprompt_feedback_enabled') !== 'false';
  } catch {
    feedbackEnabled = true;
  }
}

/**
 * Gets whether feedback (sound & haptics) is currently enabled.
 */
export function isFeedbackEnabled(): boolean {
  return feedbackEnabled;
}

/**
 * Toggles feedback state and persists in local storage.
 */
export function setFeedbackEnabled(enabled: boolean) {
  feedbackEnabled = enabled;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('medprompt_feedback_enabled', enabled ? 'true' : 'false');
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Triggers a short vibration (haptic feedback) on supported devices.
 */
export function triggerHaptic(duration = 15) {
  if (!feedbackEnabled) return;
  
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch {
      // Ignore security errors
    }
  }
}

/**
 * Synthesizes a subtle, satisfying click/tick audio feedback using the Web Audio API.
 */
export function playClickSound() {
  if (!feedbackEnabled || typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || 
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    // Ignore context blocked
  }
}

/**
 * Triggers both haptic vibration and sound feedback.
 */
export function triggerFeedback(vibrateDuration = 15) {
  triggerHaptic(vibrateDuration);
  playClickSound();
}
