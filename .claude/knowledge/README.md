# WIG Knowledge Base

**Purpose**: Persistent learning system for all Claude agents working on this project.

## Overview

This knowledge base captures learnings, patterns, decisions, and user preferences that should persist across agent sessions. Any agent working on this project should read these files first to understand context and avoid repeating mistakes.

## Files

### 📋 user_profile.md
Information about the user's working style, preferences, and character traits.

**Read this to understand:**
- How the user prefers to work with agents
- Communication preferences
- Decision-making style
- Technical preferences

### 🔧 technical_learnings.md
Technical insights discovered during development.

**Read this to understand:**
- Why specific technologies were chosen
- Performance characteristics and limits
- Best practices for this stack
- Lessons learned from implementation

### 📐 project_patterns.md
Conventions and patterns established for this codebase.

**Read this to understand:**
- File organization and naming
- Code patterns and idioms
- Documentation structure
- Git workflow
- Testing approach

### 🎯 decisions.md
Log of key decisions with rationale.

**Read this to understand:**
- Why certain approaches were chosen
- What alternatives were considered
- Implementation order and priorities
- When to revisit decisions

## Usage Guidelines

### For All Agents

1. **Read First**: Before starting any work, read relevant knowledge files
2. **Update After Learning**: When you discover something new, add it here
3. **Reference in Code**: Link to knowledge base in comments when applying patterns
4. **Question Old Knowledge**: If something seems outdated, flag it for review

### What to Capture

**DO Capture:**
- Non-obvious technical insights
- User preferences discovered through interaction
- Patterns that improve code quality
- Decisions that affect architecture
- Mistakes made and how they were fixed
- Performance characteristics observed

**DON'T Capture:**
- Obvious language features
- Standard library documentation
- Information easily found in external docs
- Temporary workarounds (use TODO comments instead)

### Update Frequency

- **user_profile.md**: Update when user reveals new preferences
- **technical_learnings.md**: Update when discovering performance limits or patterns
- **project_patterns.md**: Update when establishing new conventions
- **decisions.md**: Update immediately after making architectural decisions

## Integration with Development

### Before Starting Work
```bash
# Quick knowledge scan
cat .claude/knowledge/user_profile.md
cat .claude/knowledge/technical_learnings.md | grep -A5 "Topic I'm working on"
```

### After Completing Work
Ask yourself:
1. Did I learn something non-obvious?
2. Did I establish a pattern worth repeating?
3. Did I make a decision that others should know about?
4. Did the user reveal a preference?

If yes to any, update the relevant knowledge file.

## Knowledge Quality

### Good Entries
- Specific and actionable
- Include rationale ("why" not just "what")
- Reference sources (PRD, ADR, user conversation)
- Updated with timestamps

### Poor Entries
- Vague or generic
- No context or rationale
- Duplicating external documentation
- Never updated (stale information)

## Maintenance

- Review quarterly for stale information
- Archive outdated decisions (don't delete - history matters)
- Reorganize if files grow too large
- Keep user_profile.md concise (most important for agent behavior)

---

**Last Updated**: 2026-01-17
**Maintained By**: All Claude agents working on WIG project
