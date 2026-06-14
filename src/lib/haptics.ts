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

let sharedCtx: AudioContext | undefined;
let idleTimeout: ReturnType<typeof setTimeout> | undefined;

/**
 * Synthesizes a subtle, satisfying click/tick audio feedback using the Web Audio API.
 */
export function playClickSound() {
  if (!feedbackEnabled || typeof window === 'undefined') return;

  try {
    if (!sharedCtx) {
      const AudioContextClass = window.AudioContext || 
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      sharedCtx = new AudioContextClass();
    }
    
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume();
    }

    const osc = sharedCtx.createOscillator();
    const gain = sharedCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, sharedCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(250, sharedCtx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.04, sharedCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, sharedCtx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(sharedCtx.destination);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

    osc.start();
    osc.stop(sharedCtx.currentTime + 0.06);

    // Close sharedCtx after 10 seconds of inactivity to save battery/resources
    if (idleTimeout) clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
      if (sharedCtx && sharedCtx.state !== 'closed') {
        sharedCtx.close().catch(() => {});
        sharedCtx = undefined;
      }
    }, 10000);
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
