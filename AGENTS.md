# Repository Instructions for Coding Agents

## Source of truth

根据修改范围读取规范：

- 已接受 ADR：`docs/adr/README.md` 和对应 ADR 文件。
- 当前阶段范围：ADR-0027。
- 平台范围：`docs/platform/REQUIREMENTS.md`。
- 平台架构：`docs/platform/ARCHITECTURE.md`。
- Workbench 产品合同：`docs/WEB_WORKBENCH_SRS.md`。
- 开发验证环境：`docs/platform/DEVELOPMENT_ENVIRONMENT.md`。
- 当前 Goal：`docs/goals/` 下已批准 Goal。
- Compiler 内部需求：`docs/REQUIREMENTS.md`。
- Compiler 内部架构与设计：`docs/ARCHITECTURE.md`、`docs/Generative_UI_Compiler_Design.md`。
- 范围摘要：`docs/platform/SCOPE_DECISION.md`。

发生冲突时优先级为：

1. 已接受且仍有效的 ADR；
2. `docs/platform/REQUIREMENTS.md`；
3. `docs/platform/ARCHITECTURE.md`；
4. 当前已批准 Goal / Decision；
5. 子系统需求、架构和设计；
6. Roadmap 和说明性文档。

ADR-0027 改变了当前阶段优先级。
旧 Goal、SRS、README 或实现中的 Runtime-first Release Gate 如果与 ADR-0027 冲突，只保留为历史或兼容背景。

旧 Compiler MVP 文档必须保留。
它们继续约束 Compiler 子系统，但不再单独代表整个仓库范围。
Roadmap 不自动授权实现。

## Architecture conflict gate

任何文档、Goal、Issue、PR 或实现如果与当前有效 ADR、平台需求或平台架构发生实质冲突，必须执行以下规则：

1. 先明确标记 `ARCHITECTURE CONFLICT`；
2. 列出冲突的现有规范、拟修改内容和实际影响；
3. 不得通过代码、测试或文档静默覆盖当前架构；
4. 必须等待用户/架构决策者明确确认保持、修改或创建新 ADR；
5. 未确认前允许只读分析、冲突清单和迁移方案，不允许提交改变架构语义的实现；
6. 获得确认后，同步检查并更新 ADR、平台需求、平台架构、Goal、Contract 和 Agent 规则；
7. 本次确认只覆盖已经明确指出的冲突，不得外推到其他未讨论的架构变化。

如果用户明确要求修改当前架构，且任务中已经指出具体冲突，则该明确指令可以作为这些已指出冲突的本次确认。
后续发现新的未讨论冲突时仍必须重新报告。

## Branch and worktree

- 仅当用户明确声明当前工作是一个 Goal 时，必须使用从最新 `origin/main` 创建的独立任务分支和 worktree。
- Issue、Pull Request、小型代码改动和文档改动默认可以在当前工作树完成；只有用户明确要求时才创建独立分支或 worktree。
- 任务分支使用 `--no-track`，不得跟踪 `origin/main`。
- 小型只读检查和文档维护可以不创建 worktree，但必须先检查分支和工作树状态。
- 任务依赖未合并到远端 `main` 时必须暂停。
- 并行任务不得共享分支或 worktree。
- 最终验证、发布和合并前必须重新集成并验证最新 `main`。
- 默认不得直接 push 到 `main`。

## Current product north star

当前唯一 Active Product Track 是 ADR-0025 中的 **Presentation Integration**。

当前 North Star：

> 将 Business Agent 或已有 Agent Runtime 产生的 Markdown / structured AgentContent，转换为美观、可靠、主题一致且受控的 Presentation。

当前核心链路：

```text
AgentContent
    ↓
Presentation Router
    ├── Markdown → safe Markdown PresentationResult
    └── Structured Business Data
              ↓
      Presentation Model
              ↓
      untrusted UI Plan Candidate
              ↓
      UI Compiler Core
              ↓
      trusted A2UI PresentationResult
```

## Current feature admission gate

当前阶段新增功能必须至少直接提升以下一项：

1. `AgentContent → Presentation` 的语义正确性；
2. 生成 UI 的视觉质量；
3. Theme / Presentation Context 一致性；
4. untrusted UI Plan → trusted A2UI 的安全性和可靠性；
5. Generative UI 的可调试、可比较、可评测能力；
6. Core 必需且最小的 Framework / Runtime Integration。

如果一个任务主要解决的是：

- 通用 Agent Runtime；
- Conversation Service；
- Runtime-owned History；
- Workflow Recovery；
- Runtime Repository；
- Runtime Observability Platform；

则默认属于 Deferred。
不得仅因为相关代码已经存在就继续扩张。

## Core architecture rules

### Business Agent boundary

- Business Agent MUST own business reasoning, business state, checkpoints, backend tools, and business side-effect semantics.
- Business Agent final output MUST be Markdown or structured business data as AgentContent.
- Business Agent MUST NOT output UI Plan Candidate, A2UI, HTML, Vue, React, component selections, or frontend layout code.
- Business Agent Adapter MUST isolate concrete Business Agent protocols from Presentation Core.
- Adapter MUST NOT summarize, rewrite, reinterpret, or re-decide Business Truth.

### Presentation Pipeline

- Presentation Pipeline owns final AgentContent → Presentation conversion.
- Markdown AgentContent SHOULD form safe Markdown PresentationResult without model rewriting by default.
- Structured AgentContent MAY enter Presentation Model and Generative UI compilation.
- Presentation Model belongs to Presentation Pipeline and MUST NOT be used for Business Agent reasoning.
- Presentation Model MAY understand business content for presentation planning but MUST NOT alter Business Truth.
- Presentation Model output is always untrusted.
- Model-generated UI Plan Candidate MUST NOT enter Renderer directly.

