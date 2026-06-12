'use server';

import { SubjectId } from '@/lib/subjects';
import { generatePrompt, topicToSlug } from '@/lib/prompts';

interface GeneratePromptResult {
  success: boolean;
  slug?: string;
  error?: string;
}

export async function generatePromptAction(
  subjectId: SubjectId,
  topic: string,
  turnstileToken: string
): Promise<GeneratePromptResult> {
  try {
    // 1. Verify Turnstile token
    if (!turnstileToken) {
      return { success: false, error: 'Missing Turnstile token. Please refresh and try again.' };
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      // If secret key is not configured, we might bypass locally, but for production it's mandatory
      console.warn('TURNSTILE_SECRET_KEY is not set. Bypassing check for development.');
    } else {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: turnstileToken,
        }),
      });

      const verifyData = (await verifyRes.json()) as { success?: boolean };
      if (!verifyData.success) {
        return { success: false, error: 'Failed security check. Please try again.' };
      }
    }

    // 2. We don't save to a database right now (V1.0 is ephemeral)
    // We just generate the prompt to ensure it's valid, then return the slug to navigate
    const slug = topicToSlug(topic);
    
    // We do a dry run of prompt generation to catch validation errors (e.g. empty topic)
    generatePrompt(subjectId, topic);

    return { success: true, slug };
  } catch (error: unknown) {
    console.error('generatePromptAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }
}
