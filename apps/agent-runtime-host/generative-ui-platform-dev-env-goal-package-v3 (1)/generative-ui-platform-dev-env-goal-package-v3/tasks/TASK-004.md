# TASK-004：UI Compiler Model Adapter 多模型接入

## 目标

扩展 UI Compiler Service 已有 Model Adapter，把 Business Agent 输出转换为 UI Plan Candidate。

## 第一步：现状审计

先检查：

- 当前 Model Adapter 接口；
- 当前 Fixture 或测试模型；
- Prompt；
- UI Plan Candidate Schema；
- Structured Output；
- Timeout；
- Retry；
- AbortSignal；
- 错误映射；
- 日志和诊断。

优先扩展现有实现，禁止创建重复的平行体系。

## 输入

```text
Sanitized AgentContent
Presentation Intent
Component Catalog Context
Policy Context
```

## 输出

```text
UI Plan Candidate
```

## 工作项

- 完善 Fixture Model Adapter；
- 实现或完善 OpenAI-compatible 基础适配；
- 实现 Provider Registry；
- 支持 Kimi；
- 支持豆包；
- 支持 GLM；
- 支持通义千问；
- 模型名、Base URL、Endpoint ID、API Key 全部配置化；
- 支持 Timeout、Abort、有限 Retry；
- 统一错误和 Usage；
- 强制 UI Plan Candidate Schema；
- 增加 Provider Contract Test；
- 增加真实 Provider Smoke Test；
- 增加安全日志和诊断。

## 限制

- Model Adapter 必须位于 UI Compiler Service；
- 不用于 Business Agent 业务推理；
- 不处理业务工具；
- 不直接生成可信 A2UI；
- 不生成 HTML、Vue 或任意代码；
- API Key 不得进入浏览器或日志。

## 验收

- Fixture 确定性通过；
- 至少一个真实 Provider Smoke 通过；
- Kimi、豆包、GLM、通义千问均可配置；
- 更换 Provider 不修改 UI Compiler Core；
- 所有模型输出通过 UI Plan Candidate Schema；
- 错误进入重试、降级或失败路径。
