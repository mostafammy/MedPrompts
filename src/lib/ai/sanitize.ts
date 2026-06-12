export function sanitizeTopic(topic: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!topic || typeof topic !== 'string') {
    return { isValid: false, error: 'Topic must be a valid string' };
  }

  const trimmed = topic.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Topic cannot be empty' };
  }
  
  if (trimmed.length > 200) {
    return { isValid: false, error: 'Topic must be under 200 characters' };
  }

  // Reject script tags, HTML tags, and typical injection symbols
  const injectionPattern = /[<>{}\[\]\\]/g;
  if (injectionPattern.test(trimmed)) {
    return { isValid: false, error: 'Topic contains invalid characters' };
  }

  // Filter out any bizarre characters, keeping alphanumeric and common punctuation
  const sanitized = trimmed.replace(/[^\w\s.,?!'-]/g, '');

  return { isValid: true, sanitized };
}
