# Issue 跟踪: GitHub

本仓库的 Issue 和 PRD 存放在 GitHub Issues 中。
所有操作均使用 `gh` CLI。

## 常用操作

### 创建 Issue

```bash
gh issue create --title "..." --body "..."
```

多行正文使用 heredoc。

### 读取 Issue

```bash
gh issue view <number> --comments
```

读取时还应获取标签，并在需要时使用 `jq` 过滤评论。

### 列出 Issue

```bash
gh issue list \
  --state open \
  --json number,title,body,labels,comments \
  --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'
```

根据任务添加适当的 `--label` 和 `--state` 过滤条件。

### 评论 Issue

```bash
gh issue comment <number> --body "..."
```

### 添加或移除标签

```bash
gh issue edit <number> --add-label "..."
gh issue edit <number> --remove-label "..."
```

### 关闭 Issue

```bash
gh issue close <number> --comment "..."
```

实现提交完成一个 Issue 时，优先在简洁的提交标题末尾添加 `, fixes #<number>`。
例如：`fix: Fix login bug, fixes #45`。
该提交进入默认分支后，GitHub 会关联并自动关闭对应 Issue。
仅关联但不应关闭时，使用 `refs #<number>`，不要使用关闭关键字。

通过 `git remote -v` 确定仓库。
在仓库克隆目录中运行时，`gh` 会自动识别仓库。

## 将 Pull Request 作为 triage 请求入口

**PRs as a request surface: no.**

如果仓库将外部 PR 视为功能请求，可以将此值改为 `yes`。
`triage` 技能会读取此标志。

值为 `yes` 时，PR 使用与 Issue 相同的标签和状态流转，并使用对应的 `gh pr` 命令。

### 读取 PR

```bash
gh pr view <number> --comments
gh pr diff <number>
```

### 列出需要 triage 的外部 PR

```bash
gh pr list \
  --state open \
  --json number,title,body,labels,author,authorAssociation,comments
```

只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的 PR。
排除 `OWNER`、`MEMBER` 和 `COLLABORATOR`。

### 评论、添加标签或关闭 PR

使用 `gh pr comment`、`gh pr edit --add-label`、`gh pr edit --remove-label` 或 `gh pr close`。

GitHub 的 Issue 和 PR 共用同一个编号空间，因此 `#42` 可能指向任意一种对象。
先运行 `gh pr view 42`，失败后再运行 `gh issue view 42`。

## 当技能要求发布到 Issue 跟踪系统时

创建一个 GitHub Issue。

## 当技能要求获取相关 ticket 时

运行以下命令：

```bash
gh issue view <number> --comments
```

## Wayfinding 操作

`wayfinder` 使用一个 map Issue，并将其子 Issue 作为 ticket。

### Map

Map 是一个带有 `wayfinder:map` 标签的 Issue。
其正文包含 Notes、Decisions-so-far 和 Fog。

```bash
gh issue create --label wayfinder:map
```

### 子 ticket

通过 GitHub sub-issues API 将子 Issue 关联到 map。
如果 sub-issues 不可用，则在 map 正文中添加任务列表，并在子 Issue 正文顶部写入 `Part of #<map>`。
子 ticket 使用 `wayfinder:<type>` 标签。
`<type>` 可以是 `research`、`prototype`、`grilling` 或 `task`。
认领 ticket 后，将其分配给负责推进的开发者。

### 阻塞关系

使用 GitHub 原生 Issue dependency 作为规范且在 UI 中可见的阻塞关系。

```bash
gh api \
  --method POST \
  repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by \
  -F issue_id=<blocker-db-id>
```

`<blocker-db-id>` 是 blocker 的数字数据库 ID，不是 Issue 编号或 `node_id`。

```bash
gh api repos/<owner>/<repo>/issues/<n> --jq .id
```

GitHub 通过 `issue_dependencies_summary.blocked_by` 报告仍处于打开状态的 blocker。
如果 dependency 不可用，则在子 Issue 正文顶部添加 `Blocked by: #<n>, #<n>`。
所有 blocker 关闭后，ticket 才解除阻塞。

### 查询 frontier

列出 map 下所有打开的子 Issue。
排除仍有打开 blocker 或已有 assignee 的子 Issue。
按照 map 中的顺序选择第一个剩余 ticket。

### 认领

```bash
gh issue edit <n> --add-assignee @me
```

认领应是会话中的第一次写操作。

### 完成

先评论答案，再关闭子 Issue。
随后在 map 的 Decisions-so-far 中追加上下文指针和链接。
