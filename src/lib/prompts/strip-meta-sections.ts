export function stripMetaSections(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n');
  return normalized
    .replace(/> \*\*Library usage:.*\n/, '')
    .replace(/\n?---\n+## CHANGE LOG[\s\S]*?\n---\n/, '\n')
    .replace(/\n---\n+## RECOMMENDED MODEL CONFIGURATION[\s\S]*$/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
