# Unified Contact Intelligence Platform  
## PRD v1.2 + Implementation Design + Ultra-Granular Execution Plan (Test-Gated)

**Owner:** Product + Platform Architecture  
**Audience:** Engineering (Backend/Data/Infra), Security/Privacy, SRE, Product, UX  
**Status:** Draft v1.2  
**Key additions in v1.2:**  
- **Analyzer Transparency Screen** (user-facing)  
- **Entity Resolution is Link-first, Merge-later (User-confirmed)**  
- **Connection Graph explicitly excludes ER suggestion edges from relationship strength queries**  

---

# PART A — PRD (Updated)

## 1) Executive Summary

We will build an event-driven system that ingests contact-related data from multiple sources (LinkedIn, email, WhatsApp, photos, calendars, imports, etc.) into an immutable event log. Modular, asynchronous, versioned analyzers process events to:

1) Improve attribute accuracy (normalization, confidence scoring, provenance, conflict resolution)  
2) Perform **probabilistic entity resolution** as a **two-stage** workflow:
   - **Stage A:** create “probable duplicate” links (**ERSuggestions**) that users confirm/deny  
   - **Stage B:** merge only after confirmation (idempotent, explainable)  
3) Detect and continuously update typed connections between contacts (graph edges) with strength scoring + decay + explainability  
4) Provide a user-facing **Analyzer Transparency Screen** describing what analysis runs on user data, which sources and scopes are used (metadata vs content), what outputs are produced, and how to inspect explanations

Outputs:
- **Unified Identity Store**: canonical identities with field-level provenance and confidence  
- **ER Store**: clusters, suggestions, decisions (confirm/deny), merges, lineage, explanations  
- **Connection Graph Store**: typed relationship edges with strength, decay, saturation, explanations  
- **Analyzer Registry + Transparency UI**: authoritative catalog of analyzers + data usage and controls  

---

## 2) Problem Statement

Users accumulate fragmented contacts across platforms with inconsistent, stale, and conflicting attributes and duplicates. Relationships are implicit in communication and social/work context and are rarely explainable. Users also need clarity about what analysis is performed on their data and which inputs are used.

We need a system that:
- ingests heterogeneous events and stores them durably,
- improves data accuracy with provenance and confidence,
- resolves identities probabilistically with explainable outcomes,
- detects multi-signal relationships with strength scoring and decay,
- supports retroactive reprocessing when analyzers evolve,
- and provides transparent user-facing disclosures and controls.

---

## 3) Goals & Non-Goals

### Goals
- **G1:** Unified identities across sources, with field-level provenance and confidence.  
- **G2:** ER via probabilistic matching with **Link-first** suggestions; merge requires confirmation.  
- **G3:** Typed relationship graph with strength scoring, decay, saturation, and explainability.  
- **G4:** Immutable replayable event log; analyzers are versioned and backfillable.  
- **G5:** Modular pluggable analyzers; idempotent processing; real-time and batch replay.  
- **G6:** Analyzer Transparency Screen: users understand what analysis runs, inputs used, outputs written, and how to inspect “why merged/why connected/why canonical”.

### Non-Goals
- Full CRM UI beyond transparency and explain drilldowns.  
- Guaranteed perfect ER; target measurable accuracy + safe defaults + correction workflows.  
- Automated outreach/messaging.  
- Unrestricted biometric processing; photo analysis is explicitly gated by privacy mode and policy.

---

## 4) Definitions & Terminology

### 4.1 Identity Concepts
- **Raw Contact:** source-specific representation (LinkedIn profile record, address book entry, WhatsApp participant).  
- **Identity (Canonical Person):** unified representation used for contact viewing and graph nodes.  
- **Cluster:** ER-layer grouping of raw contacts believed to represent the same person; stores lineage and confidence.

### 4.2 Field Confidence vs Connection Strength vs Match Probability
- **Field Confidence (0..1):** probability that a given **field value** is correct for an identity.  
- **Connection Strength (0..100):** ranked strength score of a **relationship edge** between two identities (not a probability).  
- **Match Probability (p_same, 0..1):** probability that two identities are the same person (used only for ER suggestion links).

UI terminology must map exactly:
- “Confidence” → identity field values  
- “Strength” → relationship edges  
- “Match probability” → possible duplicates (ER suggestions)  

---

## 5) Users & User Stories

### Users
- End users (knowledge workers)  
- Internal consumers (ranking/recommendations)  
- Admins/compliance  

