# Data Model Updates

## SQLite / Drizzle ORM Modifications

We need to update the `prompt_templates` table in `src/lib/db/schema.ts` to track metadata for interactive prompts.

### Table: `prompt_templates`
**Additions**:
- `is_interactive`: `integer` (boolean), default `false`. Used by `evaluator.ts` to bypass strict validation.
- `required_variables`: `text` (JSON array of objects). Structured definitions of variables, e.g., using `TemplateVariableDefinition[]`. This informs the frontend `GenerateContainer` which inputs to render.

```typescript
export const promptTemplates = sqliteTable('prompt_templates', {
  // ... existing fields ...
  isInteractive: integer('is_interactive', { mode: 'boolean' }).notNull().default(false),
  requiredVariables: text('required_variables', { mode: 'json' })
    .$type<TemplateVariableDefinition[]>()
    .notNull()
    .$defaultFn(() => []),
});
```