### UI Compiler Core

- UI Compiler Core is the only trusted A2UI producer.
- `packages/ui-compiler-core` MUST remain framework-, transport-, Agent-framework-, and vendor-neutral.
- UI Compiler Core MUST NOT choose presentation mode or call a model.
- UI Compiler Core MUST validate runtime Schema, Component Catalog, Props, Binding, Action Descriptor and Policy constraints.
- Invalid model output MUST fail or degrade explicitly.
- Model-generated executable code MUST NOT be executed.

### Theme / Presentation Context

- Theme is part of the current Presentation product scope.
- Theme MAY influence controlled design tokens, component variants, density, layout preferences, typography, spacing and viewport adaptation.
- Theme MUST NOT change Business Truth.
- Theme MUST NOT bypass Compiler validation or grant new business Action authority.
- Theme / Presentation Context contracts SHOULD remain independent from concrete Agent Frameworks.

### Dependency direction

- Apps may depend on packages.
- Packages MUST NOT depend on apps.
- Shared contracts belong in matching contract packages.
- Do not duplicate types across apps and packages.
- Presentation Pipeline may depend on UI Compiler Core and presentation/model contracts.
- UI Compiler Core MUST NOT depend on CopilotKit, AG-UI, LangGraph or Business Agent implementation.

## Workbench rules

`apps/web-workbench` is currently a **Generative UI Lab / visual development and validation workbench**.

New Workbench work SHOULD prioritize:

- AgentContent / Reference Scenario input;
- Presentation Decision inspection;
- UI Plan Candidate inspection;
- Validation / Compiler Result inspection;
- trusted A2UI inspection;
- controlled Renderer preview;
- Theme / Catalog / Viewport;
- Compare;
- Reliability / fallback scenarios.

Workbench MUST NOT:

- become Business Agent;
- generate a second independent UI Plan;
- bypass Presentation Pipeline;
- bypass UI Compiler Core;
- treat untrusted UI Plan as trusted A2UI;
- execute arbitrary model-generated HTML / JavaScript;
- hold Presentation Model Provider credentials.

Conversation-first, Runtime-owned History, Thread / Turn / Operation product views, Runtime Recovery, Command Admission, Reconcile and full Runtime Diagnostics are not current Workbench Release Gates.
Existing implementation MAY remain until an explicit cleanup task decides otherwise.

## Supporting framework integration rules

CopilotKit, AG-UI, HTTP, SSE, WebSocket and other Agent Frameworks are Supporting Integration.
They MUST NOT define Generative UI Core semantics.

The current reference Agent integration MAY continue to use:

```text
Workbench ↔ Agent Runtime Host
Application protocol: AG-UI
Current transport: HTTP POST + SSE
```

ADR-0026 continues to govern this reference path.

Business Agent private HTTP + SSE / WebSocket protocols remain behind Business Agent Adapter.
Business Agent does not need to implement AG-UI.

Replacing CopilotKit MUST NOT require changing Presentation Pipeline, UI Compiler Core, Component Catalog or Theme semantics.

Current scope MUST NOT implement `apps/interaction-gateway` or multi-Agent routing without a new accepted decision.

## Deferred Agent Runtime Integration rules

ADR-0024 and the Agent Runtime Integration half of ADR-0025 remain valid but are currently Deferred.

The following are not current feature-development priorities:

- Runtime Thread / Turn / Operation;
- Runtime Repository;
- Surface Lifecycle;
- Command Admission;
- Runtime-owned Conversation History;
- Recovery / Reconcile;
- Runtime Truth Diagnostics;
- full Agent Runtime Platform.

Do not add new functionality in these areas without explicit scope authorization.

### Safety preservation for existing Runtime paths

If a task touches existing Runtime Integration code, the following ADR-0024 safety rules remain mandatory:

- Agent Runtime Host remains authoritative for Runtime Thread, Turn, Operation, Command Admission, Surface Lifecycle and trusted Presentation Snapshot on that existing integration path.
- Runtime Host MUST NOT copy or become authoritative for Business Agent private State or Checkpoint.
- Operation phase and outcome MUST remain separate dimensions.
- Operation outcome MUST support `indeterminate` when side-effect completion cannot be proven.
- Surface lifecycle belongs to Runtime Host on that path, not A2UI, CopilotKit or the browser.
- Presentation role `current | historical` remains independent from interaction state.
- Historical Presentation MAY keep local-only UI interactions that do not mutate Runtime Truth or Business Truth.
- Only a Runtime Host-projected `current + actionable` Surface MAY submit Runtime / Business Action.
- Historical Action Authority MUST NOT be replayed from stale authorization, revision, `runId` or other old execution context.
- A consumed Surface MUST NOT be silently reactivated after downstream failure.
- Browser Action requests MUST NOT treat `runId` as authoritative execution context.
- Existing Action flows MUST preserve stable `commandId`, revision validation, idempotency and CAS or equivalent concurrency protection.
- Runtime Host MUST commit Command Admission before invoking a side-effecting downstream Business Agent resume.
- The target guarantee remains effectively-once Command Admission, not distributed Exactly Once.
- Runtime Repository remains authoritative over Diagnostic Store for existing Runtime recovery.
- Diagnostic persistence failure MUST NOT change Runtime Truth.

These rules preserve existing safety.
They do not authorize new Runtime Platform feature development.

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

For Presentation Core changes, prioritize tests for:

- AgentContent contracts;
- Presentation routing;
- model candidate validation;
- Compiler rejection;
- Catalog / Props / Binding / Action constraints;
- Theme invariants;
- safe Renderer behavior;
- fallback and reliability scenarios.

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