### Stories
1) Import from LinkedIn + email yields one unified identity (after confirmation if needed).  
2) User can see why two records were suggested as duplicates.  
3) User can confirm/deny duplicate suggestions.  
4) User can see why two people are connected and how the score is computed.  
5) Engineer can add a new analyzer and backfill historical events safely.  
6) User can open Analyzer Transparency Screen and understand analysis done on their data and its scope.  

---

## 6) Functional Requirements

### 6.1 Event Ingestion Layer
**Event examples:** `ContactAdded`, `ContactUpdated`, `EmailIngested`, `LinkedInInteraction`, `WhatsAppMessageThreadUpdated`, `PhotoUploaded`, `CalendarEventIngested`, feedback events.

**Core requirements**
- Events appended to immutable event log before derived processing.  
- At-least-once ingestion; downstream idempotent processing.  
- Schema versioned; payload hash stored.  

**Data scope tags**
- Every event includes:
  - `content_present: bool`
  - `content_scope: "none" | "headers_only" | "full_body" | "attachments_metadata" | "image_pixels" | "face_embeddings"`
  - `pii_classes: [ ... ]` (e.g., `["email","phone","name","message_body"]`)

---

### 6.2 Data Accuracy Layer
**Normalization:** names, emails, phones (E.164), companies, titles, locations; deterministic and versioned.  
**Field confidence:** per value per field (0..1), using source weights, validation, recency, agreement, user confirmation.  
**Conflict resolution:** keep top-k values; canonical chosen above threshold; provenance retained for all.

**Explainability**
- Canonical field changes emit “why canonical” explanation object with evidence refs and scoring inputs.

---

### 6.3 Entity Resolution (ER) — Link-first, Merge-later

#### 6.3.1 Stage A: ER Suggestion Link (“Possible Duplicate”)
The system computes `p_same` for candidate pairs and creates **ERSuggestions** rather than merging immediately.

**ERSuggestion properties**
- Typed link: `IdentityResolution.SameEntityCandidate`  
- State: `PENDING | CONFIRMED | DENIED`  
- Score: `p_same ∈ [0,1]` (+ optional UX score 0..100)  
- Explainable: top features + evidence refs + model version + thresholds  
- Idempotent: deterministic `suggestion_id`  

**Suppression**
- Denial creates a durable **negative constraint** preventing resuggestion for that exact pair unless policy permits resuggestion after material evidence change.

**Events**
- `ERSuggestionCreated`, `ERSuggestionUpdated`, `ERSuggestionConfirmed`, `ERSuggestionDenied`, `EntityMergeRequested`

#### 6.3.2 Stage B: Merge on Confirmation
Only `CONFIRMED` suggestions trigger merge:
- Merge worker verifies suggestion state is CONFIRMED.  
- Performs cluster merge idempotently, writes lineage, emits `EntityMerged`, stores merge explanation.  
- Pending/denied suggestions never merge.

#### 6.3.3 Separation Constraint
- ER suggestions are not relationship edges and must never influence relationship strength ranking.  
- Connection detection is not used to perform merges (avoid feedback loops).

---

### 6.4 Connection Detection and Relationship Graph (Explicit ER Exclusion)

#### 6.4.1 Relationship Graph Overview
Relationship graph stores **real-world connections** between canonical identities:
- Professional, Social, Communication, Contextual, Behavioral  
- Typed edges with:
  - strength score (0..100)
  - decay model and saturation
  - explainability (top reasons + evidence refs)
  - privacy scope annotations (metadata vs content)

#### 6.4.2 Explicit Exclusion of ER Suggestion Edges
**Hard requirement**
- ER suggestions **must not** appear in relationship queries or relationship strength computation.

**Storage approach**
- **Recommended:** ER suggestions stored in ER Store (`er_suggestions`) entirely separate from `graph_store.edges`.  
- If stored in graph store, they MUST be namespaced:
  - `edge_namespace = "relationship" | "er"`  
  - Relationship queries default to `edge_namespace="relationship"` only.

**Query semantics**
- Relationship ranking uses only relationship edges:
  - `S_pair_relationship = 100 * (1 - Π_{type in relationship_edges} (1 - S_type/100))`
- ER suggestions accessed only via ER endpoints:
  - `/v1/er/suggestions...`

