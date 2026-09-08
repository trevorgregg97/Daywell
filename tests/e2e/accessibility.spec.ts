import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("onboarding and check-in dialogs are named and accessible", async ({
  page,
}) => {
  await page.goto("/");
  const scanDialog = async () => {
    await expect(page.getByRole("dialog")).toHaveAccessibleName(/.+/);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  };
  await scanDialog();
  await page.getByLabel("Your name", { exact: true }).fill("Test");
  await page.getByRole("button", { name: "Make yourself at home" }).click();
  for (const name of [/Morning check-in/, /Evening check-in/]) {
    await page.getByRole("button", { name }).click();
    await scanDialog();
    await page.getByRole("button", { name: "Close dialog" }).click();
  }
});
test("key screens have no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Test");
  await page.getByRole("button", { name: "Make yourself at home" }).click();
  for (const name of [
    "Today",
    "Food diary",
    "Nutrients",
    "Trends",
    "Settings",
  ]) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
});
