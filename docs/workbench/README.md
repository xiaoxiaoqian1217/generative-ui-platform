# Generative UI Workbench 文档

[Workbench 需求规格](../WEB_WORKBENCH_SRS.md) 继续作为 Workbench 子系统的需求输入和评审基线。

## 当前定位

Generative UI Workbench 同时承担：

- Frontend Runtime 参考实现；
- 平台开发联调工作台；
- A2UI Renderer 与 Component Registry 验证环境；
- 平台诊断、验收和回归入口。

Workbench 可以部署到开发或测试环境，但不是独立企业业务产品、正式生产系统或最终用户商业产品。

## 与当前 Goal 的关系

Workbench 的长期工程目录是 `apps/web-workbench`。
当前实施范围和验收要求由以下文档共同约束：

- [平台级需求](../platform/REQUIREMENTS.md)
- [平台级架构](../platform/ARCHITECTURE.md)
- [开发验证环境](../platform/DEVELOPMENT_ENVIRONMENT.md)
- [当前 Goal](../goals/GOAL-DEV-ENV-001.md)
- [当前 Goal 子任务包](../goals/GOAL-DEV-ENV-001/README.md)

## 原 SRS 的解释

原 SRS 中的“产品背景”“产品目的”和“产品定位”等章节，是从软件交付物需求视角描述 Workbench。

这些表述不代表 Workbench 被提升为独立商业产品，也不改变它作为平台开发验证环境的主要定位。