**Scoring guardrails**
- Scoring/decay jobs ignore anything not in relationship namespace.
- Attempt to compute relationship strength for ER links is a bug (log + metric).

#### 6.4.3 UI Distinction: “Connections” vs “Possible Duplicates”
On identity/contact pages:
1) **Connections (Real-world relationships)**  
   - Shows Professional/Social/Communication/Contextual/Behavioral edges  
   - Displays **Strength (0..100)** and “Why connected”
2) **Possible Duplicates (Identity Resolution)**  
   - Shows ER suggestions with **Match probability (0..1 or %)**  
   - Displays “Why suggested” + Confirm/Deny actions

ER suggestions must never appear in the Connections panel.

---

## 7) Analyzer Transparency Screen (User-facing)

### 7.1 Purpose
Users can see:
- every async analyzer that may run,
- what it does (plain + technical),
- which events/fields it reads,
- what it writes (fields/decisions/edges/signals),
- whether it uses content vs metadata,
- whether it runs in streaming, replay, or both,
- retention/provenance notes and explainability links,
- toggles (if policy allows).

### 7.2 Information Architecture
Sections:
1) Accuracy & Normalization  
2) Identity Resolution (Suggestions + Merges)  
3) Connections (by domain)  
4) Scoring & Decay  
5) Privacy & Redaction  

Filters:
- Source: Email / LinkedIn / WhatsApp / Photos / Calendar / Imports  
- Category: Accuracy / ER / Connections / Behavioral / Scoring / Privacy  
- Data scope: Metadata-only vs Content-inspecting  
- Status: Enabled/Disabled/Unavailable (privacy mode)

### 7.3 Example Analyzer Rows
| Analyzer | Category | Sources | Data Scope | Outputs | Runs |
|---|---|---|---|---|---|
| Email Header Relationship Analyzer | Connections→Communication | Email | Metadata-only | edges + signals | Stream+Replay |
| ER Pairwise Matcher v3 | Identity Resolution | All | Metadata-only | ERSuggestions + explanations | Stream+Replay |
| Merge Worker | Identity Resolution | ER | Metadata-only | cluster merges + lineage | Stream+Replay |
| Email Body Mention Analyzer | Connections→Contextual | Email | Content | mention signals | Stream+Replay (gated) |

### 7.4 Explainability in UI
- “Why merged” (merge decision)  
- “Why suggested” (duplicate suggestion)  
- “Why connected” (relationship edge)  
- “Why canonical” (field selection)

---

## 8) Non-Functional Requirements (Selected)
- Analyzer registry / transparency list p95 < 300ms.  
- Toggle changes propagate to runtime within 60s.  
- Event log retention supports backfill SLAs; derived stores are eventually consistent with idempotent convergence.  
- Privacy: metadata-only default; content analyzers gated; explanations never leak raw content by default.

---

# PART B — Implementation Design (Execution-Oriented)

## 1) Architecture Overview

### Components
1) Connectors → produce events  
2) Event Log + Schema Registry  
3) Analyzer Runtime (stream + replay)  
4) Derived Stores:
   - Unified Identity Store
   - ER Store (clusters, suggestions, decisions, merges, lineage)
   - Graph Store (relationship edges, signal aggregates, explanations)
   - Explainability Store (why suggested/merged/connected/canonical)
5) Backfill Orchestrator  
6) Analyzer Registry Service  
7) Transparency UI  
8) Audit/Compliance (redaction, access control, deletion)

### Boundaries
- ER and relationship graph are logically distinct:
  - ER produces suggestions and merges.
  - Graph produces real-world relationships and strength scores.
  - No ER links in relationship strength queries.

---

## 2) Data Flows

### Ingestion → Log → Analyzers → Stores
- Connectors emit domain events to log.
- Streaming analyzers consume events and upsert derived facts.
- Replay workers process historical events for backfills.

### Registry → UI
- Analyzer Registry stores authoritative metadata and toggle policy.
- UI queries registry list/details and renders data scope, outputs, examples.

### Replay/Backfill
- Backfill job pins analyzer version, range, partitions, checkpoints.
- Replay produces deterministic upserts; does not create merges unless triggered via user confirmation.

---

## 3) Analyzer Registry Schema (JSON Example)

