import { describe, it, expect } from 'vitest';
import { securityHeaders } from '../../src/lib/security/headers';

describe('securityHeaders', () => {
  it('should set all 6 required security headers', () => {
    const original = new Response('OK');
    const secure = securityHeaders(original);
    
    expect(secure.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(secure.headers.get('X-Frame-Options')).toBe('DENY');
    expect(secure.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
    expect(secure.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(secure.headers.get('Permissions-Policy')).toBeTruthy();
    
    const csp = secure.headers.get('Content-Security-Policy') || '';
    expect(csp).toBeTruthy();
    
    const directives = csp.split(';').reduce((acc, dir) => {
      const parts = dir.trim().split(/\s+/);
      const name = parts[0];
      const values = parts.slice(1).join(' ');
      if (name) {
        acc[name] = values;
      }
      return acc;
    }, {} as Record<string, string>);

    expect(directives['script-src']).toBeDefined();
    expect(directives['script-src']).not.toContain('unsafe-inline');
    expect(directives['script-src']).not.toContain('unsafe-eval');
  });
});
