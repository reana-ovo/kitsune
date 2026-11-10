# 文档

- [当前设计](design.md)：确定的边界、配置流程、个人产物、自主维护与有界保留。
- [安装步骤](../INSTALL.md)：给 agent 执行的安装说明，只寻找位置并安装两个入口，不启用 hooks。
- [使用指南](usage.md)：安装、个人配置、启动接入和日常维护分别写什么。
- [访谈框架](../skills/kitsune-setup/references/framework.md)：独立于样本的覆盖维度、具体任务、执行方法和质量对照。
- [首次配置实验](first-run.md)：清理既有个人要求后，由用户从一句安装指令开始试用。
- [接入说明](integration.md)：启动加载、维护配置、Claude command hooks 与仅 skill 模式的区别。
- [维护工具指南](../skills/kitsune-mode/references/maintenance.md)：通用本地工具和宿主适配器的操作契约；语义诊断由当前 agent 完成。
- [检查说明](testing.md)：文件检查、runtime fixture、合成事件与实际模型行为的验证边界。
- [参考来源](sources.md)：借鉴的方法、来源版本和没有继承的操作。
- [规则优先关系研究](research/2026-11-07-rule-precedence.md)：适用范围、条件例外与局部关系的依据，已用于访谈、规则生成和个人核心模板。

旧版实现、规则、研究和讨论保存在维护者本地的 `archive/`，不纳入 Git。新检出不需要这些历史资料。

本仓库采用直接迭代，不再维护 RFC/ADR 流程。文档描述产品行为，不授予安装、发布或读取其他项目的权限。
