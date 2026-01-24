# WIG Product Backlog

**Last Updated:** 2026-01-24

This document tracks feature requests, improvements, and requirements for the Warm Intro Graph system.

## Requirements Table

| ID | Requirement | Priority | Status | Category | Notes |
|----|-------------|----------|--------|----------|-------|
| REQ-001 | Add changelog tab to UI | High | Done | Feature | Display all requirements with status and priority |
| REQ-002 | Support LinkedIn URL input | High | Done | Feature | Allow pasting LinkedIn profile URLs to search for people |
| REQ-003 | Parse LinkedIn profile data | Medium | Done | Feature | Extract name, title, company from LinkedIn URL |
| REQ-004 | Show all my connections in current graph/DB | High | Done | Feature | Display network overview with all people, connections, and statistics |
| REQ-005 | Add version/build/timestamp display | Medium | Done | Feature | Show app version, git commit, and build time in header |
| REQ-006 | LinkedIn connector integration | High | Done | Feature | Fetch LinkedIn profiles via API when not in network. Requires LINKEDIN_ACCESS_TOKEN env var |
| REQ-007 | Nearest name matches for unknown people | Medium | Done | Feature | Fuzzy string matching to suggest similar names when no exact match found |

## Status Definitions

- **Planned**: Requirement captured, not started
- **In Progress**: Currently being implemented
- **In Review**: Implementation complete, under review
- **Done**: Shipped to production
- **Blocked**: Cannot proceed due to dependency
- **On Hold**: Deprioritized or waiting for decision

## Priority Definitions

- **Critical**: Blocking core functionality, must fix immediately
- **High**: Important for user experience, implement soon
- **Medium**: Valuable improvement, implement when capacity allows
- **Low**: Nice to have, implement when other work is complete

## Upcoming Features (Future Backlog)

### Phase 3: AI Agents & Intelligence
- Evidence summarization agent
- Outreach message composer with AI
- Path explanation with reasoning
- Relationship strength analysis

### Phase 4: Data Sources
- Gmail/Google Contacts integration
- HubSpot CRM integration
- LinkedIn CSV import
- Manual contact entry UI
- Calendar integration (Google Calendar, Outlook)

### Phase 5: Actions & Workflows
- Email draft generation
- Send via email
- Track introduction status
- Follow-up reminders
- Success metrics tracking

## Recent Changes

### 2026-01-24 - Phase 2 Complete

#### Core Features
- Added changelog/backlog tracking system (REQ-001)
- Added LinkedIn URL parsing support (REQ-002, REQ-003)
- Created requirements table in UI
- Added "My Network" tab showing all connections (REQ-004)
- Implemented network overview with statistics
- Display all people with connection strengths
- Show organization groupings

#### Enhancement Features
- Version display with git commit and build time (REQ-005)
- Fuzzy name matching with Levenshtein distance (REQ-007)
- "Did you mean..." suggestions for similar names
- LinkedIn connector integration (REQ-006)
  - LinkedInAdapter class for API integration
  - /api/linkedin/profile endpoint
  - "Search LinkedIn" button in person search
  - Requires LINKEDIN_ACCESS_TOKEN environment variable

#### Database & Backend
- Created /api/seed endpoint for remote database seeding
- Authentication with SEED_SECRET
- Network API endpoint with statistics
- Enhanced search API with fuzzy matching fallback

#### UI/UX Improvements
- Three-tab interface: Intro Finder, My Network, Changelog
- Color-coded status badges
- Priority indicators
- LinkedIn URL detection with visual feedback
- Fuzzy match indicators

## How to Add Requirements

When adding new requirements:
1. Assign next available REQ-XXX ID
2. Set priority (Critical/High/Medium/Low)
3. Set initial status (Planned)
4. Categorize (Feature/Bug/Enhancement/Technical)
5. Add any relevant notes or context
