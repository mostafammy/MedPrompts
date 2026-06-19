# Implementation Plan: Socratic Interactive Tutor Prompts (Exact Runbook)

**Branch**: `004-interactive-tutor-prompt` | **Date**: 2026-06-18 | **Spec**: [spec.md](file:///C:/Users/dell/Documents/MostafaYaser%20Website/medprompts.mostafayaser.earth/specs/004-interactive-tutor-prompt/spec.md)

## 1. Executive Summary

This is the exact, file-by-file technical runbook to transition the prompt engine from a static one-shot `{{TOPIC}}` generator to a multi-variable engine capable of rendering the **Medical Tutor Master Prompt Template (v2.0)**. 

Because generation occurs Server-Side in `src/app/[subject]/[topic]/page.tsx`, we must pass user configurations via URL `searchParams`.

---

## 2. File-by-File Implementation Guide

### Step 1: Database Schema Migration
**File**: `src/lib/db/schema.ts`
We must add metadata columns so the application knows which templates are interactive.

```typescript
// Add these to `promptTemplates` table:
isInteractive: integer('is_interactive', { mode: 'boolean' }).notNull().default(false),
requiredVariables: text('required_variables', { mode: 'json' }).$type<string[]>(),
```
*Run `npx drizzle-kit generate` and `npx drizzle-kit push`.*

### Step 2: Injector Refactor
**File**: `src/lib/prompts/injector.ts`
Currently, `injectTopic` uses `template.split('{{TOPIC}}')`. We rewrite it to accept a dictionary.

```typescript
export function injectVariables(template: string, variables: Record<string, string>): Result<InjectionSuccess, InjectionError> {
  if (template.trim() === '') return err({ code: 'TEMPLATE_EMPTY', message: 'Template cannot be empty' });

  let matchCount = 0;
  const output = template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (variables[key] !== undefined) {
      matchCount++;
      return variables[key];
    }
    return match; // Leave unreplaced if missing
  });

  const characterCount = output.length;
  const wordCount = output.trim().split(/\s+/).filter(Boolean).length;
  return ok({ output, placeholderCount: matchCount, wordCount, characterCount });
}
```

### Step 3: Evaluator Bypass
**File**: `src/lib/prompts/evaluator.ts`
The interactive prompt has no Markdown headers (`##`) or medical disclaimers (`⚠️ Verify`).

```typescript
// Add isInteractive parameter
export function validateTemplate(template: string, isInteractive: boolean = false): Result<void, TemplateValidationError[]> {
  const errors: TemplateValidationError[] = [];
  
  if (!isInteractive) {
    const headerMatches = template.match(/^##\s+/gm) || [];
    if (headerMatches.length < 3) errors.push({ code: 'MISSING_SECTIONS', ... });

    const hasDisclaimer = /⚠️\s*Verify/i.test(template) || /verify/i.test(template);
    if (!hasDisclaimer) errors.push({ code: 'MISSING_DISCLAIMER', ... });
  }

  // Common checks remain:
  const wordCount = template.split(/\s+/).filter(Boolean).length;
  // ...
```

### Step 4: Engine Refactor & Deterministic Caching
**File**: `src/lib/prompts/engine.ts`
Modify `generatePrompt` to accept `variables` and hash them for the cache key.

```typescript
async generatePrompt(subjectId: SubjectId, topic: string, variables: Record<string, string> = {}, env: EngineEnv) {
  // Sort variables to ensure deterministic cache keys
  const sortedVars = Object.keys(variables).sort().map(k => `${k}=${variables[k]}`).join('&');
  const cacheKey = slugifyTopic(`${topic}-${sortedVars}`);

  const cached = await this.promptCache.get(subjectId, cacheKey);
  // ... cache logic ...

  // Pass template.isInteractive to validateTemplate
  const validationResult = validateTemplate(template.template, template.isInteractive);

  // Inject variables instead of injectTopic
  const injectionResult = injectVariables(template.template, {
    TOPIC: safeTopic,
    SUBJECT: subjectId.charAt(0).toUpperCase() + subjectId.slice(1),
    ...variables
  });
  
  // Save using the new cacheKey
  await this.promptCache.set(subjectId, cacheKey, finalPrompt, 2592000);
}
```

### Step 5: Frontend Router Updates
**File**: `src/app/GenerateContainer.tsx`
Add UI controls for the new variables and encode them into the URL as search parameters.

```tsx
const [language, setLanguage] = useState("German");
const [analogy, setAnalogy] = useState("Cooking and Culinary Arts");
const [cycles, setCycles] = useState("2");

const handleGenerate = (topic: string) => {
  if (!subjectId) return;
  const slug = slugifyTopic(topic);
  
  const params = new URLSearchParams();
  params.set('lang', language);
  params.set('analogy', analogy);
  params.set('cycles', cycles);

  startTransition(() => {
    router.push(`/${subjectId}/${slug}?${params.toString()}`);
  });
};
```

### Step 6: Server Component Execution
**File**: `src/app/[subject]/[topic]/page.tsx`
Read the `searchParams` and pass them into the `engine.generatePrompt()` call.

```tsx
interface PageProps {
  params: Promise<{ subject: string; topic: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TopicPage(props: PageProps) {
  const { subject, topic } = await props.params;
  const searchParams = await props.searchParams;

  const variables = {
    OUTPUT_LANGUAGE: (searchParams.lang as string) || 'German',
    ANALOGY_DOMAIN: (searchParams.analogy as string) || 'Cooking and Culinary Arts',
    MAX_REMEDIATION_CYCLES: (searchParams.cycles as string) || '2',
    // We can infer TERMINOLOGY_STANDARD here based on the subject, or pass it directly.
    TERMINOLOGY_STANDARD: getTerminologyForSubject(subject as SubjectId),
  };

  const result = await engine.generatePrompt(subjectId, topicName, variables, env);
  // ... rest of rendering logic ...
}
```

### Step 7: API Route Updates (External Access)
**File**: `src/app/api/generate/route.ts`
Ensure the REST API remains in sync with the core engine updates.

```typescript
const GenerateRequestSchema = z.object({
  subjectId: z.string(),
  topic: z.string(),
  variables: z.record(z.string()).optional(),
});
// Inside POST handler:
const result = await e.generatePrompt(subjectId, topic, parsed.data.variables || {}, env);
```

---

## 3. Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Test-First Principle**: Unit tests for `injector.ts` and `evaluator.ts` must be updated to cover `injectVariables` and `isInteractive = true` scenarios before applying this code.
- **Architectural Check**: Routing variables through `searchParams` correctly respects Next.js Server Components architecture, avoiding unnecessary client-side data fetching.
