# Repository Instructions for Coding Agents

## Source of truth

1. Read `docs/platform/REQUIREMENTS.md` before modifying repository-level scope, public contracts, or platform behavior.
2. Read `docs/platform/ARCHITECTURE.md` before adding cross-application dependencies or changing the platform call chain.
3. Read the active Goal under `docs/goals/` before implementing stage-specific work.
4. Read `docs/compiler/README.md` and the original Compiler documents before modifying UI Compiler internals.
5. Read relevant ADRs before changing an accepted decision.
6. Roadmap content does not authorize implementation.

When documents conflict, use the priority defined in `docs/README.md`.

## Branch and worktree applicability

- 只有以下工作强制使用独立分支和独立 worktree：明确执行一个 Goal、实现或修复一个 GitHub Issue，或者用户明确要求创建分支或 Pull Request。
- 只读检查、分析、答疑、状态报告，以及未绑定 Goal 或 Issue 的小型规则调整、文档修正、拼写修正和类似维护工作，不得自动创建新分支或 worktree。
- 不强制隔离的修改可以在当前 worktree 中进行，但修改前必须检查分支、工作树状态和 worktree 所有权，并且不得混入其他 Goal 或 Issue 的专属 worktree。
- 如果工作范围扩大为 Goal 或 Issue 实现，或者后续需要创建 Pull Request，必须先停止修改，再按下述规则创建或切换到合规的任务分支和 worktree。

## Branch creation rules

- 创建任何 Goal、Issue 或发布分支前，必须先获取远端 GitHub `main` 的最新状态，并验证本地远端跟踪引用与 GitHub 远端提交一致。
- 新分支必须直接从已验证的 `origin/main` 创建，禁止从当前本地 `HEAD`、其他本地分支或未经验证的本地 `main` 创建。
- 任务分支必须使用 `--no-track` 创建，初始状态不得跟踪 `origin/main` 或任何其他远端分支。
- 创建分支后必须立即验证分支名、起点提交和 upstream 状态，确认任务分支没有 upstream 后才能修改文件。
- 如果任务依赖尚未合并到远端 GitHub `main` 的前置 Issue，必须暂停并征求用户意见。
- 在确认依赖的 Issue 已合并到远端 GitHub `main` 并重新验证 `origin/main` 前，禁止创建或实现依赖该 Issue 的后续分支。
- 不得默认创建 stacked branch。

安全的分支和 worktree 创建方式如下。

```bash
git fetch origin main
git ls-remote origin refs/heads/main
git branch --no-track codex/issue-N origin/main
git worktree add <absolute-task-worktree-path> codex/issue-N
```

## Parallel task and worktree rules

- 主 worktree 用于 `main` 同步、只读检查、任务协调和不强制隔离的小型维护，不得在主 worktree 中实现 Goal 或 Issue。
- 每个活动 Goal 或 Issue 实现任务必须拥有独立的分支和独立的 worktree，并且从第一次文件修改前开始保持隔离。
- 一个任务分支和 worktree 在同一时间只能由一个任务拥有，其他任务不得在其中切换分支、重置、提交、合并或 rebase。
- 执行任何修改、暂存、提交、合并或 rebase 前，必须在目标 worktree 内检查当前分支和工作树状态。
- 对 Goal 或 Issue 实现任务，如果当前分支、worktree、Goal 或 Issue 身份不一致，必须立即停止，不得通过 reset、切换分支或移动提交自行修复。
- 并行任务开始前必须评估预计修改的模块、公共契约和热点文件，并区分执行独立性与集成独立性。
- 如果两个任务可能修改相同公共契约或编译主链路，可以并行实现，但必须明确串行集成顺序，不得声称它们可以无冲突合并。
- 如果并行任务中的一个已经进入 `main`，其他任务必须先基于重新验证的 `origin/main` 完成集成、验证和审查，才能发布或合并。
- 发现其他任务的修改、提交或冲突状态出现在当前 worktree 时，必须停止并报告，不得继续实现或提交。

## Branch publication rules

- 默认不得直接 push 到 `main`，未经用户明确授权的远端发布必须先位于合规任务分支，再 push 到同名远端任务分支并通过 Pull Request 合并。
- 用户明确要求在 `main` 上修改、提交或直接 push 时，可以在主 worktree 中执行，不得以默认分支策略拒绝。
- 直接 push `main` 前必须重新获取并验证远端 GitHub `main`，确认当前分支和 worktree 正确、工作树状态符合预期、不存在进行中的 Git 操作，并完成与修改范围相匹配的验证。
- 任务分支不得将 `origin/main` 配置为 upstream。
- 第一次 push 必须显式指定本地任务分支和同名远端任务分支，不得使用裸 `git push`。
- 后续 push 前必须验证 upstream 与当前任务分支同名，并再次确认目标不是 `main`。
- 除非用户明确要求发布，否则不得 push 任务分支或创建 Pull Request。
- 未经用户明确授权时，不得因为 GitHub `main` 缺少分支保护而绕过 Pull Request。

