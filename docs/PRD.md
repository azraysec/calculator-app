Below are three “docs” you can lift directly into your repo (e.g., `docs/`) and hand to Claude Code as-is. They are opinionated and implementation-ready, but still leave room for iterative refinement once you start ingesting real data.

---

# DOC 1 — PRD: Warm Intro Graph System

## 1. Product summary

**Working name:** Warm Intro Graph (WIG)
**One-line:** Given a target person, WIG finds the best warm-intro path through your network, explains why, and helps you execute the outreach with minimal friction.

**Primary outcome:** You type “I want to meet X” → WIG returns:

1. best warm intro path(s) (you → A → B → X),
2. recommended introducer(s) with evidence,
3. suggested outreach steps + channel-specific drafts,
4. follow-ups and tracking until meeting is booked.

**Context focus:** Professional networking in cybersecurity across US / Israel / Europe.

---

## 2. Goals, non-goals, and success metrics

### Goals

1. **Warm intro pathfinding:** reliably produce top 3 intro paths with explainability.
2. **Unified relationship graph:** consolidate contacts + interactions across sources into one graph.
3. **Identity resolution:** merge the same person across sources with high precision and human-auditable reasoning.
4. **Action enablement:** generate intro requests / follow-ups and optionally execute via channel brokers.
5. **Low-maintenance extensibility:** add new data sources and action channels via a generic interface + adapters.

### Non-goals (for v1)

* Becoming a fully featured CRM replacement (HubSpot/Salesforce parity).
* Mass outreach / lead-gen automation.
* “Scrape everything” approaches that violate platform terms or create account risk.

### Success metrics (initial targets)

* **Time-to-path:** < 10 seconds from target search → top path on typical graph sizes.
* **Path quality:** user selects “use this path” ≥ 60% of the time when a 2–3 hop path exists.
* **Intro conversion:** measurable uplift vs baseline (track: requests sent → intros made → meetings booked).
* **Entity resolution accuracy:**

  * Precision ≥ 98% for “auto-merge” tier
  * Recall improves over time via “review queue” + learning loop.
* **Data coverage:** within first 2 weeks of setup, ingest ≥ 80% of contacts from core sources (email + CRM).

---

## 3. Primary user stories

### A. Find warm intro

* As a user, I enter a **target name** (e.g., “Jane Doe, CISO at Company”) and get:

  * top paths (ranked),
  * best introducer(s),
  * evidence (recent interactions, relationship strength),
  * suggested message drafts.

### B. Understand “why this path”

* As a user, I can click any edge in the path and see:

  * how these people are connected (source + type),
  * last interaction summary and timestamps,
  * confidence score and “what would improve confidence”.

### C. Execute outreach

* As a user, I can:

  * send an intro request to the introducer (email / LinkedIn / WhatsApp / etc),
  * track status,
  * trigger follow-up sequences.

### D. Expand sources

* As a user, I can add a new source (e.g., Telegram conversations) without changing core logic:

  * connect an adapter,
  * run ingestion,
  * see people and evidence appear in the graph.

### E. Automate parts of the workflow

* As a user, I can enable “automation rules”:

  * reminders, follow-up drafts, task creation,
  * optional auto-send under strict policies (see Guardrails).

---

## 4. Functional requirements

### 4.1 Data ingestion (read-side)

WIG must ingest **contacts** and **interaction evidence** (emails, messages, meetings, CRM engagements).

**Core objects to ingest:**

* Person profiles (names, emails, phone numbers, social handles, titles)
* Organizations
* Interactions (message/email metadata, timestamps, participants, channel)
* Relationship edges (explicit: “connection”, implicit: “interaction-based”)

**Ingestion modes:**

* **Sync via API** where available (Gmail, HubSpot, etc.)
* **Import via export files** (CSV/JSON) where APIs are restricted/unavailable (notably LinkedIn connections often are restricted)
* **Manual enrichment** (optional): user can add notes like “met at RSA 2024”.

**Constraints to bake in:**

