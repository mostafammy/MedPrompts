export function securityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  const isDev = process.env.NODE_ENV === 'development';
  
  const csp = [
    "default-src 'self'",
    isDev 
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io" 
      : "script-src 'self' https://plausible.io",
    "style-src 'self' 'unsafe-inline'", // Framer Motion updates inline element style attributes on the fly
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    isDev
      ? "connect-src 'self' https://plausible.io ws://* http://*"
      : "connect-src 'self' https://plausible.io"
  ].join('; ');
  
  headers.set('Content-Security-Policy', csp);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
