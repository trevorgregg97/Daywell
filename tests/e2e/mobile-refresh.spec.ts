import { test, expect } from "@playwright/test";
test("morning is visible above coincident trends and dark controls remain usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Trevor");
  await page.getByRole("button", { name: "Make yourself at home" }).click();
  for (const [date, weight] of [
    ["2026-09-08", "177.5"],
    ["2026-09-09", "176.8"],
    ["2026-09-10", "175.2"],
  ]) {
    await page.getByLabel("Selected date").fill(date);
    await page.getByRole("button", { name: /Morning check-in/ }).click();
    await page.getByLabel("Weight (lb)", { exact: true }).fill(weight);
    await page.getByRole("button", { name: "Save check-in" }).click();
  }
  await expect(
    page.getByText(/Stay hydrated|Log water|Progress is a pattern/),
  ).toHaveCount(0);
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  const checkin = await page
    .getByRole("button", { name: /Morning check-in/ })
    .boundingBox();
  expect(checkin!.height).toBeGreaterThanOrEqual(48);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Trends", exact: true })
    .click();
  const chart = page.locator("svg.chart").first();
  await expect(chart.locator("g[data-series]").last()).toHaveAttribute(
    "data-series",
    "Morning",
  );
  await expect(chart.locator('g[data-series="Morning"] circle')).toHaveCount(3);
  await expect(chart.locator('g[data-series="Morning"] path')).toHaveAttribute(
    "stroke-dasharray",
    "9 6",
  );
  await expect(page.getByText("How this estimate works")).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "Drinking water" }),
  ).toHaveCount(0);
  expect(
    await page.locator("body").evaluate((el) => el.scrollWidth),
  ).toBeLessThanOrEqual(
    await page.locator("body").evaluate((el) => el.clientWidth),
  );
  await page.screenshot({
    path: `test-results/dark-trends-${test.info().project.name}.png`,
    fullPage: true,
  });
});
