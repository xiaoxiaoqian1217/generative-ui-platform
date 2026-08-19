import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/__control__/restore");
});

test("Scenario Lab lists repository scenarios and runs one through the real generation chain", async ({
  page,
}) => {
  await page.goto("/scenarios");

  await expect(page.getByTestId("scenario-lab-list")).toContainText("summary");
  await expect(page.getByTestId("scenario-lab-content")).toHaveValue(
    /partial_success/,
  );
  await expect(page.getByTestId("scenario-lab-facts")).toHaveValue(/\/total/);

  await page.getByTestId("scenario-lab-run").click();

  await expect(page.getByTestId("scenario-lab-surface")).toBeVisible();
  const factCheck = page.getByTestId("scenario-lab-fact-check");
  await expect(factCheck).toBeVisible();
  await expect(factCheck.locator("li")).toHaveCount(5);
  await expect(factCheck).toContainText("/total = 128");
  await expect(factCheck).toContainText("/failed = 8");
});
