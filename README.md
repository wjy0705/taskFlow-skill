# Task Flow

A four-checkpoint quality workflow for Codex: understand, choose capabilities, verify with evidence, and stop when blocked.

Task Flow 是一个面向 Codex、Claude Code 和 Hermes 的显式质量流程。它不自动接管普通任务，也不强迫使用某个 skill。它只在用户主动触发时，要求 Agent 按四个关口推进复杂任务：

```text
理解问题 -> 选对能力 -> 用证据验证 -> 卡住时止损
```

它的目标很简单：减少 Agent 在真实开发任务里最常见的失败模式，例如没读上下文就改、没复现就修、加载了 skill 但没真正执行、只说“应该没问题”、以及在错误方向上反复尝试。

## How To Use

Task Flow 是显式触发的。只有用户输入以下命令时才启动：

```text
/taskflow
```

普通 bug 修复、功能开发、代码审查、重构、部署请求不会自动触发 Task Flow。

使用示例：

```text
/taskflow 帮我修这个登录后白屏的问题
```

```text
/taskflow 帮我审查这次改动，按四问推进，不要跳过验证
```

```text
/taskflow 帮我给这个接口补一个安全的实现，并验证主要风险
```

Agent 启动后会先给出简短路线：

```text
Task Flow 已激活
问题：...
需要的能力：...
能力计划：能力 -> 手段 -> 验证
验证方式：...
```

任务结束时会说明：

```text
完成：...
能力/skill：...
验证：...
跳过的高相关检查：...
未验证/风险：...
```

## Core Workflow

Task Flow 不按 skill 名称做菜单匹配，而是先判断任务需要什么能力。

每次触发后，Agent 必须经过四个问题：

| Checkpoint | Purpose |
|---|---|
| 我真的理解了吗？ | 防止没读上下文、没复现、没确认边界就动手 |
| 我用对能力了吗？ | 防止乱套 skill、堆工具、或加载后没按说明执行 |
| 结果有证据证明对吗？ | 防止只说“应该没问题” |
| 卡住了怎么办？ | 防止反复撞墙、扩大改动或假装完成 |

第二问保留了早期“skill 匹配器”的核心思想，但现在更克制：

```text
能力 -> 手段 -> 验证
```

例如：

```text
能力：故障诊断
手段：复现登录白屏，检查 console、路由守卫和用户信息接口
验证：同一登录步骤不再白屏，console 无新增错误
```

只有当某个 skill 能明显提高正确率时才使用它。否则就用普通 Codex 工作流完成任务。

## What It Checks

Task Flow 不是固定流水线。它会根据任务风险选择验证方式。

常见验证包括：

- 代码修改：测试、构建、lint、类型检查、关键 diff 检查
- bug 修复：重新跑复现步骤，证明原问题不再出现
- API 或后端：启动服务、curl 正常和异常路径、检查响应结构和状态码
- 数据库：确认表、字段、写入结果、回滚或迁移影响
- 前端：真实浏览器打开、关键交互、console、截图或端到端流程
- 文件成品：渲染、打开、页面、公式、布局或图片检查
- 代码审查：每个问题必须有文件路径、行号和影响说明
- 规划或文档：检查是否覆盖用户目标、约束、验收标准和下一步

验证标准不是“至少跑一条命令”，而是：

> 验证证据必须覆盖本次改动或交付物的主要风险面。

如果某个高相关检查没有运行，Agent 必须说明原因，例如环境缺失、命令不存在、需要凭据、耗时过高或外部服务不可用。

## Design Principles

### Explicit Only

Task Flow 不自动触发。它适合用户通过 `/taskflow` 明确要求严格流程、四问、不要跳步骤，或需要更高可靠性的复杂任务。

### Workflow First

它不是工具调用器，而是工程判断流程。真正的价值不在于“用了几个 tools”，而在于每一步是否有清楚的成功标准和验证证据。

### Smallest Useful Capability

优先选择最小足够能力。一个明显合适的能力比多个看起来相关的 skills 更可靠。

### Evidence Over Confidence

完成必须有证据。没有验证证据时，只能说明风险，不能声称完成。

### Stop Safely

同一个错误或失败检查最多尝试三轮。三轮仍不过时，停止继续扩大改动，报告卡点、尝试过的方向和需要的帮助。

## Development Story

这个项目最初的想法不是“四问流程”，而是一个更大的 skill 工作链工具：

```text
用户主动提问
-> 判断问题
-> 诊断
-> 匹配能解决问题的 skills
-> 按顺序执行
-> 每步验证
-> 一次做对
```

进一步展开后，它一度接近一个 skill orchestrator：扫描用户下载的 skills，判断最优工具链，检查依赖和冲突，等待用户确认后逐个执行。

这个方向有价值，但在开发过程中也暴露出一个问题：如果过早引入完整 runtime、依赖图、context bridge、audit artifact、缓存、自检和执行状态机，项目会很快变重。用户本来只是想解决问题，却要先理解一套平台。

后来的设计逐渐收敛到一个更实用的判断：

> 生产问题最缺的不是更多自动化，而是可重复的工程纪律。

所以 Task Flow 最终没有做成“自动编排平台”，而是做成一个轻量、显式、可迁移的工作流 skill。它把重点放在 Agent 每一步是否想清楚、是否选对能力、是否拿出证据、是否知道什么时候停止。

