/**
 * Attempts to deep link into target LLM apps.
 * 
 * Target approaches:
 * - ChatGPT: `chatgpt://` scheme. If installed, opens app. If not, nothing happens (we just rely on the fallback timeout).
 * - Gemini: `googleapp://` or web intent. (Currently Gemini has limited direct deep linking on some platforms, 
 *   so falling back to web is common, but we try the scheme if available).
 */

export type LLMApp = 'chatgpt' | 'gemini';

export function openLLMApp(app: LLMApp, promptText?: string) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  let urlScheme = '';
  let fallbackUrl = '';

  if (app === 'chatgpt') {
    urlScheme = 'chatgpt://';
    fallbackUrl = promptText
      ? `https://chatgpt.com/?q=${encodeURIComponent(promptText)}`
      : 'https://chatgpt.com';
  } else if (app === 'gemini') {
    urlScheme = 'googleapp://'; // Generic Google app, but Gemini web is preferred due to scheme instability
    fallbackUrl = promptText
      ? `https://gemini.google.com/app?q=${encodeURIComponent(promptText)}`
      : 'https://gemini.google.com/app';
  }

  // Try the deep link first
  if (urlScheme && (isIOS || isAndroid)) {
    // We create a hidden iframe to try and launch the scheme
    // This avoids leaving the current page if it fails
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = urlScheme;
    document.body.appendChild(iframe);

    // If it doesn't open within 1.5s, it probably failed
    setTimeout(() => {
      document.body.removeChild(iframe);
      // Optional: we can choose NOT to navigate to the web version to avoid losing state,
      // as the user already has it on their clipboard. The requirements state: 
      // "silent fail if not installed", so we just do nothing here.
      // If we wanted to fallback to web, we would check `Date.now() - start < 2000`.
    }, 1500);
  } else {
    // If desktop or no scheme, just open the web version in a new tab
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank');
    }
  }
}
