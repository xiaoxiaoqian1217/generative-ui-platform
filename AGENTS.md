# Repository Instructions for Coding Agents

## Source of truth

根据修改范围读取规范：

- 已接受 ADR：`docs/adr/README.md` 和对应 ADR 文件。
- 平台范围：`docs/platform/REQUIREMENTS.md`。
- 平台架构：`docs/platform/ARCHITECTURE.md`。
- 开发验证环境：`docs/platform/DEVELOPMENT_ENVIRONMENT.md`。
- 当前 Goal：`docs/goals/` 下已批准 Goal。
- Compiler 内部需求：`docs/REQUIREMENTS.md`。
- Compiler 内部架构与设计：`docs/ARCHITECTURE.md`、`docs/Generative_UI_Compiler_Design.md`。
- 范围决策：`docs/platform/SCOPE_DECISION.md` 和相关 ADR。

发生冲突时优先级为：

1. 已接受且仍有效的 ADR；
2. `docs/platform/REQUIREMENTS.md`；
3. `docs/platform/ARCHITECTURE.md`；
4. 当前已批准 Goal / Decision；
5. 子系统需求、架构和设计；
6. Roadmap 和说明性文档。

旧 Compiler MVP 文档必须保留。
它们继续约束 Compiler 子系统，但不再单独代表整个仓库范围。
Roadmap 不自动授权实现。

## Architecture conflict gate

任何文档、Goal、Issue、PR 或实现如果与当前有效 ADR、平台需求或平台架构发生实质冲突，必须执行以下规则：

1. 先明确标记 `ARCHITECTURE CONFLICT`；
2. 列出冲突的现有规范、拟修改内容和实际影响；
3. 不得通过代码、测试或文档静默覆盖当前架构；
4. 必须等待用户/架构决策者明确确认以下三种方向之一：保持当前架构、修改当前架构、创建新 ADR；
5. 未确认前允许只读分析、冲突清单和迁移方案，不允许提交改变架构语义的实现；
6. 获得确认后，同步检查并更新 ADR、平台需求、平台架构、Goal、Runtime Contract 和 Agent 规则；
7. 本次确认只覆盖已经明确指出的冲突，不得外推到其他未讨论的架构变化。

如果用户明确要求“修改当前架构”，且任务中已经指出具体冲突，则该明确指令可以作为这些已指出冲突的本次确认。
后续发现新的未讨论冲突时仍必须重新报告。

<!-- ## Branch and worktree

- 仅当用户明确声明当前工作是一个 Goal 时，必须使用从最新 `origin/main` 创建的独立任务分支和 worktree。
- Issue、Pull Request、小型代码改动和文档改动默认可以在当前工作树完成；只有用户明确要求时才创建独立分支或 worktree。
- 任务分支使用 `--no-track`，不得跟踪 `origin/main`。
- 小型只读检查和文档维护可以不创建 worktree，但必须先检查分支和工作树状态。
- 任务依赖未合并到远端 `main` 时必须暂停。
- 并行任务不得共享分支或 worktree。
- 最终验证、发布和合并前必须重新集成并验证最新 `main`。
- 默认不得直接 push 到 `main`。 -->

```bash
git fetch origin main
git branch --no-track codex/issue-N origin/main
git worktree add <absolute-task-worktree-path> codex/issue-N
git push -u origin codex/issue-N:refs/heads/codex/issue-N
```

## Architecture rules

### Platform boundaries

- Web MUST connect only to Agent Runtime Host.
- Workbench Agent interaction MUST use AG-UI as the single application protocol exposed by Runtime Host.
- HTTP, SSE, and WebSocket MUST be treated as Transport mechanisms, not as Agent business protocols parallel to AG-UI.
- The current Workbench reference Transport is AG-UI over HTTP POST + SSE through the embedded CopilotKit Runtime.
- New Workbench Agent features MUST NOT introduce a separate custom HTTP Run protocol or WebSocket Run protocol alongside AG-UI.
- Existing `/api/runs`, `/api/actions`, or `/ws/runs` paths MAY remain during migration only as compatibility / debug adapters and MUST converge on the same Runtime Domain semantics.
- Business Agent private HTTP + SSE / WebSocket protocols belong behind Business Agent Adapter and MUST NOT be exposed to Workbench.
- Business Agent MUST own business reasoning, business state, checkpoints, backend tools, and business side-effect semantics.
- Business Agent MUST output only Markdown or structured business data as final AgentContent.
- Business Agent MUST NOT output UI Plan Candidate, A2UI, HTML, Vue, React, or component selections.
- Business Agent Adapter MUST isolate Runtime Host from concrete Business Agent protocols.
- Presentation Pipeline owns presentation routing and concrete Model Adapters.
- Model Adapter belongs to Presentation Pipeline and MUST NOT be used for Business Agent reasoning.
- Model Adapter output remains untrusted until validated and compiled.
- UI Compiler Core is the only trusted A2UI producer.
- `packages/ui-compiler-core` MUST remain framework-, transport-, Agent-framework-, and vendor-neutral.
- UI Compiler Core MUST NOT choose presentation mode or call a model.
- Apps may depend on packages; packages MUST NOT depend on apps.
- Shared contracts belong in matching contract packages; do not duplicate types.
- Current scope MUST NOT implement `apps/interaction-gateway` or multi-Agent routing without a new accepted decision.

