# WIG Project Plan

**Project:** Warm Intro Graph (WIG) System
**Start Date:** 2026-01-17
**Target Completion:** 2026-02-02 (16 days)

---

## Phase 1: Foundation (Days 1-3)
**Status:** 🟡 In Progress
**Owner:** Manager + DevOps Release Agent

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Create `.claude/agents/` subagent definitions | ✅ Done | Manager | None | 9 agents defined |
| Set up monorepo structure | 🟡 In Progress | DevOps Release | None | apps/web, packages/* |
| Initialize Next.js 14+ with TypeScript | ⏳ Pending | Next.js Developer | Monorepo | App Router required |
| Chief Architect MVP approval | ⏳ Pending | Chief Architect | None | **BLOCKER for Phase 2** |
| Create docs structure | ✅ Done | Manager | None | Dashboard, ProjectPlan, etc. |
| Set up Git workflow | ⏳ Pending | DevOps Release | None | Branch strategy, PR templates |

---

## Phase 1b: Multi-Tenant Architecture (Days 4-6)
**Status:** 🟡 In Progress
**Owner:** Postgres Pro + DevOps Release + Manager

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Architecture Decision Record | ✅ Done | Manager | None | ADR-20260131 created |
| Create User model migration | ✅ Done | Postgres Pro | ADR approval | User already existed |
| Create DataSourceConnection model | ✅ Done | Postgres Pro | User model | LinkedIn, Facebook, Email support |
| Add userId to Person model | ✅ Done | Postgres Pro | User model | Foreign key + indexes + NOT NULL |
| Add userId to EvidenceEvent model | ✅ Done | Postgres Pro | User model | Foreign key + indexes + NOT NULL |
| Add userId to Conversation model | ✅ Done | Postgres Pro | User model | Foreign key + indexes + NOT NULL |
| Add userId to Message model | ✅ Done | Postgres Pro | User model | Foreign key + indexes + NOT NULL |
| Add userId to IngestJob model | ✅ Done | Postgres Pro | User model | Foreign key + indexes + NOT NULL |
| Create enums (DataSourceType, etc.) | ✅ Done | Postgres Pro | Schema changes | All enums created |
| Migrate existing data to default user | ✅ Done | DevOps Release | Schema changes | All records have userId |
| Test migration on dev database | ✅ Done | Postgres Pro | Migration applied | Verified successfully |
| Update Prisma client | ✅ Done | DevOps Release | Migration tested | Generated v5.22.0 |

## Phase 1c: Backend Multi-Tenant Isolation (Days 7-8)
**Status:** 🟡 Ready to Start
**Owner:** Adapter Engineer + Graph Intelligence

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Add userId context to repositories | 🟡 Ready | Adapter Engineer | Phase 1b ✅ | Filter all queries by userId |
| Create auth middleware | 🟡 Ready | DevOps Release | Phase 1b ✅ | Inject userId from session |
| Update adapter interfaces | 🟡 Ready | Adapter Engineer | Middleware | Accept userId parameter |
| Add tenant isolation tests | ⏳ Pending | QA Test Engineer | Repository updates | Verify no cross-tenant leaks |
| Update graph algorithms | ⏳ Pending | Graph Intelligence | Repository updates | Respect userId boundaries |

## Phase 1d: Frontend User Context (Days 9-10)
**Status:** ⏳ Not Started
**Owner:** Frontend Developer + React Specialist

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Add user session context | ⏳ Pending | React Specialist | Phase 1c | React Context provider |
| Update API calls with user context | ⏳ Pending | Frontend Developer | Session context | Include userId in requests |
| Add user profile UI | ⏳ Pending | UI Designer | Session context | View/edit privacy settings |
| Add DataSourceConnection UI | ⏳ Pending | Frontend Developer | Profile UI | Manage LinkedIn connection |
| Privacy controls UI | ⏳ Pending | UI Designer | DataSource UI | Privacy level selector |

## Phase 2: Core Domain (Days 11-14)
**Status:** ⏳ Not Started
**Owner:** Graph Intelligence + Adapter Engineer

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Design Prisma schema extensions | ⏳ Pending | Postgres Pro | Phase 1 complete | Org, Interaction, Edge models |
| Implement generic adapter interface | ⏳ Pending | Adapter Engineer | Schema | TypeScript interfaces |
| Build MockAdapter with fixtures | ⏳ Pending | Adapter Engineer | Interface | For testing without APIs |
| Implement relationship scoring | ⏳ Pending | Graph Intelligence | Schema | Recency, frequency, channel weights |
| Build pathfinding algorithm | ⏳ Pending | Graph Intelligence | Scoring | Max 3 hops, ranked paths |
| Entity resolution (deterministic) | ⏳ Pending | Adapter Engineer | Schema | Email/phone exact match |
| Unit tests for core logic | ⏳ Pending | QA Test Engineer | All above | >80% coverage target |

---

## Phase 3: UI & Visualization (Days 8-10)
**Status:** ⏳ Not Started
**Owner:** UI Engineer + Frontend Developer

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Choose graph viz library | ⏳ Pending | UI Designer | None | D3/Cytoscape/React Flow |
| Build target search UI | ⏳ Pending | Frontend Developer | Phase 2 API | Typeahead component |
| Implement graph visualization | ⏳ Pending | React Specialist | Library choice | Path highlighting |
| Build evidence panel | ⏳ Pending | Frontend Developer | Graph viz | Show interactions |
| Build action panel | ⏳ Pending | Frontend Developer | Evidence panel | Draft generation UI |
| Responsive design & polish | ⏳ Pending | UI Designer | All UI | Mobile-friendly |

---

## Phase 4: Runtime Agents (Days 11-13)
**Status:** ⏳ Not Started
**Owner:** AI Engineer + LLM Architect

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Set up LangGraph.js runtime | ⏳ Pending | AI Engineer | Phase 2 | Vercel AI SDK integration |
| Implement Manager Agent workflow | ⏳ Pending | LLM Architect | LangGraph | Target search orchestration |
| Build Entity Resolution Agent | ⏳ Pending | AI Engineer | Entity resolution logic | Probabilistic merging |
| Build Graph Intelligence Agent | ⏳ Pending | LLM Architect | Pathfinding | Explain paths |
| Build Evidence Summarization Agent | ⏳ Pending | NLP Engineer | Phase 2 | Extract signals |
| Build Outreach Composer Agent | ⏳ Pending | Prompt Engineer | All agents | Draft messages |
| Test agent workflows end-to-end | ⏳ Pending | QA Test Engineer | All agents | Integration tests |

---

## Phase 5: Testing & Deployment (Days 14-16)
**Status:** ⏳ Not Started
**Owner:** QA Test Engineer + DevOps Release

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Complete unit test coverage | ⏳ Pending | QA Test Engineer | All phases | 100% of critical paths |
| Build integration tests | ⏳ Pending | Test Automator | Adapters | Mock API responses |
| Set up Playwright e2e tests | ⏳ Pending | QA Test Engineer | UI complete | Core user journeys |
| Configure Inngest for Vercel | ⏳ Pending | DevOps Release | Phase 4 | Background jobs |
| Set up Vercel Cron jobs | ⏳ Pending | DevOps Release | Inngest | Scheduled syncs |
| Create GitHub Actions CI pipeline | ⏳ Pending | DevOps Release | Tests ready | Test gates |
| Deploy to Vercel production | ⏳ Pending | DevOps Release | CI passing | Final deployment |
| Create .env.example & Secrets.md | ⏳ Pending | DevOps Release | All integrations | Credential docs |

---

## MVP Scope Reminders

### MVP Data Sources
1. Gmail / Google Contacts (or Microsoft 365)
2. HubSpot contacts + engagements
3. Manual CSV import (LinkedIn export, etc.)

### MVP Actions
1. Email draft + send
2. Copy-to-clipboard for other channels

### MVP UI
- Target search
- Path list (ranked)
- Graph visualization
- Evidence panel
- Action panel

---

## Definition of Done (MVP)
- [ ] User can search for a target person
- [ ] System returns top 3 warm intro paths
- [ ] Graph visualization shows the selected path
- [ ] Evidence panel shows interaction history
- [ ] User can generate intro request draft
- [ ] All features have unit + integration tests
- [ ] E2E tests cover core user journey
- [ ] Deployed to Vercel with CI/CD pipeline
- [ ] Documentation complete (README, Secrets, API docs)

---

**Notes:**
- All dates are estimates and subject to change based on Chief Architect decisions and technical discoveries
- Each task must have tests before being marked "Done"
- Manager Agent updates this plan after each milestone completion
