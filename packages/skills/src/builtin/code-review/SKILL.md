---
name: code-review
description: Systematic code review for quality, correctness, and maintainability
triggers:
  - review
  - code review
  - pr review
  - pull request
category: quick
cost: free
scope: builtin
---

# Code Review Skill

## Approach
1. Check correctness — does the code do what it claims?
2. Check types — no `any`, no `@ts-ignore`, proper type safety
3. Check error handling — no empty catch blocks, proper error propagation
4. Check tests — are edge cases covered?
5. Check naming — clear, consistent, no abbreviations