### Runtime truth model

- Agent Runtime Host MUST be authoritative for Runtime Thread, Turn, Operation, Command Admission, Surface Lifecycle, and trusted Presentation Snapshot.
- Runtime Host MUST NOT copy or become authoritative for Business Agent private State or Checkpoint.
- Turn MUST represent a stable conversation position and MUST NOT be treated as the only execution unit.
- Operation MUST be the authoritative unit for one accepted execution attempt.
- Operation phase and outcome MUST be separate dimensions.
- Operation outcome MUST support `indeterminate` when side-effect completion cannot be proven.
- `history-write-failed` MUST NOT be modeled as a business Turn execution status in new code.
- Presentation fallback MUST NOT overwrite a completed business Operation outcome.
- Diagnostic persistence failure MUST NOT change Runtime Truth.

### Surface and Command rules

- Surface lifecycle belongs to Runtime Host, not A2UI, CopilotKit, or the browser.
- Surface interaction states MUST distinguish at least `actionable`, `claimed`, `consumed`, and `disabled`.
- Presentation role MUST distinguish `current` and `historical` independently from interaction state.
- Historical Presentation MAY keep local-only UI interactions that do not mutate Runtime Truth or Business Truth, such as expand/collapse, copy, view details, inspect raw A2UI or Artifacts, and open Inspect.
- Only a Surface projected by Runtime Host as `current + actionable` MAY submit a Runtime / Business Action.
- Historical Action Authority MUST NOT be replayed by reusing historical authorization, revision, `runId`, or other stale execution context.
- Re-executing an action derived from historical content MUST enter a new Runtime Host-validated current interaction context and use a new Command / current Surface or equivalent new authoritative context.
- A consumed Surface MUST NOT be silently reactivated after downstream failure.
- Browser Action requests MUST NOT treat `runId` as authoritative execution context.
- Runtime Host MUST resolve execution context from `surfaceId` and persisted Runtime state.
- New Action flows MUST use a stable `commandId`, Surface revision validation, idempotency, and CAS or equivalent concurrency control.
- Runtime Host MUST commit Command Admission before invoking a side-effecting downstream Business Agent resume.
- The target guarantee is effectively-once Command Admission, not distributed Exactly Once.

### Runtime repository and diagnostics

- Runtime Repository stores authoritative recoverable interaction state.
- Diagnostic Store stores observability projections and MAY be incomplete.
- Runtime recovery MUST start from Runtime Repository state.
- Diagnostic Event Replay MAY improve timeline reconstruction but MUST NOT overwrite Runtime Repository truth.
- PlatformRuntimeEvent SHOULD carry `operationId` as a first-class correlation identifier.
- External or compatibility `runId` MUST NOT become the Runtime Domain primary key in new designs.

### Framework positioning

- CopilotKit Runtime is an embedded Adapter / Infrastructure dependency.
- CopilotKit provides the current AG-UI entry point but MUST NOT define Runtime Domain semantics.
- CopilotKit MUST NOT own Runtime Thread, Operation, Surface, Command idempotency, or Presentation decisions.
- Replacing CopilotKit MUST NOT require changing Runtime Domain semantics.
- Runtime Kernel is a logical layer inside Agent Runtime Host and MUST NOT automatically become a new service or package.

## Validation

```bash
pnpm install
pnpm validate
pnpm test
pnpm build
pnpm docs:check
```

Documentation-only changes must run `pnpm docs:check`.
Code changes must run validation matching the affected scope.

## Coding standards

- TypeScript strict mode and ESM only.
- Prefer pure functions and explicit interfaces.
- Validate external input at boundaries.
- Use stable error codes.
- Do not execute model-generated code.
- Do not log secrets or raw sensitive payloads.

## Output requirements

- 默认使用简体中文。
- 先给结果，再列修改文件、验证和剩余风险。
- 不得声称未实际完成的测试、提交、push 或部署成功。
- 长 Markdown 文件中，每个完整句子单独占一行。
- 发现架构冲突时，必须在结果中单独列出，不能埋在普通建议中。

## Pull requests

PR 描述必须包含范围、原因、架构影响、验证、风险和文档变化。
如果 PR 解决了一个已确认的架构冲突，必须引用对应 ADR 或确认记录。

## Agent skills

- Issue：`docs/agents/issue-tracker.md`。
- Triage：`docs/agents/triage-labels.md`。
- Domain docs：`docs/agents/domain.md`。
