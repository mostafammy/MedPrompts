export type CopyMethod = 'navigator' | 'execCommand' | 'manual';

export type CopyResult = 
  | { ok: true; method: CopyMethod }
  | { ok: false; method: CopyMethod; error: Error };

export async function copyToClipboard(text: string): Promise<CopyResult> {
  // Level 1: navigator.clipboard with 3s timeout
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);
      return { ok: true, method: 'navigator' };
    } catch {
      // Fall through to Level 2
    }
  }

  // Level 2: document.execCommand
  if (typeof document !== 'undefined' && document.queryCommandSupported && document.queryCommandSupported('copy')) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      
      document.body.appendChild(textarea);
      textarea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        return { ok: true, method: 'execCommand' };
      }
    } catch {
      // Fall through to Level 3
    }
  }

  // Level 3: Manual fallback
  return { ok: true, method: 'manual' };
}
