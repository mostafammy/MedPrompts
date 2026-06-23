# Architectural Review — Anatomy Tutor System Prompt, v4.0.0 → v4.1.0

## Scope and approach

This was a revision, not a rewrite. Every existing section, rule, and variable in v4.0.0 survives in v4.1.0 — I added five new sections, quantified one existing mechanism, strengthened one existing section's wording, added one new configuration variable, and consolidated the scattered precedence logic into one place. Nothing was deleted, and no existing default behavior changed except that unconfigured instances now produce noticeably longer, more complete lessons — which is the entire point of the request.

I versioned this **4.1.0**, not 5.0.0. The changelog convention this prompt already uses reserves major-version bumps for architectural redesigns (4.0.0 was "a from-scratch Anatomy Tutor architecture"). This revision adds a thoroughness/enforcement layer on top of an unchanged architecture, which is a minor-version-shaped change even though the new default output is substantially longer.

---

## Why the prompt was "recommendation-shaped" — the actual root cause

Before listing the eight improvements, it's worth naming the underlying pattern, because it explains why I made the choices below rather than other plausible ones.

v4.0.0's core teaching behaviors (location-before-naming, visualization frequency, when an explanation counts as "done") were stated as **descriptions of good practice embedded in prose**, not as **checkable conditions**. "A structure introduced only by name and definition has not actually been taught spatially" is true and well-written, but it's a *diagnosis*, not a *rule with a trigger*. An LLM under instruction-following pressure from a long system prompt will weight a sentence like that below an explicit numbered procedure, especially on weaker models or in later turns of a long conversation where earlier context attenuates. The fix pattern I used throughout is the same one already proven in this prompt's own Retention Artifacts section (which works precisely because it's a numbered, literal-prefix-tagged procedure, not a description) — I extended that same treatment to the other behaviors that were still description-shaped.

---

## Change-by-change reasoning

### 1. Teaching Depth Engine (new section + new variable)

**What changed:** Added `{{TEACHING_DEPTH}}` (Survey / Standard / Comprehensive / Masterclass) with explicit word-count bands, framed as expected ranges rather than quotas, with an explicit precedence statement over generic brevity.

**Why a new variable rather than reusing an existing one:** I considered folding this into `{{CLINICAL_DEPTH}}` or `{{LEARNER_LEVEL}}` to avoid adding a 13th variable, but both already carry a distinct, well-defined job (clinical-tie weight; technical/vocabulary complexity). Overloading either would have created exactly the kind of ambiguous, multi-purpose flag the v4.0.0 changelog says was deliberately avoided when it rejected redundant duplicate flags. A dedicated enum variable, with a neutral default that reproduces something close to prior behavior at Standard, keeps the existing zero-raw-boolean philosophy intact.

**Why ranges, not quotas:** A hard word minimum is gameable by padding and is also the wrong unit — some regions (the cubital fossa) are genuinely smaller than others (the mediastinum) at the same depth of treatment. I anchored the requirement to the *Depth-First Teaching Policy's five outcomes* instead, and treat the word range as a description of what satisfying those outcomes tends to produce. This is the same design move the request itself asked for explicitly ("expected educational depth ranges, not hard quotas").

### 2. Depth-First Teaching Policy (new section)

**What changed:** Five concrete learner-facing outcomes (locate, relate, predict function, predict clinical consequence, reconstruct) that must be reachable before an explanation is "done," plus an explicit instruction against stopping right after a bare definition.

**Why these five, in this order:** They're not new content — they're an extraction and sharpening of what was already implicit across Method Rule 4, Rule 5, and the existing Assessment section. Stating them as one explicit checklist, rather than leaving them distributed across three sections, gives the model (and a human auditor) one place to verify "is this explanation actually finished" — and it gives Assessment a citable upstream cause: reconstruction-based testing only works if the teaching that preceded it was depth-first, so I cross-referenced the two sections to each other rather than leaving the connection implicit.

### 3. Spatial Compliance Check (new section)

**What changed:** Took the single sentence in Method Rule 4 ("every structure gets an address before it gets a name") and unpacked it into an explicit four-step ordering: where it is → what surrounds it → what passes through/over/under it → what the position implies → *then* the name.

**Why this needed its own section instead of just rewriting Rule 4 in place:** Rule 4 already reads well as a principle; expanding it inline would have bloated The Method section, which is meant to stay scannable as a seven-item list. Pulling the operationalized version into its own referenced section keeps The Method as the "what and why" and gives this as the "exact sequence," which mirrors how Mental Rotation Engine already relates to Method Rule 6 — I followed an existing pattern in the prompt rather than inventing a new one.

**An explicit guard I added that wasn't in the request but matters:** a line stating this is "an authoring discipline... not a checklist you recite to the learner or a gate that pauses the lesson." Without that line, a literal-minded model could start producing visible "Step 1: Location. Step 2: Surroundings..." scaffolding in its actual output, which would directly violate the existing "connected paragraphs, never presentation slides" rule and the no-gating rule. I flagged this same risk for the Anatomical Completeness Check and made the same clarification there, and consolidated both into Precedence and Conflict Resolution item 4 so the constraint exists in three places (defense in depth across model families with different attention patterns to a single sentence).

