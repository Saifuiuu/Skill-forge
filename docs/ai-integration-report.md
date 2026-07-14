# SkillForge AI Integration Report

This report documents the Anthropic integration used in Phases 7–10: real prompt templates, context handling, per-feature fallbacks, prompt iteration history, and privacy considerations.

All model calls go through `backend/src/ai/ai.service.ts` (`AiService.complete` / `completeJson`). The React client never receives `GROQ_API_KEY`.

**Default model:** `llama-3.3-70b-versatile`  
**Endpoint:** `https://api.groq.com/openai/v1/chat/completions`  
**JSON mode:** every feature uses `completeJson`, which appends: *“Respond with valid JSON only. No markdown fences or extra commentary.”*

---

## Shared infrastructure

### Context management strategy

1. **Server-side assembly only** — Nest services load entities (courses, enrolments, teams, PDF text) and build the user prompt. Prompts never ask the model to invent IDs outside a closed set.
2. **Truncation** — Quiz material is capped at ~15 000 characters of extracted PDF text to stay within practical context windows and latency budgets.
3. **Aggregation over raw PII dumps** — Skill-gap AI receives per-person *counts* (covered / partial / missing), not full quiz answers or certificates.
4. **Catalogue grounding** — Learning-path and skill-gap prompts embed JSON of allowed `courseId`s; results are filtered against that map before return.
5. **Temperature** — default `0.3` for structured, low-variance outputs.
6. **Soft failure** — missing key, `AI_DISABLED`, HTTP errors, empty body, or invalid JSON all return `{ usedFallback: true, reason }` and the feature-specific deterministic path runs.

### Global fallback triggers

| Condition | Behaviour |
|-----------|-----------|
| `AI_DISABLED=true` (or `1`) | No HTTP call; immediate fallback |
| Missing `GROQ_API_KEY` | Immediate fallback |
| Non-2xx GROQ response | Log warn + fallback |
| Empty / non-JSON content | Fallback (`completeJson` parse failure) |

---

## Feature prompts (Phases 7–10)

### 1. Learning path recommender (Phase 7)

**System prompt (verbatim):**

```
You are SkillForge's corporate learning advisor.
Recommend a sequenced learning path using ONLY the course IDs provided in the catalogue.
Rules:
- Return 5 to 8 courses when enough eligible courses exist; fewer only if the catalogue is smaller.
- Respect prerequisite chains: prerequisites must appear before dependent courses.
- Prefer courses not yet completed when they support the career goal.
- Include mandatory courses with upcoming deadlines when relevant.
- Use only courseId values from the provided catalogue.
Output JSON shape:
{
  "summary": "string",
  "totalEstimatedTime": "string e.g. 12 hours over 6 weeks",
  "courses": [
    { "courseId": "uuid", "sequenceOrder": 1, "rationale": "string" }
  ]
}
```

**User prompt template:**

```
Employee context:
- Role: {role}
- Department: {departmentName}
- Career goal: {careerGoal}
- Completion history: {completionHistory}

Available course catalogue (use only these courseId values):
{catalogueJson}
```

`catalogueJson` includes title, description, duration, mandatory flag, deadline, prerequisites, and `alreadyCompleted`.

**Fallback:** deterministic ordering of latest-version courses (mandatory / deadline first). Response `source: 'fallback'`.

---

### 2. Quiz question generator (Phase 8)

**System prompt (verbatim):**

```
You are SkillForge's corporate training quiz author.
Generate assessment questions strictly from the provided course material text.
Rules:
- Produce 8 to 12 questions mixing MCQ and SHORT_ANSWER types.
- Every MCQ must have exactly 4 distinct options in the options array.
- correctAnswer for MCQ must exactly match one option string.
- SHORT_ANSWER questions must omit options or use an empty array.
- Include a concise explanation for each question.
- Do not invent facts not supported by the material.
Output JSON shape:
{
  "questions": [
    {
      "type": "MCQ",
      "text": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B",
      "explanation": "string"
    }
  ]
}
```

**User prompt template:**

