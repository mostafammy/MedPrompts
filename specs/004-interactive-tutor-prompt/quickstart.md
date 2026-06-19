# Quickstart

To test the Socratic Interactive Tutor feature locally:

1. **Seed the database** with an interactive template. You can manually insert a record into `prompt_templates` with `is_interactive = 1` and `variables = ["LANGUAGE", "ANALOGY_DOMAIN"]`.
2. **Run the dev server**: `npm run dev`
3. Navigate to a topic page (e.g., `http://localhost:3000/anatomy/heart`).
4. You should see dropdowns/inputs for Language and Analogy Domain.
5. Select "German" and "Cooking" and click Generate.
6. The resulting prompt will be displayed, and the network tab will show the payload passing `variables: { LANGUAGE: "German", ANALOGY_DOMAIN: "Cooking" }`.
