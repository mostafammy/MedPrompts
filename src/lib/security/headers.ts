export function securityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  const csp = [
    "default-src 'self'",
    "script-src 'self'", // no unsafe-eval
    "style-src 'self'", // no unsafe-inline
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://plausible.io"
  ].join('; ');
  
  headers.set('Content-Security-Policy', csp);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
