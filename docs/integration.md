# 启动接入与兼容范围

本版先实现通用 skill 与普通文件读取流程。启动接入依赖实际宿主能力，不宣称所有 agent 都有同样机制。

| 宿主能力 | 处理方式 | 验证边界 |
|---|---|---|
| 能发现 skill 并读取文件 | 使用同一套入口和个人目录 | 仍需验证技能触发与任务行为 |
| 能在启动时原生导入文件 | 经授权导入个人核心 | 检查实际注入内容，不只看路径存在 |
| 能自动加载个人指令，但不能导入外部文件 | 写入受管理的核心副本 | 修改个人文件后需要同步副本 |
| 没有已确认的启动机制，或用户拒绝 | 保留 skill 激活方式 | 不承诺首次请求自动加载 |
| 无法读取个人文件 | 需要用户提供内容，或适配受支持的内容提供方式 | 第一版没有云端文件服务，不能宣称已自动接入 |

## 原生导入与提示读取不同

Claude Code 文档描述了个人 CLAUDE.md 中的 `@path` 导入，但路径、权限与具体产品环境仍需检查。不要将这个语法写进其他工具后声称已接入。

对于使用个人 AGENTS.md 等文件的工具，必须核对当前版本是否实际加载该文件，以及是否支持导入。仅写一句“读取个人目录”仍依赖模型操作，不能作为机械加载证据。

核心包括个人 `README.md`、`preferences.md` 和 `skills.md`。它包含维护指引和技能索引，但并不等于自动注入所有第三方技能正文。需要常驻加载某个技能正文时，必须另行核对兼容性、许可和明确选择。

## 宿主还会读取什么

下面列出常见的本地读取来源，不是每个产品、版本都通用的完整清单。先看当前宿主的加载诊断和官方说明；组织策略、插件和自定义设置可能增加其他来源。

| 来源 | Claude Code 常见位置或行为 | Codex 常见位置或行为 |
|---|---|---|
| 用户级启动指令 | `~/.claude/CLAUDE.md`，可展开受支持的 `@path` 导入 | 默认配置根下的 `~/.codex/AGENTS.override.md` 或 `AGENTS.md`，优先读取首个非空文件 |
| 项目指令 | 工作目录及上层的 `CLAUDE.md`、`.claude/CLAUDE.md`、`CLAUDE.local.md`；支持的版本也会按其规则读取 `AGENTS.md`。子目录指令可能在访问文件时加载 | 从项目根到工作目录的 `AGENTS.override.md`、`AGENTS.md` 或已配置的备用文件名；每层按宿主规则选择 |
| 规则目录 | `~/.claude/rules/` 和项目 `.claude/rules/`，部分规则按路径加载 | 不把 Claude 的规则目录当成 Codex 的默认机制；核对实际配置 |
| 自动记忆 | 通常是 `~/.claude/projects/<project-key>/memory/`，启动加载索引的一部分，详情按需读取 | 按所用版本和功能核对，不假设使用 Claude 的路径 |
| 技能发现 | 个人 `~/.claude/skills/`、项目 `.claude/skills/` 及插件提供的技能 | 个人 `~/.agents/skills/`、项目路径中的 `.agents/skills/`，以及宿主内置或其他受支持来源 |
| 插件、hooks 和其他宿主配置 | 可能提供额外指令、技能或工具 | 取决于宿主功能与配置 |

配置根可能改变。例如 Claude 的 `CLAUDE_CONFIG_DIR` 和 Codex 的 `CODEX_HOME` 影响其相应配置路径，不应把所有表中目录做同样的字符串替换。实际路径以该宿主的文档和配置为准。不要为了检查加载来源读取认证文件或整套账号数据库。

“发现 skill”通常只把名称和简短说明放进可用目录，不等于每次启动都读完整正文。手动入口还可能不出现在模型自动选择的目录里。

`~/.cc-switch/skills/` 是可选的集中存放位置，不是所有工具默认扫描的目录。`~/.kitsune/workflow/` 也不是宿主通用的自动读取位置；它由 kitsune 入口按约定定位，或者在获准接入后由启动文件导入或提供核心内容。

因此，只删安装目录或旧标记并不能清空旧个人要求。旧启动正文、规则目录、记忆以及当前会话已有上下文仍可能生效。需要从零体验时使用[首次配置实验](first-run.md)，不要把清理现有个人要求混进普通安装。

读取机制参考：[Claude Code memory](https://code.claude.com/docs/en/memory)、[Claude Code skills](https://code.claude.com/docs/en/skills)、[Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Codex skills](https://learn.chatgpt.com/docs/build-skills)。

## 可选启动预览工具

[预览脚本](../skills/kitsune-mode/scripts/startup.mjs)需要 Node，核心 skill 并不需要。它只读取明确指定的文件，输出 JSON 提案，永不写启动文件、创建目录或修改权限。

以下命令仅演示语法。调用前按本次指定路径、已有绑定、默认 `~/.kitsune/workflow/` 的顺序解析个人目录，并将实际绝对路径传给 `--workflow`。预览工具本身不猜测位置，也不创建默认目录：

```bash
node skills/kitsune-mode/scripts/startup.mjs --workflow /absolute/personal-workflow --target /absolute/personal-instructions.md --strategy inline
```

只有经确认支持 Claude 导入的目标才使用 `claude-imports`。移除预览只需要 `--target` 与 `--remove`。

提案包括目标是否存在、原内容 SHA-256、核心内容 SHA-256、是否改变及拟议全文。应用前必须检查具体差异、授权与原文件是否发生并发修改，再由获准的文件工具写入。

脚本拒绝重复、不完整或错序标记，拒绝旧版 kitsune 标记，避免在未知旧配置上自动叠加。拒绝时需要人工审阅迁移，而不是删除整个目标文件。重复生成同一已配置内容应为无变化。

模板不能直接导入。先生成用户确认的内容，未替换的占位符会被预览工具拒绝。

## 接入记录

日常入口按[启动说明](../skills/kitsune-mode/references/startup.md)维护安装目录旁的本地记录。记录宿主、目标、个人目录、模式、是否配置或停用、实际验证状态。只在授权范围内写入，不覆盖其他宿主记录。

记录“已配置”不等于“新会话已验证”。用户拒绝或停用后，不能在下一次激活时重新安装。源码忽略 `skills/*/local/`，不要提交个人路径。

## 已验证与未验证

本地测试验证预览的内容拼装、原文件保护、重复运行与错误处理。维护者曾核对本机安装副本、发现链接，并在现有 Claude 会话中观察到日常入口注册；这些不证明新会话中的首次接入，也不证明 Codex 已实际发现技能。尚未完成真实个人配置与新会话启动加载实验，因此这不是已通过行为实测的宿主支持列表。