* **LinkedIn Connections API is restricted to approved developers** so we will use a vm in the cloud (if you can do it) to emulate the linkedin work. IF you cannot do it then tell me and I'll provide you with the interface to do the job. Also, take into account, when yo uplan things, that I have linkedin premium so I can see connection of others usually by clicking on their network.; treat LinkedIn as “export/import” or “enterprise-approved integration only” in v1. ([Microsoft Learn][1])
* WhatsApp Business Platform policy changes can restrict “general-purpose AI bots” distribution; treat WhatsApp as an *optional channel* and design for “draft + human send” or clearly business-compliant usage. ([TechCrunch][2])

### 4.2 Identity resolution (person = same across sources)

WIG must decide when two records represent the same real person.

**Approach (layered):**

1. **Deterministic merge (auto):**

   * exact email match
   * exact phone match
   * exact stable identifier (e.g., HubSpot contact ID mapped to known email)
2. **High-confidence probabilistic merge (auto):**

   * strong name similarity + same company + overlapping emails/domains
   * stable social URL match (where available)
3. **Borderline matches (human-in-the-loop review queue):**

   * system proposes merge with explanation + evidence
   * user can approve/deny
4. **LLM-assisted adjudication (bounded):**

   * only for explanation and feature extraction
   * never the sole basis for auto-merge

**Deliverables:**

* Merge explanation must be stored (“why we merged”).
* Every merged entity must be reversible (audit + undo).

### 4.3 Graph model and scoring

Represent your network as a graph:

**Nodes**

* `Person`
* `Organization`

**Edges**

* `KNOWS / CONNECTED_TO` (source: LinkedIn/CRM/etc)
* `INTERACTED_WITH` (derived from messages/emails/meetings)
* `WORKED_AT`, `ADVISED`, `INVESTED_IN` (optional later)

**Edge attributes**

* channel(s)
* timestamps (first seen, last seen)
* frequency counts
* relationship-strength score (computed)

**Relationship strength score (v1 heuristic)**

* Recency-weighted interaction frequency
* Interaction directionality (2-way > 1-way)
* Channel weight (warmth differs by channel)
* “Introducer propensity” features (does A historically introduce? do they respond fast?)

### 4.4 Pathfinding (“best warm intro”)

Given target `T`, compute:

* candidate paths from `Me → … → T` with max hops configurable (default 3)
* rank by combined probability of success

**Ranking factors**

* introducer relationship strength with you
* introducer relationship strength with downstream nodes
* path length penalty
* recency of interactions on the edges
* “evidence quality” (explicit connection > implicit)
* user preferences (e.g., avoid asking investors; prefer Israel-first; etc.)

**Output format**

* Top 3 paths, each with:

  * nodes/edges
  * score + explanation
  * recommended “ask” recipient (often first hop)
  * channel recommendation per hop

### 4.5 UI requirements (must include graph visualization)

The UI must show:

1. **Target search** (typeahead)
2. **Recommended paths** (ranked list)
3. **Graph visualization** centered on the selected path:

   * highlight path A→B→C→T
   * allow expanding neighbors
4. **Evidence panel**:

   * last interactions, key snippets/summaries, timestamps, sources
5. **Action panel**:

   * generate intro request draft
   * choose channel (email/CRM/other)
   * task + reminders

### 4.6 Generic source + action extensibility (hard requirement)

WIG must support adding:

* **New data sources** (read)
* **New action brokers** (write)

This must be done via a **generic API** + **source-specific adapters**.

#### Generic “Read API” (example capabilities)

* `list_contacts()`
* `list_organizations()`
* `list_interactions(since, cursor)`
* `get_contact(source_contact_id)`
* `get_threads(contact_id)` (optional)

#### Generic “Action API” (brokers)

* `draft_message(context) -> draft`
* `send_message(draft, channel_config)` (optional; can be “manual handoff”)
* `create_task(reminder, owner)`
* `log_interaction(interaction)` (e.g., to CRM)

### 4.7 Automation rules

Provide “automation recipes” such as:

* After generating intro request, create follow-up reminders at +3 days, +7 days.
* If no response, suggest alternative introducer from other path.
* Weekly “Top targets” list based on pipeline.

Automation must be:

* configurable
* auditable
* safe-by-default (see Guardrails).

---

## 5. Non-functional requirements

### Security & privacy

