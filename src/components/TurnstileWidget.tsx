'use client';

import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export default function TurnstileWidget({ onVerify, onError, onExpire }: TurnstileWidgetProps) {
  const turnstileRef = useRef<TurnstileInstance>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    // Return a dummy div for local dev if no key is provided
    console.warn('Turnstile is disabled because NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing.');
    return null;
  }

  return (
    <div className="hidden">
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={onVerify}
        onError={onError}
        onExpire={onExpire}
        options={{
          theme: 'auto',
          size: 'invisible', // Ensure it's invisible bot protection
        }}
      />
    </div>
  );
}
