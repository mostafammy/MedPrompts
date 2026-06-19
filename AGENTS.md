<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/004-interactive-tutor-prompt/plan.md

## Known Good Deployment

Last known working Cloudflare Worker deployment:
- Version ID: `3dcc54d6-f5a7-4735-9cdd-17c11a260adf` (version 14)
- Deployed: 2026-06-17T20:13:24Z
- Git commit: `80a2646` ("fix(homepage): force-dynamic to respect searchParams at runtime")
- Tree state: pre-Suspense re-addition, pre-popstate-refactor, post-getDb-refactor, post-getDb-scheme-normalization

Rollback command: `git checkout 80a2646 -- . && git commit -m "revert: rollback to version 14"`
<!-- SPECKIT END -->