```json
{
  "analyzer_id": "er.matcher.v3",
  "display_name": "Duplicate Suggestion Matcher",
  "category": "identity_resolution",
  "version": "3.0.1",
  "runs": ["streaming", "replay"],
  "reads": {
    "event_types": ["ContactAdded", "ContactUpdated", "LinkedInProfileSynced"],
    "field_classes": ["name", "email", "phone", "linkedin_id", "company"],
    "content_scope_required": "none"
  },
  "writes": {
    "stores": ["er_store.er_suggestions", "er_store.er_suggestion_explanations"],
    "derived_events": ["ERSuggestionCreated"]
  },
  "privacy": {
    "uses_content": false,
    "supported_privacy_modes": ["metadata_only", "content_enabled"]
  },
  "er_behavior": {
    "link_first": true,
    "merge_requires_confirmation": true
  },
  "idempotency": {
    "id_strategy": "deterministic_suggestion_id",
    "idempotency_key_spec": "hash(event_id, analyzer_id, suggestion_id)"
  }
}
```

---

## 4) APIs (Key)

### Registry
- `GET /v1/analyzers`
- `GET /v1/analyzers/{id}`
- `PUT /v1/tenants/{tenant_id}/analyzers/{id}:setEnabled`

### ER
- `GET /v1/er/suggestions?state=pending...`
- `GET /v1/er/suggestions/{id}:explain`
- `POST /v1/er/suggestions/{id}:confirm`
- `POST /v1/er/suggestions/{id}:deny`

### Explainability
- `GET /v1/graph/edges/{edge_id}:explain`
- `GET /v1/identities/{id}/fields/{field}:explain`
- `GET /v1/er/decisions/{decision_id}:explain` (merge-level)

---

## 5) Storage Design (Selected)

### ER Store
- `er_suggestions(suggestion_id, tenant_id, entity_a, entity_b, p_same, state, model_version, explanation_id, updated_at)`
- `er_negative_constraints(tenant_id, entity_a, entity_b, denied_at, reason)`
- `clusters`, `cluster_members`, `er_lineage`, `er_merge_explanations`

### Graph Store (Relationships only)
- `edges(edge_id, tenant_id, a_entity_id, b_entity_id, edge_type, strength, last_signal_at, suppressed, decay_params, explanation_id)`
- `edge_signal_aggregate(edge_id, signal_kind, bucket, count, last_seen_at, evidence_sample_refs[])`

**No ER suggestions in relationship edges.**

---

## 6) Scoring + Decay

**Relationship edge strength**
- computed from signal aggregates with half-life decay and saturation
- ER suggestions have `p_same` and are not part of strength scoring.

---

## 7) Explainability Objects

### “Why suggested” (ERSuggestion)
- `p_same`, top features, evidence refs, model version, thresholds

### “Why merged” (Merge)
- merge execution details + references to the confirmed suggestion/explanation

### “Why connected” (Relationship edge)
- base strength, contributions, decay factors, evidence samples, content scope flag

---

## 8) Security/Privacy
- Default metadata-only; content analyzers gated.
- Explain endpoints redact raw content unless permitted.
- Deletion: tombstone overlays and/or cryptographic erasure strategy.

---

# PART C — Ultra-Granular Staged Execution Plan (Test-Gated)

**Rule:** Each implementation stage is followed by (1) Test Stage and (2) Gate Stage requiring 100% tests passing.

## Stage 1 — Analyzer Registry DB Schema
**Objective:** Persist analyzer definitions and toggles.  
**Tasks:** Create `analyzer_versions`, `analyzers_current`, `analyzer_toggle_state`.  
**Acceptance:** Insert/query versions, toggle state.  
**Risks:** JSON schema evolution.

**Tests**
- `test_migration_applies_cleanly()`
- `test_unique_constraint_analyzer_id_version()`
- `test_toggle_state_persistence_roundtrip()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 2 — AnalyzerDefinition JSON Schema Validator
**Objective:** Validate registry payloads.  
**Tasks:** JSON schema + enum checks + error messages.  
**Acceptance:** invalid entries rejected.

**Tests**
- `test_analyzer_definition_missing_required_field_rejected()`
- `test_analyzer_definition_invalid_enum_rejected()`
- `test_analyzer_definition_valid_passes()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 3 — Registry Admin Publish API
**Objective:** Publish analyzer versions.  
**Tasks:** `POST /v1/admin/analyzers/{id}/versions`, set current pointer, audit log.  
**Acceptance:** publish+set current works.