* Encrypt secrets (OAuth tokens) at rest.
* Row-level access control (single-user now, but design for multi-user later).
* Audit logs for:

  * merges
  * messages sent
  * data source syncs
* GDPR-oriented features:

  * delete/export personal data
  * retention controls

### Reliability & performance

* Ingestion must be resumable and idempotent.
* Pathfinding should complete quickly for typical graph sizes (thousands to tens of thousands of nodes).

### Testing (hard requirement)

* 100% of new code paths covered by unit tests where practical.
* Integration tests for each adapter against mocked APIs.
* E2E tests for:

  * connect source
  * search target
  * view graph path
  * generate outreach draft
* Deployment pipeline must run unit + e2e before production. (See Doc 3.)

---

## 6. MVP scope (recommended)

**MVP goal:** deliver value even without LinkedIn direct API access.

**MVP sources**

* Gmail/Google Contacts (or Microsoft 365 if preferred)
* HubSpot contacts + engagements ([HubSpot Developers][3])
* Manual CSV import (LinkedIn export, conference attendee list, etc.)

**MVP actions**

* Email draft + send
* “Copy-to-clipboard” for channels you can’t automate safely yet

**MVP UI**

* Path list + graph visualization + evidence panel + draft panel

---

## 7. Key risks and mitigations

1. **Platform/API restrictions (LinkedIn, WhatsApp)**

   * Mitigation: export/import for LinkedIn; optional WhatsApp integration; default “draft-only” mode. ([Microsoft Learn][1])

2. **Identity merge mistakes reduce trust**

   * Mitigation: conservative auto-merge; clear explanations; undo; review queue.

3. **Long-running ingestion jobs on Vercel**

   * Mitigation: background orchestration (Inngest) + scheduled jobs (Vercel Cron). ([Vercel][4])

---

# DOC 2 — Agent Architecture: Runtime Agents + Governance

This doc defines the **agentic runtime** inside WIG (not just “agents that write code”). It enforces:

* you talk only to the **Manager Agent**,
* major decisions go through a **Chief Architect Agent**,
* everything is decomposed, planned, and executed via specialized agents/tools.

## 1. Design principles

1. **Single front door:** Manager Agent is the only user-facing agent.
2. **Architectural governance:** Chief Architect must approve plans for:

   * new data source adapter
   * new action broker
   * schema changes
   * security-sensitive changes
3. **Tool-first, evidence-based:** agents must cite stored evidence for claims (interactions, edges).
4. **Memory & preference learning:** capture your preferences as first-class artifacts:

   * “how I ask for intros”
   * “people categories to avoid”
   * “style/tone by geography”

## 2. Agent roster (runtime)

### A. Manager Agent (user-facing)

**Responsibilities**

* Interpret your request (“meet X”)
* Decompose into subtasks
* Call the right agents/tools
* Present final ranked paths + recommended actions
* Keep your “Working Preferences” updated

**Inputs**

* target person
* constraints (geo, industry segment, avoid list)
* your preferences memory

**Outputs**

* ranked paths + explanation
* outreach plan + drafts
* tasks/reminders

### B. Chief Architect Agent (governance)

**Responsibilities**

* Approve/deny major design decisions and changes
* Enforce policy: security, compliance, extensibility standards
* Review new adapter specs before build

**Behavior**

* Always produce: Decision, Rationale, Risks, Follow-ups.

### C. Data Ingestion Agent

**Responsibilities**

* Run connector syncs
* Normalize into canonical schema
* Emit events for entity resolution + graph updates

### D. Entity Resolution Agent

**Responsibilities**

* Deduplicate people/orgs
* Maintain merge explanations + confidence
* Manage review queue and learn from approvals/denials

### E. Graph Intelligence Agent

**Responsibilities**

