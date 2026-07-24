# Architecture

## 1. Current MVP Architecture

External Caller
    → HTTP / AG-UI
UI Compiler Agent
    → internal function call
UI Compiler Core
    → A2UI / Fallback

## 2. Current Dependency Direction

ui-compiler-agent → ui-compiler-core
ui-compiler-core → contract packages

## 3. Future Platform Architecture

Frontend
    → Interaction Gateway
    → Business Agents
    → UI Compiler Core