### 4. Mental Rotation Minimum (new subsection of the existing Mental Rotation Engine)

**What changed:** Quantified the existing four archetypes with a density floor (~1 per 500 words at Standard intensity), scaled across the existing `{{VISUALIZATION_INTENSITY}}` settings, with explicit language that this is a self-check density, not a literal word-counter.

**Why I attached it to the existing variable instead of creating a new one:** `{{VISUALIZATION_INTENSITY}}` already existed with three settings (Minimal/Standard/Intense) that were qualitatively described ("only at major transitions" / "frequently") but never quantified. Adding the density numbers to the *existing* variable's definitions, rather than introducing a separate density variable, avoids a second flag doing almost the same job — and it means hosts who'd already configured `{{VISUALIZATION_INTENSITY}}` get the new enforcement automatically, with no migration needed.

**Why "~500 words," specifically:** It's deliberately loose-but-real. Tight enough that a 2,000-word Standard-depth region should contain visualization moments, not zero; loose enough that it doesn't fight the "adaptive and natural, not mechanical" instruction the request explicitly asked for. I added the explicit failure-mode sentence — "a long stretch of pure factual teaching with no spatial-reasoning invitation is a sign the floor was missed" — because a soft density target with no stated failure condition tends to get rounded down to zero under competing pressure from other instructions.

### 5. Anatomical Completeness Check (new section)

**What changed:** A nine-item internal self-audit run before closing a region, mapped explicitly back to specific existing mechanisms in the prompt (Method Rules, Spatial Compliance Check, Memory Engine, Question Frequency, etc.).

**Why this doesn't just duplicate the Depth-First Teaching Policy:** I considered merging the two and rejected it. They operate at different grains and serve different failure modes. The Policy is learner-outcome-shaped ("can the learner reconstruct this") — it's the thing you'd explain to a curriculum designer. The Check is mechanism-shaped ("did I actually use the Memory Engine, did I actually hit the Mental Rotation Minimum") — it's the thing that catches a specific tool being silently skipped even when the learner *could* arguably still reconstruct the region. Keeping both, with the Check explicitly framed as "the operational counterpart" to the Policy, gives two independent failure-catching passes instead of one merged pass that's vulnerable to the same blind spot twice. I made the cross-reference between them explicit in both sections so this isn't read as accidental duplication.

### 6. Retention Artifacts — additive clause (strengthened existing section)

**What changed:** Added an explicit opening paragraph stating retention artifacts never come at the expense of teaching depth, with a concrete example ("if a region genuinely needs 2,500 words... teach all 2,500 words first").

**Why this was a real risk worth naming explicitly:** Once `{{TEACHING_DEPTH}}` enforces longer explanations, a model managing an implicit overall response-length budget could rebalance by quietly shrinking the recap or Recall Cues to "make room," or — worse — by shrinking the *teaching* to leave room for the artifacts it knows it's required to produce. Either failure mode is invisible unless named directly, so I named it directly rather than trusting it to fall out of the other changes.

### 7. Masterclass Mode (new section)

**What changed:** A dedicated section making Masterclass a qualitatively distinct register — senior-professor voice, outward relationship expansion, proactive variant coverage, imaging integration, higher reconstruction and Mental Rotation density, proactive Surgical Corridor reasoning — rather than "Standard with a higher word-count target."

**Why this needed to be a full register change and not just a bigger number:** A model told only "Masterclass = 4,000–8,000 words" has an obvious, low-effort way to satisfy that instruction: repeat the same density of information for longer, padding with restated detail. The request explicitly anticipated this risk with "Masterclass mode should feel noticeably different from Standard mode" — I treated that as the binding constraint and wrote the section around *what kind of content* fills the extra length (outward relationships, named variants, imaging cross-walks, professor-voice editorializing) rather than just authorizing more of it.

### 8. Precedence and Conflict Resolution (new section, consolidating one existing footnote)

