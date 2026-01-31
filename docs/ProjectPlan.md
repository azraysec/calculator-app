# WIG Project Plan

**Project:** Warm Intro Graph (WIG) System
**Start Date:** 2026-01-17
**Target Completion:** 2026-02-02 (16 days)

---

## Phase 1: Foundation (Days 1-3)
**Status:** ✅ COMPLETE
**Owner:** Manager + DevOps Release Agent
**Completed:** 2026-01-31

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Create `.claude/agents/` subagent definitions | ✅ Done | Manager | None | 9 agents defined |
| Set up monorepo structure | ✅ Done | DevOps Release | None | apps/web, packages/* |
| Initialize Next.js 14+ with TypeScript | ✅ Done | Next.js Developer | Monorepo | App Router with TypeScript |
| Chief Architect MVP approval | ✅ Done | Chief Architect | None | Approved with conditions (all satisfied) |
| Create docs structure | ✅ Done | Manager | None | Dashboard, ProjectPlan, etc. |
| Set up Git workflow | ✅ Done | DevOps Release | None | Git workflow established |

---

## Phase 1b: Multi-Tenant Architecture (Days 4-6)
**Status:** ✅ COMPLETE
**Owner:** Postgres Pro + DevOps Release + Manager
**Completed:** 2026-01-31

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
**Status:** ✅ COMPLETE
**Owner:** Manager + Adapter Engineer + Graph Intelligence
**Completed:** 2026-01-31

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Audit all API routes | ✅ Done | Manager | Phase 1b ✅ | Created API-Routes-Audit.md |
| Update /api/people route | ✅ Done | Manager | Audit | Added withAuth + userId filter |
| Update /api/people/[id] route | ✅ Done | Manager | Audit | Added withAuth + userId filter |
| Update /api/connections route | ✅ Done | Manager | Audit | Added withAuth + userId filter |
| Update /api/network route | ✅ Done | Manager | Audit | Added withAuth + userId filter |
| Update /api/linkedin/profile route | ✅ Done | Manager | Audit | Added withAuth + userId filter |
| Update /api/people/[id]/paths route | ✅ Done | Manager | Audit | Added withAuth + userId filter |
| Update graph service factory | ✅ Done | Graph Intelligence | Routes | Accept userId parameter |
| Update graph service queries | ✅ Done | Graph Intelligence | Factory | Filter by userId |
| Create tenant isolation tests | ✅ Done | QA Test Engineer | Repository updates | 3 test files created |
| Create best practices doc | ✅ Done | Manager | Tests | MultiTenantBestPractices.md |

## Phase 1d: Frontend User Context (Days 9-10)
**Status:** ✅ COMPLETE
**Owner:** Manager Agent
**Completed:** 2026-01-31
**Version:** v0.14.0

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Add user session context | ✅ Done | Manager | Phase 1c | contexts/user-context.tsx |
| Create data source API routes | ✅ Done | Manager | Session context | /api/data-sources routes |
| Add user profile UI | ✅ Done | Manager | Session context | UserProfile component |
| Add DataSourceConnection UI | ✅ Done | Manager | Profile UI | DataSourceCard, DataSourcesManager |
| Privacy controls UI | ✅ Done | Manager | DataSource UI | PrivacySettings component |
| User avatar dropdown | ✅ Done | Manager | User context | UserAvatar component |
| Integrate into app | ✅ Done | Manager | All components | Updated providers, pages |

## Phase 2: Core Domain (Days 11-16)
**Status:** PLANNING
**Owner:** Graph Intelligence + Adapter Engineer + Manager
**Target Start:** 2026-02-01
**ADR:** docs/ArchitectureDecisions/2026-02-01-phase2-core-domain.md (AWAITING APPROVAL)

### Week 1: Core Algorithms (Days 1-5)

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| ADR Approval | PENDING | Chief Architect | Phase 1 | Review 2026-02-01-phase2-core-domain.md |
| RelationshipScore schema migration | PENDING | Postgres Pro | ADR Approval | Score factors + composite |
| IntroductionPath schema migration | PENDING | Postgres Pro | ADR Approval | Path storage + status |
| Scoring algorithm implementation | PENDING | Graph Intelligence | Schema | packages/core/src/scoring/ |
| Scoring unit tests (100% coverage) | PENDING | QA Test Engineer | Algorithm | Deterministic tests |
| Pathfinding algorithm (BFS + scoring) | PENDING | Graph Intelligence | Scoring | Max 3 hops |
| Pathfinding unit tests | PENDING | QA Test Engineer | Pathfinding | Test graph fixtures |
| API routes for paths (/api/paths) | PENDING | Manager | Pathfinding | GET /api/paths?targetId= |
| Integration tests for path API | PENDING | QA Test Engineer | API routes | Mock + real data |

### Week 2: Data Source Adapters (Days 6-10)

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| CSV Import Adapter | PENDING | Adapter Engineer | Schema | LinkedIn export support |
| CSV Adapter tests | PENDING | QA Test Engineer | CSV Adapter | Various CSV formats |
| Gmail Adapter (OAuth2 + googleapis) | PENDING | Adapter Engineer | CSV done | Contact + email sync |
| Gmail Adapter integration tests | PENDING | QA Test Engineer | Gmail Adapter | Mock googleapis |
| HubSpot Adapter | PENDING | Adapter Engineer | Gmail done | Contacts + engagements |
| HubSpot Adapter tests | PENDING | QA Test Engineer | HubSpot Adapter | Mock HubSpot API |
| Google Calendar Adapter | PENDING | Adapter Engineer | Gmail OAuth | Meeting attendees |
| Calendar Adapter tests | PENDING | QA Test Engineer | Calendar Adapter | Extract attendees |

### Week 3: UI & Privacy (Days 11-16)

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| PrivacySetting schema migration | PENDING | Postgres Pro | Week 1 | Per-source controls |
| Enhanced privacy UI | PENDING | UI Engineer | Schema | Granular settings |
| Path visualization component | PENDING | UI Engineer | Pathfinding API | Highlight paths |
| Evidence panel component | PENDING | UI Engineer | Visualization | Interaction history |
| Action panel (draft intro) | PENDING | UI Engineer | Evidence panel | Generate draft |
| E2E tests for path flow | PENDING | QA Test Engineer | All UI | Full user journey |
| Phase 2 Quality Gate | PENDING | Manager | All tests | >90% pass rate |

### Legacy Tasks (Carried Forward)

| Task | Status | Owner | Dependencies | Notes |
|------|--------|-------|--------------|-------|
| Design Prisma schema extensions | SUPERSEDED | - | - | See Week 1 tasks above |
| Implement generic adapter interface | ✅ Done | Adapter Engineer | - | Already exists in packages/adapters |
| Build MockAdapter with fixtures | ✅ Done | Adapter Engineer | - | Already exists |
| Implement relationship scoring | PENDING | Graph Intelligence | Schema | See Week 1 |
| Build pathfinding algorithm | PENDING | Graph Intelligence | Scoring | See Week 1 |
| Entity resolution (deterministic) | DEFERRED | Adapter Engineer | Schema | Phase 3 - LLM-assisted |
| Unit tests for core logic | PENDING | QA Test Engineer | All above | See Week 1/2 tests |

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
- [x] Multi-tenant architecture implemented (Phase 1)
- [x] Database schema with userId isolation (Phase 1b)
- [x] All API routes secured with authentication (Phase 1c)
- [x] Frontend user context and data source management (Phase 1d)
- [x] Security verification tests passing (Phase 1)
- [ ] All features have unit + integration tests
- [ ] E2E tests cover core user journey
- [ ] Deployed to Vercel with CI/CD pipeline
- [x] Documentation complete for Phase 1 (multi-tenant architecture)
- [ ] Documentation complete for MVP (README, Secrets, API docs)

---

**Notes:**
- All dates are estimates and subject to change based on Chief Architect decisions and technical discoveries
- Each task must have tests before being marked "Done"
- Manager Agent updates this plan after each milestone completion
