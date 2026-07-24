# ADR-0001: Monorepo and module boundaries

- **Status:** Accepted
- **Date:** 2026-07-23

## Supersession

ADR-0003 supersedes the original decision to include Interaction Gateway in the MVP.
The monorepo and framework-neutral compiler core decisions remain accepted.

## Decision

Use a pnpm/Turborepo monorepo with an independently deployable UI Compiler Agent and a framework-neutral compiler core.

## Consequences

- Shared contracts stay synchronized.
- UI Compiler Agent can be built and deployed independently.
- UI Compiler Core remains independent of application and transport concerns.
- Dependency rules are enforced in review and CI.
