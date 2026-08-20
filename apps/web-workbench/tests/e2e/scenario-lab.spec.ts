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

test("Scenario Lab drafts content from a description without touching facts", async ({
  page,
}) => {
  await page.goto("/scenarios");

  await page.getByTestId("scenario-lab-new-name").fill("draft-demo");
  await page.getByTestId("scenario-lab-new-name").press("Enter");

  await page
    .getByTestId("scenario-lab-draft-description")
    .fill("三台设备一台异常的巡检结果");
  await page.getByTestId("scenario-lab-draft").click();

  await expect(page.getByTestId("scenario-lab-content")).toHaveValue(
    /"total": 3/,
  );
  await expect(page.getByTestId("scenario-lab-content")).toHaveValue(
    /三台设备一台异常的巡检结果/,
  );
  await expect(page.getByTestId("scenario-lab-facts")).toHaveValue(
    /\{\s*"facts": \[\]\s*\}/,
  );
  await expect(page.getByTestId("scenario-lab-save")).toBeDisabled();
  await page
    .getByTestId("scenario-lab-facts")
    .fill(
      JSON.stringify({ facts: [{ pointer: "/total", value: 3 }] }, null, 2),
    );
  await expect(page.getByTestId("scenario-lab-save")).toBeDisabled();
  await page.getByTestId("scenario-lab-draft-reviewed").check();
  await expect(page.getByTestId("scenario-lab-save")).toBeEnabled();
  await expect(page.getByTestId("scenario-lab-notice")).toContainText(
    "尚未保存",
  );
});

test("Scenario Lab discards a draft response after switching scenarios", async ({
  page,
}) => {
  await page.route("**/dev/scenarios/draft", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      body: JSON.stringify({
        content: {
          failed: 1,
          marker: "stale-draft",
          status: "partial",
          total: 3,
        },
        ok: true,
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.goto("/scenarios");
  await page.getByTestId("scenario-lab-new-name").fill("draft-race");
  await page.getByTestId("scenario-lab-new-name").press("Enter");
  await page
    .getByTestId("scenario-lab-draft-description")
    .fill("延迟返回的草稿");
  await page.getByTestId("scenario-lab-draft").click();
  await page.getByRole("button", { name: "summary" }).click();

  await page.waitForTimeout(350);
  await expect(page.getByTestId("scenario-lab-content")).toHaveValue(
    /partial_success/,
  );
  await expect(page.getByTestId("scenario-lab-content")).not.toHaveValue(
    /stale-draft/,
  );
});
