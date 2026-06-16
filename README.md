# Task Flow

**v0.3.0 Pro Edition**

四个检查点的质量流程：理解问题 → 选对能力 → 用证据验证 → 卡住时止损。

经过 v0.3.0 的架构升级，Task Flow 已从一个单纯的“建议手册”，进化为一个具备**强制状态追踪**、**断点人机交互**、以及**环境自适应降级**能力的专业工程纪律框架。

## 核心升级点 (v0.3.0)

1. **强硬红线规则 (Critical Rules)**：利用 `[!IMPORTANT]` 标签，强制大模型将规则优先级置于其训练数据之上，彻底根绝“幻觉验证”。
2. **状态追踪机制 (State-Tracking)**：强制要求大模型在输出的第一行标记 `[当前阶段：XXX]`，以此实现思维链 (CoT) 约束，防止大模型发生逻辑跳步。
3. **交互式断点 (Human-in-the-loop)**：面对复杂任务，第一阶段理解完成后强制“悬停”，等待人类输入确认 (Y/N)，避免在错误方向上浪费 token 资源。
4. **受限环境降级 (Graceful Degradation)**：在无法跑测试的终端环境，大模型不再死循环，而是自动生成可执行的验证脚本供人类运行。

## 怎么用

显式触发。只有你输入 `/taskflow` 时才会启动。普通修 bug、加功能、审查、重构不走这条流程。

```
/taskflow 帮我修登录后白屏的问题
/taskflow 审查这次改动，按四问推进，不要跳过验证
/taskflow 给这个接口补一个安全的实现，并验证主要风险
```

任务完成后自动退出。需要提前退出时：
```
/exit-taskflow
```

## 核心四问流程

- **1. 我真的理解了吗？** → 强制输出任务目标与边界，遇到重大决策强制悬停等待确认。
- **2. 我用对能力了吗？** → 写出行动计划：能力 -> 手段 -> 验证。
- **3. 结果有确凿证据证明对吗？** → 必须引用物理终端输出（stdout）或截图，严禁使用“应该没问题”等字眼。
- **4. 卡住了怎么办？** → 同一错误最多重试3次，三轮不过立即停机求助。

## 项目结构

```
task-flow/
├── SKILL.md              # 核心四问流程和执行规则 (Pro 版)
├── README.md             # 你正在看的说明文档
├── package.json          # npm 发布和安装入口
├── bin/
│   └── taskflow-install.js
├── agents/
│   ├── claude-code.yaml
│   ├── hermes.yaml
│   └── openai.yaml
└── references/
    ├── quality-checks.md         # 涵盖 Java/前端/API 的专业级强制质量规范
    └── four-questions-examples.md # 包含断点示例与降级策略的参考落地指南
```

## 安装与分发

目前支持直接复制配置到各大 AI 平台：
- **Claude Code**: 复制 `SKILL.md` 等到 `~/.claude/skills/taskflow/`，并在头部加 `disable-model-invocation: true`。
- **Antigravity CLI**: 直接克隆至工作区或全局 Skills 目录。
- **Hermes / Codex**: 按对应的 Agent 目录规则存放。
