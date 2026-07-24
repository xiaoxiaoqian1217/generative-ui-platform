# ADR-0001: Monorepo and module boundaries

- **Status:** Accepted
- **Date:** 2026-07-23

## Supersession

ADR-0003 supersedes the original decision to include Interaction Gateway in the MVP.
ADR-0005 supersedes the original definition of UI Compiler Agent as a pure network Adapter.
The monorepo and framework-neutral compiler core decisions remain accepted.

## Decision

Use a pnpm/Turborepo monorepo with an independently deployable UI Compiler Service and a framework-neutral compiler core.

## Consequences

- Shared contracts stay synchronized.
- UI Compiler Service can be built and deployed independently.
- UI Compiler Core remains independent of application and transport concerns.
- Dependency rules are enforced in review and CI.
