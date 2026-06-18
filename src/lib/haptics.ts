'use client';

class HapticEngine {
  private isSupported(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        typeof window.navigator !== 'undefined' &&
        'vibrate' in window.navigator
      );
    } catch {
      return false;
    }
  }

  public tap() {
    try {
      if (this.isSupported()) {
        window.navigator.vibrate(10); // Light, short tap
      }
    } catch (e) {
      console.warn('Haptics tap failed:', e);
    }
  }

  public success() {
    try {
      if (this.isSupported()) {
        window.navigator.vibrate([10, 50, 10]); // Double pulse
      }
    } catch (e) {
      console.warn('Haptics success failed:', e);
    }
  }

  public warning() {
    try {
      if (this.isSupported()) {
        window.navigator.vibrate(50); // Longer single pulse
      }
    } catch (e) {
      console.warn('Haptics warning failed:', e);
    }
  }
}

export const haptics = new HapticEngine();