开发过程经历了几次收敛：

1. 最初目标是帮助用户管理下载的 skills，并在用户主动询问问题时判断最优工作链。
2. 早期方向接近 skill orchestrator，关注 skill 扫描、依赖、冲突、执行顺序和用户确认。
3. 真实评价后发现：完整编排平台容易变重，首次成功路径不够短。
4. 设计思路转向 prompt-first、workflow-first：把专家的默认工程纪律写进 skill，而不是先做复杂 runtime。
5. 最终形成 Task Flow：一个显式触发的四问质量流程。

这个取舍保留了原始想法中最重要的部分：根据问题选择正确能力，并逐步验证；同时去掉了过早的平台化复杂度。

## Project Structure

```text
task-flow/
├── SKILL.md
├── README.md
├── package.json
├── bin/
│   └── taskflow-install.js
├── agents/
│   ├── claude-code.yaml
│   ├── hermes.yaml
│   └── openai.yaml
├── skills/
│   └── taskflow/
│       ├── agents/
│       ├── references/
│       └── SKILL.md
└── references/
    ├── quality-checks.md
    └── four-questions-examples.md
```

- `SKILL.md`：核心四问流程和执行规则
- `package.json`：npm 下载和安装入口
- `bin/taskflow-install.js`：把 skill 安装到 Codex、Claude Code 或 Hermes 目录的 CLI
- `agents/openai.yaml`：Codex UI 元数据，并关闭隐式触发
- `agents/claude-code.yaml`：Claude Code 适配说明
- `agents/hermes.yaml`：Hermes 适配说明
- `skills/taskflow/`：给 skill tap / catalog 类安装器使用的镜像布局
- `references/quality-checks.md`：按风险选择的质量检查参考
- `references/four-questions-examples.md`：四问在 bug、接口、审查、项目探索中的落地示例

## Installation

不要只复制 `SKILL.md`，因为该 skill 依赖 `references/` 和 `agents/` 中的补充文件。也不要把 `README.md`、`package.json`、`bin/` 复制进真实 skill 目录；这些只用于发布和安装。

### npm

当前推荐直接从 GitHub 安装 npm 包：

```powershell
npm install -g github:wjy0705/taskFlow-skill
taskflow-skill install --target all
```

如果目标目录已经存在，需要覆盖旧版本时，在对应 `install` 命令后追加 `--force`。

只安装到某个平台：

```powershell
taskflow-skill install --target codex
taskflow-skill install --target claude
taskflow-skill install --target hermes
```

本地开发时可以在仓库根目录运行：

```powershell
npm install -g .
taskflow-skill install --target all
```

安装完成后，用 `/taskflow` 主动触发。

默认安装路径：

| Target | Path |
|---|---|
| Codex | `$CODEX_HOME/skills/taskflow`，未设置时为 `~/.codex/skills/taskflow` |
| Codex legacy | `~/.codex/skills/taskflow` |
| Claude Code | `~/.claude/skills/taskflow` |
| Hermes | `~/.hermes/skills/productivity/taskflow` |

### Clone

```powershell
git clone https://github.com/wjy0705/taskFlow-skill.git
```

然后复制 skill 运行所需文件到 Codex skills 目录。

Windows 示例：

```powershell
$src = "C:\path\to\taskFlow-skill"
$dst = "$env:USERPROFILE\.codex\skills\taskflow"
New-Item -ItemType Directory -Force $dst
Copy-Item "$src\SKILL.md" $dst -Force
Copy-Item "$src\references" $dst -Recurse -Force
Copy-Item "$src\agents" $dst -Recurse -Force
```

Claude Code 要把目录命名为 `taskflow`，这样斜杠命令才是 `/taskflow`。推荐用 npm 安装器生成 Claude 专属 frontmatter；如果手工复制，需要在目标 `SKILL.md` 的 frontmatter 中加入 `disable-model-invocation: true` 和 `user-invocable: true`：

```powershell
$dst = "$env:USERPROFILE\.claude\skills\taskflow"
New-Item -ItemType Directory -Force $dst
Copy-Item "$src\SKILL.md" $dst -Force
Copy-Item "$src\references" $dst -Recurse -Force
Copy-Item "$src\agents" $dst -Recurse -Force
```

Hermes 可以放在 skill 分类目录下：

```powershell
$dst = "$env:USERPROFILE\.hermes\skills\productivity\taskflow"
New-Item -ItemType Directory -Force $dst
Copy-Item "$src\SKILL.md" $dst -Force
Copy-Item "$src\references" $dst -Recurse -Force
Copy-Item "$src\agents" $dst -Recurse -Force
```

Hermes 也可以直接从 GitHub skill 路径安装：

```powershell
hermes skills install wjy0705/taskFlow-skill/skills/taskflow
```

### Download ZIP

也可以从 GitHub 仓库页面下载 ZIP：

[https://github.com/wjy0705/taskFlow-skill](https://github.com/wjy0705/taskFlow-skill)

下载后解压，不要把整个仓库目录直接放进真实 skill 目录。请复制 `SKILL.md`、`references/`、`agents/` 到名为 `taskflow` 的目标目录；Hermes 也可以直接使用仓库里的 `skills/taskflow/` 镜像目录。
