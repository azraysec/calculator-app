# @wig/agent-runtime

AI agent orchestration runtime for WIG using LangGraph.js.

## Purpose

This package will provide the runtime infrastructure for AI agents that:
- Orchestrate pathfinding and intro request workflows
- Manage entity resolution decisions
- Generate evidence summaries
- Compose outreach messages
- Handle automation rules

## Status

**PLACEHOLDER** - This package is scaffolded but not yet implemented.

## Planned Features

### Manager Agent
- Interprets user requests ("I want to meet X")
- Decomposes into subtasks
- Calls specialized agents
- Returns ranked paths with recommendations

### Entity Resolution Agent
- Reviews borderline duplicate matches
- Learns from user corrections
- Improves matching over time

### Graph Intelligence Agent
- Explains path rankings
- Provides introducer recommendations
- Suggests best channels

### Evidence Summarization Agent
- Extracts relationship signals from interactions
- Creates compact evidence cards
- Identifies key context

### Outreach Composer Agent
- Generates localized, personalized drafts
- Applies user tone preferences
- Includes relevant evidence

## Technology

Will be built on:
- **LangGraph.js** - Multi-agent workflow orchestration
- **Vercel AI SDK** - Tool calling and structured outputs
- **Inngest** - Background job orchestration

## Next Steps

1. Add LangGraph.js dependency
2. Implement Manager Agent workflow
3. Add tools for graph queries
4. Integrate with Vercel AI SDK
5. Add Inngest for background processing

## See Also

- [PRD - Agent Architecture](../../docs/PRD.md#agent-architecture)
- [LangGraph.js Documentation](https://github.com/langchain-ai/langgraphjs)
- [Vercel AI SDK](https://sdk.vercel.ai/)
