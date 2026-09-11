import { test, expect } from "@playwright/test";
import { handle } from "../../worker";

test("existing app searches, saves and logs personal meals without a UI update", async ({
  page,
  context,
}) => {
  const paths: string[] = [];
  await page.route("**/api/**", async (route) => {
    const incoming = route.request();
    paths.push(new URL(incoming.url()).pathname);
    const response = await handle(
      new Request(incoming.url(), { headers: incoming.headers() }),
      {
        PERSONAL_API_TOKEN: "catalog-test-only",
        ASSETS: { fetch: async () => new Response("asset") },
      },
    );
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: await response.text(),
    });
  });
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Catalog test");
  await page.getByRole("button", { name: "Make yourself at home" }).click();
  await page.evaluate(() =>
    localStorage.setItem("daywell-api-token", "catalog-test-only"),
  );
  for (const meal of ["Breakfast burrito", "Teriyaki chicken with rice"]) {
    await page.getByRole("button", { name: "Add food", exact: true }).click();
    await page.getByLabel("Search food", { exact: true }).fill(meal);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page
      .getByRole("button", { name: new RegExp(`Personal ${meal}`) })
      .click();
    await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("1");
    await page
      .getByRole("button", { name: "Add to Breakfast", exact: true })
      .click();
  }
  await expect(page.locator(".calorie-ring")).toContainText("1,626");
  expect(
    await page.locator("body").evaluate((el) => el.scrollWidth),
  ).toBeLessThanOrEqual(
    await page.locator("body").evaluate((el) => el.clientWidth),
  );
  expect(paths).toEqual(["/api/foods/search", "/api/foods/search"]);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Add food", exact: true }).click();
  await page
    .getByLabel("Search food", { exact: true })
    .fill("Personal Breakfast");
  await page
    .locator(".food-result")
    .filter({ hasText: "Personal Breakfast burrito" })
    .click();
  await page
    .getByRole("button", { name: "Add to Breakfast", exact: true })
    .click();
  await expect(page.locator(".calorie-ring")).toContainText("2,376");
});
