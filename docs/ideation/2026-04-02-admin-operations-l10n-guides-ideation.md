---
date: 2026-04-02
topic: admin-operations-l10n-guides
focus: naming, multilingual content, AI-assisted authoring, guide role
---

# Ideation: From "Admin" to an Operations Workspace

## Codebase Context

- The product already has a real `/admin` workspace with `AdminWorkspaceShell`, `AdminHome`, `AdminRoutes`, and `AdminRoutePacks`, so this is not a greenfield "admin panel" discussion anymore.
- Access is still hard-coded around a single boolean: frontend derives `isAdmin` from `user.role === 'Administrator'`, and backend normalizes users to `User` or `Administrator`. There is no capability model yet for a middle role such as guide.
- The content model is richer than the current naming suggests: routes already contain ordered waypoints, packs already encode editorial route choice, and points already carry `guideText`, `guideAudioUrl`, and `facts`.
- Public UX already consumes packs and a so-called `AIAssistant`, but the current assistant is not generative AI: it only reads stored facts from `GET /points/:id/ask`. This means AI-flavored UI is culturally acceptable in the product, but a real generation pipeline does not exist yet.
- There is no meaningful i18n layer yet. The repo shows only isolated locale usage, while routes, packs, point descriptions, and guide materials are all effectively single-language content.
- The strongest leverage points are therefore: the existing admin shell, the route/pack editorial model, point-level guide content, and the fact that role, translation, and AI can all attach to already-existing entities rather than requiring a new product surface from scratch.

## Ranked Ideas

### 1. Role-Based Operations Workspace
**Description:** Stop calling the area "админка" in product language and reposition it as a role-based operational workspace. The current admin shell becomes the umbrella workspace for content operations, and then splits into clearly named role experiences such as `Редакционная студия` for curators/admins and `Кабинет экскурсовода` for guides.
**Rationale:** The current codebase already behaves like a workspace, not a settings panel. Keeping the "admin" framing makes the product feel back-office and blocks cleaner role expansion. A stricter name also solves the guide-role problem because guides should not feel like they are entering an admin-only tool.
**Downsides:** A rename by itself is cosmetic if permissions, navigation, and role boundaries stay unchanged. The idea only pays off if UI copy and access model evolve together.
**Confidence:** 96%
**Complexity:** Low
**Status:** Unexplored

### 2. AI Draft Studio for Routes, Packs, and Waypoints
**Description:** Add a draft-only AI workflow inside the workspace where a curator can start from a short brief, list of places, or rough notes and get a first-pass route skeleton: route title, description, ordered waypoints, draft guide text, pack framing, and suggested tags/themes.
**Rationale:** Today route creation is manual form work, while the data model already expects a lot of structured narrative content. AI is most valuable here not as a chatbot, but as a constrained drafting assistant that reduces blank-page work and accelerates first versions.
**Downsides:** If positioned as "generate and publish", this becomes dangerous fast: hallucinated facts, weak geography, repetitive copy, and inconsistent tone. It must be draft-only with explicit human review.
**Confidence:** 93%
**Complexity:** Medium
**Status:** Unexplored

### 3. RU/EN Content Layer with Human Review
**Description:** Introduce a bilingual content model for the most tourist-facing fields first: route name/description, pack promise/notes, point descriptions, `guideText`, and UI labels. Start with Russian plus English, with per-field translation status and a clear fallback to Russian when English is missing.
**Rationale:** "Add a foreign language for tourists" is strongest when attached to existing content entities rather than treated as a generic site-wide locale switch. The real value is not the language toggle itself, but making routes, packs, and guide narratives legible to visitors.
**Downsides:** Full multilingual support everywhere is too expensive too early. Without workflow support, translators and editors will drown in drift between source and translated versions.
**Confidence:** 92%
**Complexity:** High
**Status:** Unexplored

### 4. Guide Workspace
**Description:** Add a dedicated guide role that can use the app operationally without full editing power. The guide workspace would focus on running tours, not authoring content: access to assigned or published packs, point scripts, timing cues, meeting-point notes, route switching, practical notes, and tourist-facing share links.
**Rationale:** The existing product already has the ingredients for guided use: route packs, alternative routes, map previews, and point-level guide text. A guide role becomes valuable when it turns curated content into a live tour companion instead of just being "admin lite".
**Downsides:** "Guide role" is vague unless it is anchored to a concrete business job. If you only add a role flag without a dedicated workflow, it will feel like a permissions checkbox with no product value.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Explored on 2026-04-02 via `docs/brainstorms/2026-04-02-guide-workspace-requirements.md`

### 5. Readiness Pipeline for Content, Translation, and Guides
**Description:** Add operational statuses and readiness checks around content, such as `draft`, `needs review`, `ready for translation`, `ready for guide`, `published`, plus issue chips that show why an item is not ready. The same pipeline can surface missing English copy, missing guide notes, pack validation issues, and broken dependencies.
**Rationale:** This is the connective tissue between the other ideas. Once roles, AI drafting, and bilingual content exist, the workspace needs a way to tell the team what is actually ready for tourists and what still needs editorial work.
**Downsides:** Status systems easily become bureaucracy theater if they are not backed by useful checks and clear next actions.
**Confidence:** 88%
**Complexity:** Medium
**Status:** Unexplored

### 6. Source Import and Bulk Editing
**Description:** Before betting everything on generative AI, add a pragmatic ingestion layer: import route drafts from spreadsheets, docs, or structured JSON and run normalization in bulk. From there, AI can help clean, enrich, and rewrite imported material instead of generating from nothing.
**Rationale:** This is a lower-risk answer to "don't add routes manually". In real operations, teams often already have source material in docs, tables, or notes. Bulk import creates immediate speedups and also gives AI better raw material to work with.
**Downsides:** Less flashy than "AI creates routes for me", and import quality depends on how disciplined source materials are.
**Confidence:** 87%
**Complexity:** Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Keep the name `Админка` and just polish the UI | Too shallow; it does not solve role expansion or product positioning. |
| 2 | Give guides the same access as admins | High accidental-edit risk and no role-specific value. |
| 3 | One-click AI autopublish | Too risky for factual, route, and tourist content. |
| 4 | Add many languages at once | Too expensive relative to current maturity; RU/EN is the grounded first step. |
| 5 | Build a freelancer marketplace for guides | Not grounded in the current repo or current product model. |
| 6 | Add a generic chatbot inside the workspace | Vague and weaker than constrained drafting/import workflows. |
| 7 | Rebuild the whole editor architecture before adding roles or AI | Over-scoped; the current shell and entities already provide enough leverage. |

## Session Log

- 2026-04-02: Initial ideation for naming, multilingual content, AI-assisted authoring, and guide role - 13 candidates considered, 6 survivors kept.
- 2026-04-02: Selected "Guide Workspace" for brainstorming and requirements capture.
