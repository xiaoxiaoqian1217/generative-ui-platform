# Architecture

## 1. Product Architecture

Generative UI Compiler is an Agent interaction infrastructure layer.

Its responsibility is to transform Agent output into controlled, declarative UI descriptions.

It does not manage business Agent execution, routing, workflow state, or business logic.

```text
Business Agent / LLM Agent
(LangGraph / Claude / OpenAI Agent)

        |
        | Agent Output
        v

UI Compiler Agent
        |
        | internal call
        v

UI Compiler Core
        |
        v

Presentation UI Schema / A2UI
        |
        v

Frontend Runtime Renderer
```

## 2. Current MVP Components

### UI Compiler Agent

Responsibilities:

- Provide HTTP / AG-UI interface;
- Receive external compilation requests;
- Validate requests;
- Invoke UI Compiler Core;
- Return compiled UI result.

It is an adapter service, not a business Agent.

### UI Compiler Core

Responsibilities:

- Parse Markdown or structured data;
- Analyze presentation intent;
- Select components from Component Catalog;
- Build UI IR;
- Compile to A2UI;
- Validate schema;
- Provide fallback output.

Core must remain independent from:

- frontend frameworks;
- network services;
- specific Agent frameworks;
- business domains.

## 3. Component Extension Model

Generative UI Compiler does not automatically create arbitrary business UI components.

Business-specific components are provided through Component Registry.

```text
Component Catalog

├── Common Components
│   ├── Card
│   ├── Table
│   └── Form
│
└── Domain Components
    ├── GISMapPanel
    ├── DeviceControlPanel
    └── TaskManagementPanel
```

Compiler only performs component selection and schema compilation.

## 4. Dependency Direction

```text
ui-compiler-agent
        |
        v
ui-compiler-core
        |
        v
contract packages
```

## 5. Future Platform Extension: Interaction Gateway

This section describes a possible future architecture and is not part of the current MVP.

Interaction Gateway solves Agent orchestration problems:

- multiple Agent routing;
- Agent collaboration;
- task/session state management;
- human approval workflows.

Relationship:

```text
Frontend
    |
    v
Interaction Gateway
    |
    +---- Business Agents
    |
    +---- Generative UI Compiler
```

Interaction Gateway composes Generative UI Compiler capabilities. It does not replace or contain the Compiler.
