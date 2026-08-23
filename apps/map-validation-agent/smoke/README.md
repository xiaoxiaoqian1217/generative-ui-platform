# Real LLM smoke evidence

Record one table row for each required local run after inspecting the public AG-UI and Workbench evidence.
Do not record credentials, hidden reasoning, or unredacted sensitive content.

| Source id | Scenario id | Version | Model id | Prompt version | Temperature | Tool Call and Result summary | HITL response | Final answer boundary | Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `map-validation-agent` | `north-corridor-overview-v1` | `1` | Pending local smoke | `map-validation-v1` | `0` | Pending local smoke | Not applicable | Pending local smoke | Pending |
| `map-validation-agent` | `north-corridor-route-choice-v1` | `1` | Pending local smoke | `map-validation-v1` | `0` | Pending local smoke | Select route B | Pending local smoke | Pending |
| `map-validation-agent` | `north-corridor-route-choice-reversed-v1` | `1` | Pending local smoke | `map-validation-v1` | `0` | Pending local smoke | Required consultation | Pending local smoke | Pending |

Replace every pending field only with evidence from an actual real-provider run.
These three smoke runs establish that the live interaction loop can execute, but they do not establish a success rate or statistical reliability claim.