**What changed:** Pulled the one inline precedence clarification that already existed in v4.0.0 (Exam Mode's structured rhythm vs. the default no-gating rule, originally a parenthetical in "How The Lesson Actually Flows") into a dedicated section, and added three more resolved tensions that this revision itself introduced:

1. `{{TEACHING_DEPTH}}` vs. generic brevity (new — this is the rule the request explicitly required).
2. The original no-gating-vs.-Exam-Mode footnote (preserved, relocated).
3. `{{TEACHING_DEPTH}}`'s word bands vs. Exam Mode's authentically-short rehearsal turns — **this is a conflict the original eight requested improvements didn't name, and I think it's the most important thing I found during the consistency pass.** Without it, a model with `{{TEACHING_DEPTH}}` = Comprehensive and `{{EXAM_STYLE}}` = Oral-Viva active simultaneously has two correctly-written instructions that are individually fine and jointly nonsensical — "every explanation should run 2,000–4,000 words" against "viva follow-up questions are one sentence." I resolved it by scoping the depth bands to the teaching that wraps rehearsal, not the rehearsal exchanges themselves.
4. Internal checks (Spatial Compliance, Completeness) vs. visible prose — consolidating the guard rails I'd already added in sections 3 and 5 above into one canonical statement, so a model that reads this section once gets all three "don't expose the machinery" warnings together instead of needing to remember three separate ones scattered through the document.

I kept the original footnote's *content* essentially verbatim rather than rewording it — it was already correct — and just gave it a permanent home alongside the new tensions it now has siblings with.

---

## Consistency review (Critical Improvement #8)

Beyond the four-item precedence consolidation above, the specific things I checked for and resolved:

- **The TEACHING_DEPTH / LEARNER_LEVEL ambiguity.** This was the one place I judged the eight requested improvements could most easily produce real model confusion if left unaddressed: both variables sound like they're about "how deep," and a model asked to honor both could easily collapse them into one axis and end up either over-simplifying a Comprehensive-depth lesson for a beginner (losing thoroughness) or over-complicating a Survey-depth lesson for an advanced learner (losing brevity). I added the same one-sentence disambiguation in two places — Teaching Depth Engine and Adaptive Depth — stating it as length/thoroughness vs. complexity/vocabulary, and added a worked example pair (Preclinical-Early at Comprehensive; Advanced at Survey) in both places so the orthogonality is demonstrated, not just asserted.
- **No raw booleans introduced.** TEACHING_DEPTH is a four-value enum with a neutral default (Standard), consistent with the architectural principle the v4.0.0 changelog already states and that the original five-flags-rejected decision was protecting.
- **No new gating introduced.** Every new section (Spatial Compliance Check, Anatomical Completeness Check) was explicitly written as a silent, internal mechanism precisely so it couldn't be read as a new pause-and-confirm point, which would have reintroduced the exact problem v4.0.0's "How The Lesson Actually Flows" was written to eliminate.
- **No contradiction between "additive retention artifacts" and the word-count bands.** Confirmed the bands describe the *teaching*, and the Retention Artifacts section's new clause is explicit that artifacts sit on top of, not inside, that budget — so a Comprehensive-depth region's actual total output is "2,000–4,000 words of teaching, plus the recap and cards," not "2,000–4,000 words total, artifacts included."
- **Numbering and cross-references.** Every new section that references another now does so by name (e.g., "see Spatial Compliance Check, below") rather than by section number, since this is a markdown document without stable numbering — a fragility check worth doing once and then not worrying about again.

---

## Additional improvements beyond the eight requested

These weren't asked for explicitly but came up naturally during the audit. I implemented the first two directly; the rest are flagged as worth considering but not made, since they'd add scope the request didn't ask for.

**Implemented:**
- The orthogonality clarification between `{{TEACHING_DEPTH}}` and `{{LEARNER_LEVEL}}` (described above) — this was a gap, not a request, but leaving it unaddressed would have undermined the entire Teaching Depth Engine the moment both variables were set together.
- Resolving the `{{TEACHING_DEPTH}}`-vs.-Exam-Mode-turn-structure tension (item 3 in Precedence and Conflict Resolution) — same reasoning.

**Flagged, not made — worth your consideration:**
- **Cross-model calibration note.** The word-count bands are stated in prose ("roughly 1,000–2,000 words"); some model families are reliably better at internally tracking approximate output length than others. If you observe a particular host model consistently under- or over-shooting a band in practice, the fix is host-side (a system-level reminder at long intervals, or a soft truncation/continuation mechanism), not a prompt change — I'd avoid trying to solve generation-length calibration purely through more emphatic prompt wording, since that's a known place where added instruction text has diminishing returns across model families.
- **A lightweight QA rubric.** If you want to validate this revision empirically rather than just by re-reading it, a short rubric scoring transcripts against the Anatomical Completeness Check's nine items plus the Mental Rotation Minimum's density would turn this prompt's own internal audit mechanism into an external eval — effectively reusing the Completeness Check as a grading key. I didn't build this since it's a testing harness, not a prompt change, but it falls directly out of work already done here.
- **Optional explicit length self-report.** Some production deployments like a final invisible tag (e.g., a host-only metadata line) confirming which `{{TEACHING_DEPTH}}` band and roughly what word count was produced, for host-side logging/QA. I left this out because it risks leaking into visible output exactly the kind of "machinery exposure" Precedence item 4 is designed to prevent, and because it's a host/product decision rather than a tutoring-prompt decision.

---

## Files delivered

- **`template.md`** — the complete revised v4.1.0 prompt, ready to paste in directly in place of the existing file.
- **`metadata.json`** — updated with the new `TEACHING_DEPTH` variable and a changelog entry describing this revision, in the same schema as the original.
