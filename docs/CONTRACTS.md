# Contracts

## MVP Contracts

- packages/presentation-contract
- packages/component-catalog-schema
- packages/compiler-contract
- packages/ag-ui-adapter
- packages/shared-types

## Future Contracts

Gateway contracts are outside the MVP.
No Gateway package or Gateway-specific source value exists in the active workspace.
Gateway contracts will be designed and versioned if a future Interaction Gateway phase is explicitly authorized.

## Compile result invariants

`packages/compiler-contract` is the executable source of truth for `UICompileResult`.
The result is a discriminated union with complete success, degraded success, and complete failure branches.
Only complete success contains A2UI Operations.
Only degraded success contains a Fallback.
Every result contains request correlation and compile metadata.

## 编译请求不变量

`packages/compiler-contract` 是 `UICompileRequest` 的可执行事实来源。
`threadId` 和 `runId` 是可选的协议关联字段。
Core 可以透传关联字段，但不得使用这些字段维护会话状态或 AG-UI Run 生命周期。
序列化请求的字节数限制由应用 Adapter 在反序列化之前执行，不由 Core 负责。

## Rules

1. Contract changes require tests and a changeset.
2. Breaking changes require an ADR and major version change.
3. External input is validated at app boundaries.
4. Core functions validate generated output and protect contract invariants.
5. Stable error codes are part of the public contract.
