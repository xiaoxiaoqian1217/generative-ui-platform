/**
 * Deterministic adapter for the dev-only Scenario fixture authoring seam.
 */
export async function draftScenarioFixture(description) {
  return {
    failed: 1,
    note: description,
    ok: 2,
    status: "partial_success",
    total: 3,
  };
}
