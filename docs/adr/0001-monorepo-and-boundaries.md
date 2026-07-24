# ADR-0001: Monorepo and module boundaries

- **Status:** Accepted, partially superseded by ADR-0003
- **Date:** 2026-07-23

## Supersession

ADR-0003 supersedes this ADR's decision to include Interaction Gateway in the MVP.
The monorepo and framework-neutral compiler core decisions remain accepted.

## Decision

Use a pnpm/Turborepo Monorepo with two deployable apps and a framework-neutral compiler core.

## Consequences

- Shared contracts stay synchronized.
- Apps can be built and deployed independently.
- Gateway uses Core directly in MVP.
- A later deployment may call UI Compiler Agent over HTTP without changing Core.
- Dependency rules are enforced in review and CI.
