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
