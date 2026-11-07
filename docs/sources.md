# 参考来源

新入口与模板从本项目已确认的讨论重新编写，不再分发旧的 pstack 改写版。旧文件及 MIT 许可证保存在维护者本地的 `archive/`，不随 Git 提交。外部技能仍由其原来源维护，选择使用时检查其版本和许可。

## 配置与维护方法

- [pstack automate-me](https://github.com/cursor/plugins/blob/e5136d82418d2db3165ea1050d17577cd618cc05/pstack/skills/automate-me/SKILL.md)：寻找已有个人模式、根据材料提取偏好、审阅更新。
- [pstack reflect](https://github.com/cursor/plugins/blob/e5136d82418d2db3165ea1050d17577cd618cc05/pstack/skills/reflect/SKILL.md)：区分可复用改进与单次问题，修改前提出具体建议。
- [grilling](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/grilling/SKILL.md)：按决策依赖推进，事实先调查，给出建议。
- [grill-with-docs](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/grill-with-docs/SKILL.md)：访谈过程中保存结果。其术语建模和 ADR 产物没有继承为个人工作流要求。
- [Agent Skills 编写建议](https://agentskills.io/skill-creation/best-practices)：真实任务、按需加载、适量细节和执行反馈。

没有继承这些项目的默认多代理、固定模型、工作区路径、worktree、提交、PR 或外部跟踪操作。它们的流程定义不是 kitsune 的效果验证。

## 例子与行为

- [Anthropic 提示指导](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#use-examples-effectively)：例子可帮助表达语气、格式和结构。
- [规则与示例比较研究](https://aclanthology.org/2026.emnlp-main.1722/)：在其测试任务中，加示例未必持续提高规则效果。
- [指令与演示冲突研究](https://arxiv.org/abs/2605.20382)：矛盾示例可能影响指令遵守。

本项目对后两项使用的是摘要级证据，没有复现实验。不能从中推导个人 agent 的具体遵守率、最优示例数或英语的普遍优势。

## 长期维护与优化

- [ACE：Agentic Context Engineering](https://arxiv.org/html/2510.04618v3)：借鉴局部增量更新和去重，避免反复整份重写时丢失有效细节。其经验库仍可增长，不能据此保证固定数量的规则可以持续学习。
- [GEPA：Reflective Prompt Evolution](https://arxiv.org/html/2507.19457v1)：借鉴依据执行反馈提出修改、区分修改用例与保留测试、比较候选版本。个人授权边界不能用其他任务的平均分改善来补偿。
- [Memora：From Recall to Forgetting](https://aclanthology.org/2026.findings-acl.1337/)：借鉴对继续使用失效信息的检查，维护不只新增要求，也要清理旧要求、例子和启动副本。

本轮阅读了 ACE、GEPA 的方法及主要实验部分，未完整核对附录；Memora 使用摘要及出版记录。没有复现实验，也没有验证这些方法对个人工作流的长期收益。维护流程中的诊断表、操作选择、授权与回滚边界是本项目的设计选择，不是论文已验证的统一算法。没有引入这些研究的运行框架、自动优化循环或记忆评分淘汰机制。

## 文件发现与启动

- [Agent Skills 接入说明](https://agentskills.io/integrate-skills)：技能发现、元数据、正文加载与宿主职责。
- [Claude 技能文档](https://code.claude.com/docs/en/skills)：按需技能与手动调用配置。
- [Claude 启动记忆文档](https://code.claude.com/docs/en/memory)：原生文件加载与导入。
- [Codex 技能文档](https://developers.openai.com/codex/skills/)：安装位置与技能调用控制，实际部署前核对当前版本。

跨工具依靠共同的内容和能力检查，不依靠假定所有产品都实现某个厂商字段。原研究、讨论与完整来源保存在归档内的 `docs/`。
