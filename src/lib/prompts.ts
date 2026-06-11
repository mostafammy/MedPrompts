import { getActiveTemplate } from './prompt-templates';
import { SubjectId } from './subjects';

/**
 * Sanitizes user input to prevent prompt injection and remove invalid characters.
 * Truncates to 120 characters max.
 */
export function sanitizeTopic(topic: string): string {
  // Remove <>{}[] and newlines
  const cleaned = topic.replace(/[<>\{\}\[\]\n\r]/g, ' ').trim();
  
  // Truncate to 120 chars
  return cleaned.slice(0, 120);
}

/**
 * Converts a sanitized topic into a URL-safe slug.
 */
export function topicToSlug(topic: string): string {
  return topic
    .toLowerCase()
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-') // Supports Arabic
    .replace(/^-+|-+$/g, ''); // Trim hyphens
}

/**
 * Generates the full prompt given a subject and topic.
 */
export function generatePrompt(subjectId: SubjectId, topic: string): string {
  const template = getActiveTemplate(subjectId);
  const sanitizedTopic = sanitizeTopic(topic);
  
  if (!sanitizedTopic) {
    throw new Error('Topic cannot be empty after sanitization.');
  }

  return template.template.replace('{{TOPIC}}', sanitizedTopic);
}