* Build/update relationship scores
* Compute warm intro paths
* Provide explainability (“why path #1”)

### F. Evidence Summarization Agent

**Responsibilities**

* Convert raw threads/emails into compact “evidence cards”
* Extract relationship signals (met at, worked with, invested, etc.)

### G. Outreach Composer Agent

**Responsibilities**

* Draft intro request to introducer
* Draft message to target (if relevant)
* Localize style (US/Israel/Europe) and your personal tone

### H. Workflow Automation Agent

**Responsibilities**

* Apply automation recipes
* Create tasks, reminders
* Trigger follow-up suggestions

### I. Adapter Builder Agent (internal dev at runtime, optional)

This agent writes **adapter specs** (not code) and hands them to Chief Architect for approval.

---

## 3. Inter-agent orchestration model

**Supervisor pattern (recommended):**

* Manager Agent is the supervisor.
* Manager calls agents deterministically (not free-for-all).
* Chief Architect is an approval gate.

**Approval gates**

* “Plan approval” required for: schema migrations, new adapters, enabling auto-send.

---

## 4. Preferences memory (“learning how you work”)

Maintain these artifacts:

* `UserOperatingManual.md` (how you like intros done)
* `ToneGuide.md` (style examples)
* `GeoPlaybooks/US.md`, `GeoPlaybooks/Israel.md`, `GeoPlaybooks/Europe.md`
* `DoNotAskList.md` (people/org categories)
* `RelationshipSignals.md` (what you consider a “strong tie”)

The Manager updates these docs whenever you correct it.

---

## 5. Guardrails (especially for automation)

Even if you want “no questions”, outbound actions can create real-world risk. The compromise is:

**Three automation modes**

1. **Draft-only:** never sends, only prepares.
2. **One-click approve:** prepares + queues; you approve in UI.
3. **Autopilot (rules-based):** sends only when all conditions match (you pre-authorize):

   * channel allowed
   * recipient category allowed
   * message type allowed
   * rate limits
   * logs everything

Given current WhatsApp policy risk around “general-purpose AI” distribution via Business APIs, default WhatsApp to **Draft-only** until you validate compliance for your exact usage. ([TechCrunch][2])

---

# DOC 3 — Claude Code Build Playbook: Subagents, Repo Blueprint, CI/CD, Vercel

This doc is what you hand to Claude Code so it can build the system autonomously using subagents, while enforcing “Chief Architect first”.

## 0. Key Claude Code references (why this approach works)

* Claude Code supports **custom subagents** defined as Markdown files with YAML frontmatter, including tool permissions and “permission modes”. ([Claude Code][5])
* You can restrict tools per subagent and define permission behaviors like `acceptEdits` and `bypassPermissions` (use caution). ([Claude Code][5])
* Vercel supports **Cron Jobs** for scheduled tasks. ([Vercel][6])
* For long-running/background orchestration on Vercel, use a workflow orchestrator such as **Inngest**. ([Vercel][4])
* For agentic workflows in a Next.js/Vercel stack, Vercel AI SDK + LangGraph.js is a proven template approach. ([Vercel][7])

---

## 1. Framework selection (runtime + build)

### Runtime agent framework (in the product)

**Recommended:** Next.js (App Router) + Vercel AI SDK + LangGraph.js
Rationale:

* Fits Vercel deployment model
* Supports tool-calling, structured outputs, and multi-step workflows
* Has existing Vercel templates using LangGraph.js for agents ([Vercel][7])

### Background jobs

**Recommended:** Inngest for ingestion pipelines, retries, and long-running steps on Vercel. ([Inngest][8])

### Storage

**Recommended:** Postgres (Neon/Supabase) + Prisma

* Edges stored relationally; pathfinding in service layer initially
* Add pgvector later for similarity matching / embeddings

---

## 2. Repo blueprint (what Claude should create)

### Top-level structure

```text
wig/
  apps/web/                      # Next.js UI + API routes
  packages/core/                 # domain models, scoring, pathfinding
  packages/adapters/             # source adapters (read)
  packages/brokers/              # action brokers (write)
  packages/agent-runtime/        # LangGraph workflows + tools
  packages/db/                   # Prisma schema, migrations
  packages/test-utils/           # mocks, fixtures, testcontainers helpers
  docs/
    PRD.md
    AgentArchitecture.md
    ProjectPlan.md
    Dashboard.md
    Security.md
    Adapters/
      AdapterSpecTemplate.md
  .claude/agents/                # Claude Code subagents (build-time)
  .github/workflows/ci.yml
  vercel.json
  README.md
```

---

## 3. Build-time agent system in Claude Code (subagents)

### How Claude Code subagents are defined

Claude Code loads subagents from `.claude/agents/` as Markdown files with YAML frontmatter, including `name`, `description`, `tools`, `model`, and `permissionMode`. ([Claude Code][5])

### Your rule: “Chief Architect first”

Implement this rule by:

1. making the **Manager** subagent always call **Chief Architect** to approve a plan before code changes;
2. making all other subagents refuse to proceed if an “Architect Approval” artifact is missing.

### Subagent files to create (copy/paste)

#### 3.1 `/.claude/agents/manager.md`

```markdown
---
name: manager
description: User-facing coordinator. Always decomposes requests, gets Chief Architect approval, delegates to specialists, and keeps docs/dashboard updated.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
permissionMode: acceptEdits
---
You are the Manager Agent. The user speaks only to you.

Hard rules:
1) Before any material implementation, you MUST obtain an explicit architecture decision from the chief-architect agent and write it to docs/ArchitectureDecisions/<timestamp>-<slug>.md.
2) You MUST break work into tasks and assign to subagents by producing a Task Packet for each.
3) You MUST keep docs/Dashboard.md and docs/ProjectPlan.md updated after every meaningful change.

Outputs you maintain:
- docs/Dashboard.md (status, milestones, risks)
- docs/ProjectPlan.md (task list, owners=subagents, dates)
- docs/ArchitectureDecisions/*.md (approved decisions)
```

#### 3.2 `/.claude/agents/chief-architect.md`

```markdown
---
name: chief-architect
description: Approves/denies architecture and security decisions. Must be consulted before major work begins.
tools: Read, Glob, Grep
model: opus
permissionMode: plan
---
You are the Chief Architect. You do not write code. You approve or deny plans.

For every request you output:
- Decision: APPROVE / APPROVE WITH CONDITIONS / REJECT
- Rationale
- Risks
- Required changes
- Follow-up tasks

Enforce:
- Adapter/broker extensibility via generic interfaces
- Security/privacy by default
- Testing requirements (unit + integration + e2e gating)
- Vercel constraints (long-running jobs must use orchestrator)
```

#### 3.3 `/.claude/agents/product-prd-writer.md`

```markdown
---
name: product-prd-writer
description: Writes PRDs and requirement breakdowns for new features.
tools: Read, Write, Glob, Grep
model: sonnet
permissionMode: plan
---
Write concise, implementation-ready PRDs. Always include:
- problem, goals, non-goals
- user stories
- functional/non-functional requirements
- rollout plan
- risks
```

#### 3.4 `/.claude/agents/adapter-engineer.md`

```markdown
---
name: adapter-engineer
description: Implements source adapters and ingestion pipelines using the generic read API. Writes tests and fixtures.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
permissionMode: acceptEdits
---
You implement adapters under packages/adapters/.

Hard rules:
- Must follow the generic adapter interface (no one-off shapes).
- Must be idempotent, cursor-based, and resumable.
- Must ship with unit tests + mocked integration tests.
- If a real API credential is missing, implement a MockAdapter + contract tests so the system still works end-to-end.
```

#### 3.5 `/.claude/agents/broker-engineer.md`

```markdown
---
name: broker-engineer
description: Implements action brokers (draft/send/log) with safe defaults and audit logs.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
permissionMode: acceptEdits
---
Implement brokers under packages/brokers/.

Hard rules:
- Default mode = draft-only unless explicitly configured.
- Must log every attempted action to the audit log.
- Must include tests for safety rules and rate limits.
```

#### 3.6 `/.claude/agents/graph-intelligence.md`

```markdown
---
name: graph-intelligence
description: Implements graph schema, relationship scoring, and pathfinding. Produces explainability output.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
permissionMode: acceptEdits
---
Implement in packages/core/ and packages/agent-runtime/.

Hard rules:
- Every score must be explainable (store contributing factors).
- Provide deterministic unit tests for path ranking.
```

#### 3.7 `/.claude/agents/ui-engineer.md`

```markdown
---
name: ui-engineer
description: Builds Next.js UI, including graph visualization and evidence/action panels. Adds e2e tests.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
permissionMode: acceptEdits
---
Build UI in apps/web/.

Hard rules:
- Graph visualization is required (path highlighting).
- Add Playwright e2e tests for core flows.
```

#### 3.8 `/.claude/agents/qa-test-engineer.md`

```markdown
---
name: qa-test-engineer
description: Enforces testing, adds missing unit/integration/e2e tests, and prevents untested merges.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
permissionMode: acceptEdits
---
Hard rules:
- No feature is "done" without unit tests.
- Core user journeys must have Playwright coverage.
- Add CI gates and ensure vercel deployment is blocked on failures.
```

#### 3.9 `/.claude/agents/devops-release.md`

```markdown
---
name: devops-release
description: Sets up Vercel deployment, env vars scaffolding, cron jobs, background workflows, and CI/CD.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
permissionMode: acceptEdits
---
Hard rules:
- Use Inngest for long-running ingestion jobs.
- Use Vercel Cron for scheduled triggers where appropriate.
- CI must run unit + integration + e2e before production.
- If secrets are missing, create a complete .env.example and docs/Secrets.md, but do not block scaffolding work.
```

> Note: Claude Code permission modes include options like `acceptEdits` and `bypassPermissions`. Use `bypassPermissions` cautiously because it skips approval checks. ([Claude Code][5])
> The above setup avoids `bypassPermissions` while still reducing friction.

---

## 4. Runtime architecture (what agents should build)

### 4.1 Data flow (event-driven)

1. User connects a source (OAuth or import).
2. Adapter sync emits events:

   * `contacts.ingested`
   * `interactions.ingested`
3. Entity resolution consumes events → merges entities → emits `entities.updated`
4. Graph intelligence recomputes relationship scores → emits `graph.updated`
5. Querying “meet X” runs pathfinding workflow and returns ranked results.

### 4.2 Background execution

* Use **Inngest** functions for:

  * ingestion steps
  * retries
  * chunked processing ([Inngest][8])
* Use **Vercel Cron** to schedule periodic sync triggers (nightly, hourly, etc.) ([Vercel][6])

---

## 5. Source adapters to implement first (practical order)

### Tier 1 (high ROI, clean APIs)

* Gmail/Google Contacts (or Microsoft Graph)
* HubSpot contacts + engagements ([HubSpot Developers][3])

### Tier 2 (export/import or more complex)

* LinkedIn: export/import first; official Connections API is restricted (treat as enterprise-only). ([Microsoft Learn][1])
* Telegram: support Takeout / client API export pipelines (user-authorized). Telegram provides multiple API options including client APIs/TDLib; Takeout API is documented. ([Telegram][9])

### Tier 3 (policy-sensitive)

* WhatsApp: implement draft-only broker, and only enable send via compliant business usage after validation. ([TechCrunch][2])

---

## 6. Generic adapter + broker interfaces (what to code)

### 6.1 Adapter interface (TypeScript sketch)

```ts
export type Cursor = string;

export interface SourceAdapter {
  sourceName: string;

  // Capabilities discovery
  capabilities(): Promise<{
    contacts: boolean;
    organizations: boolean;
    interactions: boolean;
  }>;

  // Read-side APIs (cursor-based, idempotent)
  listContacts(params: { cursor?: Cursor; since?: Date }): Promise<{
    items: CanonicalContact[];
    nextCursor?: Cursor;
  }>;

  listInteractions(params: { cursor?: Cursor; since?: Date }): Promise<{
    items: CanonicalInteraction[];
    nextCursor?: Cursor;
  }>;
}
```

### 6.2 Broker interface

```ts
export interface ActionBroker {
  channel: string; // "email" | "hubspot" | "manual" | ...

  draftMessage(input: DraftInput): Promise<Draft>;
  sendMessage?(draft: Draft, opts: SendOptions): Promise<SendResult>; // optional
  createTask?(task: TaskInput): Promise<TaskResult>;
}
```

---

## 7. Testing strategy (mandatory)

### 7.1 Test pyramid

* **Unit:** scoring, pathfinding, entity resolution rules
* **Integration:** adapters against mocked HTTP, DB migrations
* **E2E (Playwright):** connect source (mock), search target, view path graph, generate draft

### 7.2 CI/CD gate (GitHub Actions)

Pipeline stages:

1. install, lint, typecheck
2. unit tests
3. integration tests (testcontainers Postgres)
4. build
5. deploy preview
6. run Playwright against preview URL
7. promote to production only if all pass

This satisfies:

* “every single piece of code should be tested”
* “deployment should have e2e as well as unit tests”

---

## 8. Vercel deployment requirements

### 8.1 Cron jobs

Use `vercel.json` cron definitions for scheduled triggers. Vercel Cron runs scheduled HTTP calls to your functions. ([Vercel][6])

### 8.2 Background orchestration

Use Inngest functions served from `/api/inngest` per Inngest’s Vercel deployment guidance. ([Inngest][8])

---

## 9. “Do not ask me” implementation detail (how to honor it safely)

Claude can proceed without waiting on you by:

* scaffolding adapters with mocks + contract tests
* building UI + graph + pathfinding against seeded fixtures
* generating a **single** `docs/Secrets.md` and `.env.example` for you to fill later
* leaving all outbound brokers in “draft-only” until configured

This keeps momentum while avoiding credential deadlocks and unsafe auto-sends.

---

## 10. Always-updated project dashboard (for Claude-managed build)

Add two files that the **Manager** must continuously update:

* `docs/ProjectPlan.md` — tasks, owners, dependencies
* `docs/Dashboard.md` — current milestone, what’s done, what’s blocked, risks

---

## 11. First execution script (what you tell Claude Code to do)

Paste this as your very first instruction to Claude Code (in the repo root):

```text
You are the manager subagent. Create the repo blueprint, add the .claude/agents/*.md files, and then:
1) Ask chief-architect for an MVP architecture decision.
2) Write that decision to docs/ArchitectureDecisions/.
3) Implement MVP: Postgres+Prisma schema, adapter interface + MockAdapter, graph scoring + pathfinding, Next.js UI with graph view, Playwright e2e, CI pipeline, and Vercel deployment scaffolding (vercel.json + Inngest integration).
4) Keep docs/Dashboard.md and docs/ProjectPlan.md updated after each milestone.
Hard requirement: tests for every feature, and deployment must run unit+e2e gates.
```

---

## Additional notes you should treat as “hard reality constraints”

### LinkedIn

Official “Connections API” access is explicitly restricted to approved developers, so plan for export/import unless you have partner access. ([Microsoft Learn][1])

### WhatsApp

There are credible reports that WhatsApp Business Platform terms ban “general-purpose AI chatbots” as a distribution channel effective January 15, 2026 (with ongoing regulatory scrutiny). Treat WhatsApp integration as optional and default to draft-only until you confirm your exact usage is compliant. ([TechCrunch][2])

---

If you want, I can also provide a **canonical Prisma schema (v1)** and a **pathfinding scoring function spec** (with deterministic tests) in the same “drop-in doc” style, but the three docs above already define the build in a way Claude Code can execute end-to-end.

[1]: https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/connections-api?utm_source=chatgpt.com "Connections API - LinkedIn | Microsoft Learn"
[2]: https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform/?utm_source=chatgpt.com "WhatsApp changes its terms to bar general-purpose chatbots from its ..."
[3]: https://developers.hubspot.com/docs/api-reference/crm-contacts-v3/guide?utm_source=chatgpt.com "CRM API | Contacts - HubSpot docs"
[4]: https://vercel.com/marketplace/inngest?utm_source=chatgpt.com "Inngest for Vercel"
[5]: https://code.claude.com/docs/en/sub-agents "Create custom subagents - Claude Code Docs"
[6]: https://vercel.com/docs/cron-jobs?utm_source=chatgpt.com "Cron Jobs - Vercel"
[7]: https://vercel.com/templates/next.js/langchain-starter?utm_source=chatgpt.com "LangChain + Next.js Starter - Vercel"
[8]: https://www.inngest.com/docs/deploy/vercel?utm_source=chatgpt.com "Vercel - Inngest Documentation"
[9]: https://core.telegram.org/api/takeout?utm_source=chatgpt.com "Takeout API - Telegram APIs"
