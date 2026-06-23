export function stripMetaSections(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n');
  return normalized
    // 1. Remove the change log section and its separators first
    .replace(/\n?---\n+## CHANGE LOG[\s\S]*?\n---\n/, '\n')
    // 2. Remove the title header
    .replace(/^# MEDICAL TUTOR — MASTER PROMPT TEMPLATE[^\n]*\n+/, '')
    .replace(/^# Anatomy Tutor — Production System Prompt[^\n]*\n+/, '')
    .replace(/^# Microbiology Tutor — Production System Prompt[^\n]*\n+/, '')
    // 3. Remove the library usage block
    .replace(/> \*\*Library usage:[\s\S]*?\n+/, '')
    .replace(/\*This file is the complete, deployable template[\s\S]*?\*\s*\n+---\n+/, '')
    // 4. Remove the Subject Adaptation Notes for the generator up to the next horizontal rule separator
    .replace(/\n*### Subject Adaptation Notes[\s\S]*?\n+---\n+/, '\n\n---\n\n')
    // 5. Remove the reference to Subject Adaptation Notes on the Terminology Standard line
    .replace(/ — see \*Subject Adaptation Notes\* below for examples per subject/, '')
    // 6. Remove the recommended model configuration at the end of the file
    .replace(/\n---\n+## RECOMMENDED MODEL CONFIGURATION[\s\S]*$/, '')
    .replace(/\n?---\n+This prompt is complete as written[\s\S]*$/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