安全的第一次 push 方式如下。

```bash
git push -u origin codex/issue-N:refs/heads/codex/issue-N
```

## Goal completion and integration rules

- 最终验证和 code-review 前必须重新获取并验证远端 GitHub `main`。
- 如果 `origin/main` 在任务执行期间发生变化，必须先在任务 worktree 中集成最新 main，并在解决冲突后重新执行完整验证和 code-review。
- Goal 标记为 complete 前，任务 worktree 必须干净，所有要求的修改必须已经提交，并且不得存在进行中的 merge、rebase、cherry-pick 或 revert。
- Goal 标记为 complete 前，必须确认当前分支是预期任务分支，并确认该分支没有跟踪 `origin/main`。
- Goal complete 只代表记录的完成条件在当时成立，不代表分支在 main 后续变化后仍然可直接合并。
- 创建或更新 Pull Request 前，以及实际合并前，必须再次检查 main 是否变化，并按需重新集成、验证和审查。

## Platform architecture rules

- Web Workbench MUST connect only to Agent Runtime Host.
- Web MUST NOT directly call Business Agent, UI Compiler Service, or model providers.
- Business Agent MUST output Markdown or structured business data through the shared contract.
- Business Agent MUST NOT output UI Plan Candidate, A2UI, HTML, Vue, React, or arbitrary frontend code.
- Business Agent Adapter owns protocol adaptation and result normalization, not UI planning or compilation.
- UI Compiler Service owns presentation routing and concrete model adapters.
- UI Compiler Model Adapter processes AgentContent and produces an untrusted UI Plan Candidate.
- UI Compiler Model Adapter MUST NOT be reused as the Business Agent reasoning layer.
- UI Compiler Core MUST remain framework-, transport-, Agent-framework-, and vendor-neutral.
- UI Compiler Core MUST NOT choose a presentation mode or call a model.
- A Schema-valid UI Plan Candidate remains untrusted until Core validates and lowers it to UI IR.
- UI Compiler Core is the only trusted A2UI producer.
- A2UI Renderer MUST render only registered components.
- Action payloads are untrusted and MUST be validated by Runtime Host.
- Apps may depend on packages; packages MUST NOT depend on apps.
- Shared contracts belong in the matching contract package; do not duplicate types.

## Current stage authorization

The accepted platform Goal allows implementation of:

- `apps/business-agent-langgraph` as a reference Business Agent.
- Business Agent Adapter in Agent Runtime Host.
- Runtime Run and Action orchestration.
- UI Compiler Model Adapter provider validation.
- `apps/web-workbench` as the Frontend Runtime reference implementation.
- A2UI Renderer and Component Registry.
- Action feedback and LangGraph resume.
- Full-chain HTTP, WebSocket, and Playwright E2E.

The following remain out of scope unless a new ADR explicitly authorizes them:

- `apps/interaction-gateway`.
- Dynamic multi-Business-Agent routing.
- Autonomous multi-Agent collaboration.
- Production business databases, permissions, billing, and real device control.
- Arbitrary frontend code generation.

## Compiler subsystem rules

- The original `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, and `docs/Generative_UI_Compiler_Design.md` remain the Compiler subsystem baseline.
- Their old repository-level scope statements are superseded by `docs/platform/` and ADR-0007.
- Their internal Compiler safety, dependency, Catalog, UI IR, and A2UI constraints remain active unless explicitly replaced.

## Commands

```bash
pnpm install
pnpm validate
pnpm test
pnpm build
pnpm docs:check
```

Run `pnpm validate` after code changes.

Documentation-only changes must run `pnpm docs:check`.

## Coding standards

- TypeScript strict mode.
- ESM only.
- Prefer pure functions and explicit interfaces.
- Validate all external input at boundaries.
- Use stable error codes; do not rely on error text.
- Do not execute model-generated code.
- Do not log secrets or raw sensitive payloads.

## Output requirements

- Respond in Simplified Chinese unless the user explicitly requests another language.
- By default, all AI-generated content written into documentation MUST use Simplified Chinese, regardless of the language already used in the file, unless the user explicitly requests another language.
- Lead with the result, then list changed files, validation performed, and any remaining risks or follow-up work.
- Keep output concise, specific, and verifiable.
- Do not claim that a command, test, commit, push, or deployment succeeded unless it was actually completed.
- Use only the ASCII hyphen `-`; do not use non-ASCII dash characters.
- When writing or heavily editing long Markdown files, put each complete sentence on its own physical line.

## Pull requests

PR descriptions must include: scope, rationale, architecture impact, validation, risks, and documentation changes.

## Agent skills

### Issue tracker

Issue 使用 GitHub Issues 跟踪。

详见 `docs/agents/issue-tracker.md`。

### Triage labels

Triage 使用五种默认角色标签。

详见 `docs/agents/triage-labels.md`。

### Domain docs

领域文档使用 single-context 布局。

详见 `docs/agents/domain.md`。
