'use client';

class HapticEngine {
  private isSupported(): boolean {
    return typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator;
  }

  public tap() {
    if (this.isSupported()) {
      navigator.vibrate(10); // Light, short tap
    }
  }

  public success() {
    if (this.isSupported()) {
      navigator.vibrate([10, 50, 10]); // Double pulse
    }
  }

  public warning() {
    if (this.isSupported()) {
      navigator.vibrate(50); // Longer single pulse
    }
  }
}

export const haptics = new HapticEngine();