**Tests**
- `test_publish_analyzer_version_persists()`
- `test_publish_rejects_invalid_schema()`
- `test_set_current_version_updates_pointer()`
- `test_admin_auth_required_for_publish()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 4 — Registry Read APIs (List/Detail + Effective State)
**Objective:** UI can read analyzers with privacy gating.  
**Tasks:** `GET /v1/analyzers`, `GET /v1/analyzers/{id}`, effective enablement.  
**Acceptance:** filters and gating correct.

**Tests**
- `test_get_analyzers_list_filters_by_category()`
- `test_get_analyzers_list_filters_by_source()`
- `test_privacy_mode_metadata_only_hides_content_analyzers()`
- `test_get_analyzer_detail_returns_effective_state()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 5 — Tenant Toggle API
**Objective:** Enable/disable analyzers (policy-permitted).  
**Tasks:** `PUT ...:setEnabled`, enforce allowed toggles, persist state.  
**Acceptance:** effective state updates within 60s.

**Tests**
- `test_toggle_denied_when_not_allowed()`
- `test_toggle_requires_tenant_admin_role()`
- `test_toggle_affects_effective_state()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 6 — Transparency UI Skeleton
**Objective:** UI page with tabs/filters exists.  
**Tasks:** route + tabs + filters.  
**Acceptance:** renders, filters update.

**Tests**
- `test_ui_transparency_page_renders()`
- `test_ui_filters_update_state()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 7 — Transparency UI List Wired to Registry
**Objective:** UI shows analyzer list from API.  
**Tasks:** fetch list + render + apply filters.  
**Acceptance:** filters match API.

**Tests**
- `test_ui_fetches_analyzer_list_success()`
- `test_ui_filter_by_source_applies_query_params()`
- `test_ui_filter_by_data_scope_filters_results()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 8 — Transparency UI Analyzer Detail Panel
**Objective:** UI shows inputs/outputs/privacy/explanations.  
**Tasks:** fetch detail + render sections + badges.  
**Acceptance:** no missing required sections.

**Tests**
- `test_ui_analyzer_detail_renders_required_sections()`
- `test_ui_analyzer_detail_handles_unknown_fields_gracefully()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 9 — Runtime Toggle & Privacy Enforcement Hook
**Objective:** analyzers skip when disabled or privacy-incompatible.  
**Tasks:** cached registry client; gating checks.  
**Acceptance:** disabled analyzers do no writes.

**Tests**
- `test_runtime_skips_processing_when_analyzer_disabled()`
- `test_runtime_blocks_content_analyzer_in_metadata_only_mode()`
- `test_registry_client_cache_refreshes()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 10 — ER Suggestion DB Schema
**Objective:** persist ER suggestions + negative constraints.  
**Tasks:** tables + indexes + enums.  
**Acceptance:** can store PENDING and DENIED.

**Tests**
- `test_migration_creates_er_suggestions_table()`
- `test_er_suggestion_pair_unique_canonical_ordering_enforced()`
- `test_negative_constraint_unique_per_pair()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 11 — Deterministic Suggestion ID Utility
**Objective:** idempotent suggestion creation across replay/streaming.  
**Tasks:** canonical ordering + suggestion hash ID.  
**Acceptance:** stable and commutative.

**Tests**
- `test_er_suggestion_id_deterministic()`
- `test_er_suggestion_id_commutative_for_pair_order()`
- `test_negative_constraint_lookup_blocks_pair()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 12 — ER Suggestion Explainability Store + Schema
**Objective:** store “why suggested” objects.  
**Tasks:** explanation table + schema validation + redaction checks.  
**Acceptance:** stored explanations retrievable.

**Tests**
- `test_store_fetch_er_suggestion_explanation_roundtrip()`
- `test_er_suggestion_explanation_rejects_raw_content_fields()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 13 — ER Candidate Generation + Suggestion Creation (No Merge)
**Objective:** produce PENDING suggestions from evidence.  
**Tasks:** blocking, scoring (rules-first ok), upsert suggestion unless denied.  
**Acceptance:** suggestion created for strong match; capped candidates.

