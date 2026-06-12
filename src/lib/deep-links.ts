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
  if (typeof window === 'undefined') return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh/.test(navigator.userAgent));
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

  // Handle Android deep linking using the official Intent scheme
  if (isAndroid) {
    let intentUrl = '';
    if (app === 'chatgpt') {
      intentUrl = `intent://#Intent;scheme=chatgpt;package=com.openai.chatgpt;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end;`;
    } else if (app === 'gemini') {
      intentUrl = `intent://#Intent;scheme=googleapp;package=com.google.android.apps.bard;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end;`;
    }
    
    if (intentUrl) {
      window.location.href = intentUrl;
    }
  } 
  // Handle iOS deep linking using custom URL scheme + fallback timer
  else if (isIOS && urlScheme) {
    const start = Date.now();
    window.location.href = urlScheme;

    // Fallback to web version in the same window if the app isn't installed
    setTimeout(() => {
      if (Date.now() - start < 2000) {
        window.location.href = fallbackUrl;
      }
    }, 1500);
  } 
  // Desktop fallback (open web version in a new tab)
  else {
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank');
    }
  }
}
