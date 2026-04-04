# AllCLI Documentation Index

This index provides a concise map of documentation for the greenfield TypeScript monorepo at C:\Users\Lecoo\Desktop\allcli. The docs emphasize a TypeScript-first approach and a three-layer CLI model built atop Claude CLI, OpenCode CLI, and Codex CLI. The goal is to keep everything 100% TypeScript, document architectural decisions clearly, and define MVP boundaries without leaking implementation detail.

Overview of the three CLIs
- Claude CLI: core orchestration layer that coordinates data flow, error handling, and lifecycle events across the monorepo.
- OpenCode CLI: developer-facing tooling for code generation, scaffolding, and integration with OpenCode workflows.
- Codex CLI: AI-assisted capabilities for code review, documentation, and knowledge transfer within the project.
All three layers are designed to interoperate on a shared 100% TypeScript foundation, with strict typing and unified interfaces to minimize integration risk and maximize maintainability.

Documentation index
- [Enterprise Standards](./architecture/ENTERPRISE_STANDARDS.md)
- [MVP Scope](./architecture/MVP_SCOPE.md)
- [Architecture](./architecture/ARCHITECTURE.md)
- [Roadmap](./ROADMAP.md)
- [Research Summary](./research/RESEARCH_SUMMARY.md)
- [System Mindmap](./mindmap/SYSTEM_MINDMAP.md)
- [Feasibility Audit](./review/FEASIBILITY_AUDIT_2026-04-03.md)
- [Feasibility Audit v2](./review/FEASIBILITY_AUDIT_2026-04-03_V2.md)
- [Benchmark Constraints 2026](./review/BENCHMARK_CONSTRAINTS_2026.md)
- [Continuous Review Protocol](./review/CONTINUOUS_REVIEW_PROTOCOL.md)
- [Detailed Check 2026-04-03](./review/DETAILED_CHECK_2026-04-03.md)

Links to related existing docs
- ARCHITECTURE.md: existing architectural overview and design principles.
- ROADMAP.md: planned milestones and strategic direction.
- RESEARCH_SUMMARY.md: research insights guiding the project.
- SYSTEM_MINDMAP.md: system-level map of components and their relationships.

Monorepo conventions and TypeScript discipline
- 100% TypeScript across all packages and tooling code.
- Consistent tsconfig across packages to enable seamless cross-package builds.
- ESLint + Prettier + TypeScript plugin for uniform code quality.
- Strong typing for public APIs, with minimal any usage and explicit interfaces.
- Documentation as a first-class artifact, with ADRs used for major decisions.

Getting started guidelines for contributors
- Start from MVP_SCOPE to understand boundaries before new work.
- Create ADRs for any architectural decisions that affect multiple packages.
- Write tests that cover public APIs and CLI interfaces.
- Update docs when you introduce new capabilities or changes in behavior.
- Run the standard verification sequence before proposing changes:
  - Type checks across affected packages
  - Lint/format checks
  - Unit/integration tests
  - Build verification

Terminology and conventions
- “100% TypeScript” means all source, tests, and tooling use TypeScript exclusively.
- “Claude CLI / OpenCode CLI / Codex CLI layering” refers to the layered architecture described in ENTERPRISE_STANDARDS.md.
- References to the existing docs (ARCHITECTURE.md, ROADMAP.md, RESEARCH_SUMMARY.md, SYSTEM_MINDMAP.md) for broader context.

Document governance and maintenance
- Each document should be kept up-to-date with major changes to architecture, MVP scope, or CLI layering.
- Changes to these docs should be reviewed with similar rigor as code changes, including a quick cross-check against ROADMAP and ARCHITECTURE.

Checklist
- [ ] Ensure cross-links to existing docs remain valid.
- [ ] Confirm MVP_SCOPE captures explicit boundaries and exclusions.
- [ ] Confirm ENTERPRISE_STANDARDS covers governance, tooling, testing, and security expectations.
- [ ] Validate the documentation uses consistent terminology and style.
- [ ] Verify the content remains TypeScript-centric and platform-agnostic in implementation details.