```
Course title: {title}
Course description: {description}
Content type: {contentType}

Course material text:
{truncatedExtractedText}
```

**Fallback:** blank manual-entry drafts (`source: 'fallback'`) when AI is disabled/unavailable or validation rejects all generated items.

---

### 3. Skill gap analyst (Phase 9)

**System prompt (verbatim):**

```
You are SkillForge's skill gap analyst for corporate training managers.
You receive a team completion table for a competency framework (required courses).
Rules:
- Use ONLY the provided course IDs.
- Suggest a priorityOrder of courseIds ranked by deadline urgency first, then by how many employees are MISSING the skill.
- Optionally add a short rationale per course explaining team risk.
- Do not invent courses or employees.
Output JSON shape:
{
  "summary": "string",
  "priorityOrder": ["uuid", "..."],
  "teamRationale": [{ "courseId": "uuid", "rationale": "string" }]
}
```

**User prompt template:**

```
Framework: {frameworkName}
Team: {teamName}
Team skill table:
{teamSummaryJson}
Individual snapshot (counts only):
{individualCountsJson}
Default deadline priorityOrder: {fallbackPriorityJson}
```

**Fallback:** deadline-first priority computed in code; AI is an optional enhancement for summary / reordering. Invented course IDs are stripped against the allowed set.

---

### 4. Compliance risk email drafts (Phase 10)

**System prompt (verbatim):**

```
You are SkillForge's compliance communications writer.
Draft a short, professional reminder email for an employee with incomplete mandatory training due soon.
Rules:
- Be clear, polite, and actionable.
- Mention each at-risk course and its deadline.
- Do not invent courses or deadlines.
- Keep body under 220 words.
Output JSON:
{ "subject": "string", "body": "string" }
```

**User prompt template:**

```
Employee name: {fullName}
Employee email: {email}
At-risk mandatory courses due within 14 days:
- {courseTitle} (deadline: …, status: …, progress: …%)
…
```

**Fallback:** static subject/body template listing the same courses. Send remains mock/logged; batches are in-memory.

---

## Prompt-iteration attempts

### Iteration A — Learning path “free-form titles” → grounded IDs

**Attempt 1 (rejected):** Early drafts asked the model to “suggest course titles for this career goal” without a catalogue. Outputs looked fluent but referenced non-existent courses, breaking enrol deep-links.

**Attempt 2 (shipped):** Embed the full catalogue JSON with UUID `courseId`s and instruct *“Use only courseId values from the provided catalogue.”* Post-filter + require enough valid recommendations (≤8, ≥ min(5, catalogue size)) or else algorithmic fallback.

**Rationale:** Grounding prevents hallucinated catalogue entries and keeps recommendations actionable in the live DB.

### Iteration B — Quiz MCQ option drift → strict 4-option contract

**Attempt 1 (rejected):** Soft wording (“include multiple choice options”) produced 3–5 options, or `correctAnswer` strings that did not match any option — unpublishable in the quiz schema.

**Attempt 2 (shipped):** Explicit rules: exactly four distinct options; `correctAnswer` must equal one option string; server-side `isValidDraft` drops non-conforming items; empty result → blank template.

**Rationale:** Schema-aligned prompts plus validation keep Content Admins from publishing broken MCQs while still allowing SHORT_ANSWER mix.

---

## Data privacy implications

SkillForge sends structured training metadata (roles, department names, career goals, course titles/descriptions, completion summaries, and truncated course PDF text) to Anthropic when AI is enabled. Personal identifiers appear in compliance email drafts (employee name and work email) and, in aggregated form, in skill-gap snapshots. No passwords, JWTs, or raw quiz attempt answer sheets are included in prompts. Because third-party LLMs may log or retain inputs per their policy, organisations should treat AI features as optional: set `AI_DISABLED=true` or omit `GROQ_API_KEY` for environments that must keep training records inside the boundary; review Anthropic retention settings; and avoid pasting regulated document text into course PDFs if those documents must not leave the tenant network. Fallbacks preserve product behaviour without an external model round-trip.
