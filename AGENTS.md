# Repository Instructions for Coding Agents

## Source of truth

根据修改范围读取规范：

- 平台范围：`docs/platform/REQUIREMENTS.md`。
- 平台架构：`docs/platform/ARCHITECTURE.md`。
- 开发验证环境：`docs/platform/DEVELOPMENT_ENVIRONMENT.md`。
- 当前 Goal：`docs/goals/GOAL-DEV-ENV-001.md`。
- Compiler 内部需求：`docs/REQUIREMENTS.md`。
- Compiler 内部架构与设计：`docs/ARCHITECTURE.md`、`docs/Generative_UI_Compiler_Design.md`。
- 范围决策：`docs/platform/SCOPE_DECISION.md` 和相关 ADR。

旧 Compiler MVP 文档必须保留。
它们继续约束 Compiler 子系统，但不再单独代表整个仓库范围。
Roadmap 不自动授权实现。

## Branch and worktree

- Goal、Issue 或用户要求 Pull Request 时，必须使用从最新 `origin/main` 创建的独立任务分支和 worktree。
- 任务分支使用 `--no-track`，不得跟踪 `origin/main`。
- 小型只读检查和文档维护可以不创建 worktree，但必须先检查分支和工作树状态。
- 任务依赖未合并到远端 `main` 时必须暂停。
- 并行任务不得共享分支或 worktree。
- 最终验证、发布和合并前必须重新集成并验证最新 `main`。
- 默认不得直接 push 到 `main`。

```bash
git fetch origin main
git branch --no-track codex/issue-N origin/main
git worktree add <absolute-task-worktree-path> codex/issue-N
git push -u origin codex/issue-N:refs/heads/codex/issue-N
```

## Architecture rules

- Web MUST connect only to Agent Runtime Host.
- Business Agent MUST output only Markdown or structured business data.
- Business Agent MUST NOT output UI Plan Candidate, A2UI, HTML, Vue, React, or component selections.
- Business Agent Adapter MUST isolate Runtime Host from concrete Business Agent protocols.
- Agent Runtime Host owns Run and Action orchestration but MUST NOT perform UI planning or A2UI compilation.
- Presentation Pipeline owns presentation routing and concrete Model Adapters.
- Model Adapter belongs to Presentation Pipeline and MUST NOT be used for Business Agent reasoning.
- Model Adapter output remains untrusted until validated and compiled.
- UI Compiler Core is the only trusted A2UI producer.
- `packages/ui-compiler-core` MUST remain framework-, transport-, Agent-framework-, and vendor-neutral.
- UI Compiler Core MUST NOT choose presentation mode or call a model.
- Apps may depend on packages; packages MUST NOT depend on apps.
- Shared contracts belong in matching contract packages; do not duplicate types.
- The current Goal MAY implement Reference Business Agent, Business Agent Adapter, Runtime orchestration, Workbench, A2UI Renderer, and Action feedback.
- Current scope MUST NOT implement `apps/interaction-gateway` or multi-Agent routing.

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

## Pull requests

PR 描述必须包含范围、原因、架构影响、验证、风险和文档变化。

## Agent skills

- Issue：`docs/agents/issue-tracker.md`。
- Triage：`docs/agents/triage-labels.md`。
- Domain docs：`docs/agents/domain.md`。