**Tests**
- `test_er_suggestion_created_for_same_normalized_email()`
- `test_er_suggestion_not_created_when_negative_constraint_exists()`
- `test_er_suggestion_upsert_idempotent_on_duplicate_events()`
- `test_er_candidate_generation_caps_results()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 14 — ER Suggestion Inbox API
**Objective:** list pending suggestions for user review.  
**Tasks:** list endpoint + filters + pagination.  
**Acceptance:** stable pagination, correct state filtering.

**Tests**
- `test_er_suggestions_list_returns_pending_only()`
- `test_er_suggestions_list_pagination_stable()`
- `test_er_suggestions_filter_by_entity_id()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 15 — ER Decision APIs (Confirm/Deny)
**Objective:** record decisions; deny creates suppression; confirm triggers merge request.  
**Tasks:** confirm/deny endpoints, idempotent state transitions, merge-request event emission.  
**Acceptance:** confirm emits merge request; deny blocks resuggestion.

**Tests**
- `test_confirm_sets_state_confirmed_and_emits_merge_requested()`
- `test_deny_sets_state_denied_and_creates_negative_constraint()`
- `test_confirm_idempotent_when_called_twice()`
- `test_deny_idempotent_when_called_twice()`
- `test_concurrent_confirm_and_deny_resolves_via_cas_policy()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 16 — Merge Worker Triggered by Merge Requested
**Objective:** merge only on confirmed suggestion.  
**Tasks:** consume merge request, verify CONFIRMED, merge clusters idempotently, write lineage + explanation.  
**Acceptance:** pending/denied never merge; confirmed merges.

**Tests**
- `test_merge_worker_merges_only_when_suggestion_confirmed()`
- `test_merge_worker_noop_when_suggestion_denied()`
- `test_merge_worker_idempotent_on_duplicate_merge_requested_events()`
- `test_merge_writes_lineage_and_explanation()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 17 — Connection Graph Guardrails (Exclude ER)
**Objective:** ensure ER suggestions never appear in relationship strength queries.  
**Tasks:** enforce separation in query layer, scoring layer, and schema invariants.  
**Acceptance:** relationship queries exclude ER by default; scoring ignores ER.

**Tests**
- `test_relationship_strength_query_excludes_er_suggestions()`
- `test_scoring_job_ignores_er_suggestions()`
- `test_ui_connections_panel_excludes_possible_duplicates()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 18 — Relationship Analyzer (Email Headers) + Edge Explanation
**Objective:** produce relationship edges and “why connected.”  
**Tasks:** ingest EmailIngested(headers_only), upsert signal aggregates, compute/materialize strength, write explanation.  
**Acceptance:** deterministic edge IDs; explain endpoint works; content_used=false.

**Tests**
- `test_email_headers_analyzer_creates_direct_exchange_edge()`
- `test_email_headers_analyzer_idempotent_on_duplicate_event()`
- `test_edge_explanation_contains_no_email_body_fields()`
- `test_edge_explanation_matches_signal_aggregate_counts()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 19 — UI: Separate Panels (Connections vs Possible Duplicates)
**Objective:** UI shows two distinct concepts and metrics.  
**Tasks:** Contact page sections + link to duplicates inbox + explain drilldowns.  
**Acceptance:** ER suggestions show match probability + actions; connections show strength + why connected.

**Tests**
- `test_ui_possible_duplicates_panel_renders_pending()`
- `test_ui_confirm_deny_updates_state()`
- `test_ui_connections_panel_renders_strength_and_why_connected()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 20 — Backfill/Replay for ER Suggestions and Relationship Edges
**Objective:** deterministic replay without duplicates; no auto-merge on replay.  
**Tasks:** replay runner, checkpointing, pinned versions.  
**Acceptance:** replay matches streaming results; no merges unless confirmed.

**Tests**
- `test_er_suggestion_replay_idempotent()`
- `test_er_suggestion_replay_does_not_trigger_merge()`
- `test_relationship_replay_produces_same_edges_as_streaming()`
- `test_replay_respects_privacy_mode_gate()`

**Gate:** Achieve 100% test pass rate before proceeding.

---

## Stage 21 — End-to-End Validation
**Objective:** ingest → suggest → explain → confirm → merge → relationship edge → explain → transparency UI.  
**Tasks:** deterministic fixtures, full pipeline run.  
**Acceptance:** all outputs exist, explainable, and UI accurate.

**Tests**
- `e2e_test_ingest_creates_pending_suggestion()`
- `e2e_test_explain_suggestion_contains_top_reasons()`
- `e2e_test_confirm_triggers_merge_and_merge_explain_available()`
- `e2e_test_ingest_to_edge_to_explain()`
- `e2e_test_transparency_ui_shows_correct_analyzers_and_status()`

**Gate:** Achieve 100% test pass rate before proceeding.
