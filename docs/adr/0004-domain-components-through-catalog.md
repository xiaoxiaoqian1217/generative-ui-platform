# ADR-0004: Declare domain components through Component Catalog

- **Status:** Accepted
- **Date:** 2026-07-24

Generative UI Compiler must support domain-specific UI without learning domain logic or implementing frontend components.
The MVP therefore allows Component Catalogs to declare domain component types, semantics, Props Schema, Action Schema, and structural constraints.
UI Compiler Core may select those declarations exactly like common components, while the external Component Registry remains responsible for mapping component types to real frontend implementations.

This decision expands MVP contract fixtures and tests to cover at least one domain component declaration.
It does not add a Frontend Runtime, Component Registry implementation, real domain component, or domain business logic to the MVP.
