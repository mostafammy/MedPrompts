/**
 * Clipboard fallback engine to support all browser contexts.
 * 
 * Strategy:
 * 1. navigator.clipboard.writeText (Modern, requires Secure Context)
 * 2. document.execCommand('copy') (Legacy fallback)
 * 3. Textarea selection (Manual fallback)
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  // Level 1: Modern Async Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('Clipboard API failed, falling back to execCommand', e);
      // Fall through to level 2
    }
  }

  // Level 2: Legacy execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Move off-screen to avoid scroll jumps
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) return true;
  } catch (e) {
    console.warn('execCommand failed', e);
    // Fall through to level 3
  }

  // Level 3: Failure, handled by UI (e.g., showing a textarea)
  return false;
}
