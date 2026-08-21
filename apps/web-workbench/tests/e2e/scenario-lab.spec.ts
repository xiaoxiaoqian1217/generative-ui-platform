import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/__control__/restore");
});

test("Scenario Lab freely generates a preview without sending the evaluation oracle", async ({
  page,
}) => {
  await page.goto("/scenarios");

  await expect(page.getByTestId("scenario-lab-list")).toContainText("summary");
  await expect(page.getByTestId("scenario-lab-content")).toHaveValue(
    /partial_success/,
  );
  await expect(page.getByTestId("scenario-lab-facts-editor")).toHaveCount(0);

  await page.getByTestId("scenario-lab-run").click();

  await expect(page.getByTestId("scenario-lab-surface")).toBeVisible();
  await expect(page.getByTestId("scenario-lab-fact-check")).toHaveCount(0);
  await expect(page.getByText("自由生成预览 · 未执行事实评估")).toBeVisible();
});

test("Scenario Lab runs a five-round evaluation with real generation results", async ({
  page,
}) => {
  await page.goto("/scenarios");

  await page.getByTestId("scenario-lab-evaluate").click();

  const evaluation = page.getByTestId("scenario-lab-evaluation");
  await expect(evaluation).toBeVisible();
  await expect(evaluation.locator("tbody tr")).toHaveCount(5);
  await expect(page.getByTestId("scenario-lab-list")).toContainText(
    "5 轮 · 5/5",
  );
});

test("Scenario Lab drafts content from a description without touching facts", async ({
  page,
}) => {
  await page.goto("/scenarios");

  await page.getByTestId("scenario-lab-new-name").fill("draft-demo");
  await page.getByTestId("scenario-lab-new-name").press("Enter");

  await page.getByTestId("scenario-lab-draft-entry").click();
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
  await page.getByTestId("scenario-lab-run").click();
  await expect(page.getByTestId("scenario-lab-surface")).toBeVisible();
  await expect(page.getByTestId("scenario-lab-fact-row")).toHaveCount(0);
  await expect(page.getByTestId("scenario-lab-save")).toBeDisabled();
  await page.getByTestId("scenario-lab-evaluation-toggle").click();
  await page.getByTestId("scenario-lab-facts-json-tab").click();
  await page
    .getByTestId("scenario-lab-facts")
    .fill(
      JSON.stringify({ facts: [{ pointer: "/total", value: 3 }] }, null, 2),
    );
  await expect(page.getByTestId("scenario-lab-save")).toBeDisabled();
  await page.getByTestId("scenario-lab-draft-reviewed").check();
  await expect(page.getByTestId("scenario-lab-save")).toBeEnabled();
  await expect(
    page.getByText("AI 草稿待审定 - 保存为评估场景前需要核对业务事实"),
  ).toBeVisible();
});

test("Scenario Lab discards a draft response after switching scenarios", async ({
  page,
}) => {
  await page.route("**/api/dev/scenario-lab/fixture-drafts", async (route) => {
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
  await page.getByTestId("scenario-lab-draft-entry").click();
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
