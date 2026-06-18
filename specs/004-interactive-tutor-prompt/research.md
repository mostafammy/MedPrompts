# Phase 0: Outline & Research

## Unknown 1: Injection Logic for Multi-Variable Support
**Decision**: Use a generalized Regex replacement `replace(/\{\{([A-Z_]+)\}\}/g, ...)` passing an object map of `Record<string, string>`.
**Rationale**: Scales to any number of template variables (e.g. `{{LANGUAGE}}`, `{{ANALOGY_DOMAIN}}`, `{{TOPIC}}`) without hardcoding parsing logic for each. Very fast processing time in V8 engine.
**Alternatives considered**: Writing a custom AST parser or using a heavy templating engine like Handlebars. Rejected because it adds bundle size and is overkill for simple replacements.

## Unknown 2: Evaluator Constraint Bypass
**Decision**: Check an `isInteractive` boolean on the template object in `engine.ts`. If true, bypass the `validateTemplate` strict requirements (headers, word count, disclaimer).
**Rationale**: Allows us to keep strict validation for standard generation prompts while opening up a separate track for agentic/workflow prompts.
**Alternatives considered**: Relaxing the rules for all prompts. Rejected because we want to maintain the structural integrity of the legacy reference prompts.

## Unknown 3: Caching with Multiple Variables
**Decision**: Serialize the variables dictionary into a deterministic JSON string or URL query-string equivalent (e.g. `topic=heart&language=german&analogy=cooking`) and hash it, or simply append it to the cache key slug.
**Rationale**: Ensures distinct outputs for varying combinations of parameters are isolated in the cache.
**Alternatives considered**: Only caching by `subjectId` and `slug`. Rejected because this leads to cross-language cache poisoning.
