# Task Flow

四个检查点的质量流程：理解问题 → 选对能力 → 用证据验证 → 卡住时止损。

我一开始想做的不是这东西。早期方向是做 skill orchestrator——自动扫描你装了什么 skill，判断最优组合，自动执行，步步骤验证。做着做着发现不对：一个问题还没解决，先得搞懂我的一套 runtime、依赖图、状态机。太重了。

后来想通了。生产问题最缺的不是更多自动化，而是可重复的工程纪律。所以 Task Flow 不做编排平台，只做一件事：你要复杂任务时，我按四问推进，不跳步。

## 怎么用

显式触发。只有你输入 `/taskflow` 时才会启动。普通修 bug、加功能、审查、重构不走这条流程。

```
/taskflow 帮我修登录后白屏的问题
/taskflow 审查这次改动，按四问推进，不要跳过验证
/taskflow 给这个接口补一个安全的实现，并验证主要风险
```

启动后会给出一个简短路线：

```
Task Flow 已激活
问题：...
需要的能力：...
能力计划：能力 -> 手段 -> 验证
验证方式：...
```

结束时报完成情况：

```
完成：...
能力/skill：...
验证：...
跳过的高相关检查：...
未验证/风险：...
```

任务完成后自动退出。需要提前退出时：

```
/exit-taskflow
```

退出时只输出结论和未完成项，不走四问总结。

## 核心流程

我不按 skill 名称做菜单匹配，先判断任务需要什么能力。

每次触发走四个问题：

- **我真的理解了吗？** → 防没读上下文、没复现、没确认边界就动手
- **我用对能力了吗？** → 防乱套 skill、堆工具、或加载了没按说明执行
- **结果有证据证明对吗？** → 防只说"应该没问题"
- **卡住了怎么办？** → 防反复撞墙、扩大改动或假装完成

第二问保留了我早期"skill 匹配器"的核心思路，但更克制：

能力 -> 手段 -> 验证

比如：

能力：故障诊断
手段：复现登录白屏，查 console、路由守卫和用户信息接口
验证：同一登录步骤不再白屏，console 无新增错误

只有当你装了某个 skill 且能明显提高正确率时才用它。否则按正常的 Agent 工作流完成任务。

## 验证什么

不是固定流水线。我根据任务风险选验证方式。

常见的：

- 代码修改：测试、构建、lint、类型检查、关键 diff 检查
- bug 修复：重新跑复现步骤，证明原问题不再出现
- API 或后端：启服务、curl 正常和异常路径、检查响应结构和状态码
- 数据库：确认表、字段、写入结果、回滚或迁移影响
- 前端：真实浏览器打开、关键交互、console、截图或端到端流程
- 文件成品：渲染、打开、页面、公式、布局或图片检查
- 代码审查：每个问题必须有文件路径、行号和影响说明
- 规划或文档：检查是否覆盖用户目标、约束、验收标准和下一步

验证标准不是"至少跑一条命令"：

> 验证证据必须覆盖本次改动或交付物的主要风险面。

高相关检查没跑时，我必须说明原因：环境缺失、命令不存在、需要凭据、耗时过高、外部服务不可用。

## 设计原则

### 显式触发

不自动。只有你敲 `/taskflow` 要求严格推进时我才走这条流程。普通任务不走。

### 流程优先

不是工具调用器，是工程判断流程。真正的价值不在"用了几把工具"，在每一步有没有清楚的成功标准和验证证据。

### 最小够用的能力

优先选最直接的那个。一个明显合适的能力比堆一堆 skill 靠谱。

### 证据优先

完成必须有证据。没验证证据时只能说明风险，不能声称完成。

### 安全止损

同一个错误或失败最多试三轮。三轮还不过，停。报告卡点、试过的方向、需要什么帮助。

## 开发历程

一开始想做的很大：

用户提问 → 判断问题 → 诊断 → 匹配 skill → 顺序执行 → 每步验证 → 一次做对

再展开一点，接近 skill orchestrator：扫你下载的 skills，自动判断最优工具链，检查依赖和冲突，等你确认后逐个执行。

这个方向有价值，但问题也明显——用户本来想解决问题，先得理解一套平台。我评估了下，觉得太早搞 runtime、依赖图、context bridge、缓存、自检和执行状态机，项目会很快变重，首条成功路径太长。

后来做了取舍。核心收敛过程：

1. 最开始想做 skill 管理工具，帮你理清装了什么、怎么组合
2. 越做越像 orchestration platform，开始往重了走
3. 自己回头看觉得方向跑偏了——编排不是当前最缺的东西
4. 把思路拧成 prompt-first、workflow-first：把默认的工程纪律写进 skill，而不是先做复杂 runtime
5. 最终就是你现在看到的 Task Flow——显式触发的四问质量流程

保留了原始想法里最重要的部分：根据问题选对能力，逐步验证。去掉了过早的平台化复杂度。

## 项目结构

```
task-flow/
├── SKILL.md              # 核心四问流程和执行规则
├── README.md
├── package.json          # npm 发布和安装入口
├── bin/
│   └── taskflow-install.js    # 安装到 Codex / Claude Code / Hermes 的 CLI
├── agents/
│   ├── claude-code.yaml
│   ├── hermes.yaml
│   └── openai.yaml
├── skills/
│   └── taskflow/         # 给 skill tap / catalog 类安装器用的镜像布局
└── references/
    ├── quality-checks.md         # 按风险选择的质量检查参考
    └── four-questions-examples.md # 四问落地示例
```

## 安装

克隆：

```
git clone https://github.com/wjy0705/taskFlow-skill.git
```

然后把 `SKILL.md`、`references/`、`agents/` 复制到目标目录：

| 平台 | 目标路径 |
|---|---|
| Codex | `~/.codex/skills/taskflow/` |
| Claude Code | `~/.claude/skills/taskflow/`（目录名必须是 taskflow，否则 `/taskflow` 命令不生效） |
| Hermes | `~/.hermes/skills/productivity/taskflow/` |

Windows 下就是（换个目标路径就行，复制命令一样）：

```powershell
$dst = "目标路径"
New-Item -ItemType Directory -Force $dst
Copy-Item "$src\SKILL.md" $dst -Force
Copy-Item "$src\references" $dst -Recurse -Force
Copy-Item "$src\agents" $dst -Recurse -Force
```

Claude Code 注意：手工复制后需要在目标 `SKILL.md` 的 frontmatter 加 `disable-model-invocation: true` 和 `user-invocable: true`。

Hermes 也可以直接从 GitHub skill 路径装：

```
hermes skills install wjy0705/taskFlow-skill/skills/taskflow
```

装完用 `/taskflow` 触发。
