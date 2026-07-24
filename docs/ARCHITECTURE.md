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

## 3. Future Platform Architecture Roadmap

This section is non-normative.
It records a possible future platform direction and is not part of the current MVP design, contracts, tests, or acceptance criteria.

Frontend
    → Interaction Gateway
    → Business Agents
    → UI Compiler Core
