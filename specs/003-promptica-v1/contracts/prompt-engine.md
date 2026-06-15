# Contracts: Prompt Engine

The prompt engine applies SOLID principles via granular, role-based interfaces.

## `TemplateRenderer`
Handles string substitution and validation.
```typescript
export interface TemplateRenderer {
  render(template: string, vars: TemplateVariables): RenderResult;
  extractVariables(template: string): ReadonlyArray<string>;
  validate(template: string): ValidationResult;
}
```

## `TopicNormalizer`
Applies rule-based or AI-based cleaning to user inputs.
```typescript
export interface TopicNormalizer {
  readonly name: string;
  readonly requiresNetwork: boolean;
  normalize(raw: string, context: NormalizerContext): Promise<NormalizationResult>;
  isEnabled(env: NormalizerEnv): boolean;
}
```

## `PromptService`
Orchestrator consuming standard dependencies via Inversion of Control.
```typescript
export interface PromptServiceDeps {
  readonly templateReader: TemplateReader;
  readonly renderer: TemplateRenderer;
  readonly sanitizer: TopicSanitizer;
  readonly slugifier: Slugifier;
  readonly cache: PromptCache;
  readonly logger: Logger;
  readonly analytics: AnalyticsTracker;
}
```
