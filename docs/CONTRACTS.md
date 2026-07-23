# Contracts

Runtime schemas and TypeScript types live in:

- `packages/presentation-contract`
- `packages/component-catalog-schema`
- `packages/compiler-contract`
- `packages/gateway-contract`
- `packages/ag-ui-adapter`

Rules:

1. Contract changes require tests and a changeset.
2. Breaking changes require an ADR and major version change.
3. External input is validated at app boundaries.
4. Core functions accept validated contract values and still protect invariants.
5. Stable error codes are part of the public contract.
