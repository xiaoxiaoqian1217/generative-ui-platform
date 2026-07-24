# ADR-0002: Model compile results as explicit states

- **Status:** Accepted
- **Date:** 2026-07-24

## Context

The original `UICompileResult` interface used optional fields and a Boolean `success`.
It allowed contradictory values such as successful results with both Operations and Fallback content.
The requirements document described a discriminated union, but omitted shared correlation and metadata fields.

## Decision

Model `UICompileResult` as three mutually exclusive states:

- Complete success contains a Surface ID and at least one A2UI Operation.
- Degraded success contains a Fallback and at least one structured compile error.
- Complete failure contains structured compile errors and no consumable output.

Every state contains a request ID and compile metadata.
The `degraded` discriminator is a top-level field.
Runtime validation uses `uiCompileResultSchema`, and the TypeScript type is inferred from that Schema.

## Consequences

- Consumers can narrow the result without optional-field guessing.
- Invalid field combinations are rejected at runtime.
- Degraded content remains a successful, consumable result.
- The change is breaking for consumers of the previous loose interface.
- AG-UI adapters must distinguish A2UI results, fallback results, and terminal errors.
