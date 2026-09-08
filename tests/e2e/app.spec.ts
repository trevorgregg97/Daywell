import { test, expect } from "@playwright/test";
test("private diary, check-ins, recipes and offline persistence", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1") && !r.url().startsWith("data:"))
      external.push(r.url());
  });
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Trevor");
  await page.getByRole("button", { name: "Make yourself at home" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /Morning check-in/ }).click();
  await page.getByLabel("Weight (lb)", { exact: true }).fill("170");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(
    page.getByRole("button", { name: /Morning check-in/ }),
  ).toContainText("170.0 lb");
  await page.getByRole("button", { name: "Add food", exact: true }).click();
  await page.getByRole("button", { name: "Create food" }).click();
  await page.getByLabel("Food name", { exact: true }).fill("Breakfast oats");
  await page.getByLabel("Energy (kcal)", { exact: true }).fill("380");
  await page.getByLabel("Protein (g)", { exact: true }).fill("13");
  await page.getByLabel("Carbohydrate (g)", { exact: true }).fill("68");
  await page.getByLabel("Fat (g)", { exact: true }).fill("7");
  await page.getByRole("button", { name: "Save food", exact: true }).click();
  await page.getByLabel("Quantity", { exact: true }).fill("0.5");
  await page
    .getByRole("button", { name: "Add to Breakfast", exact: true })
    .click();
  await expect(page.locator(".calorie-ring")).toContainText("190");
  await page.getByRole("button", { name: /Evening check-in/ }).click();
  await page.getByLabel("Weight (lb)", { exact: true }).fill("172");
  await page.getByLabel("Total steps for this day").fill("8500");
  await page.getByLabel("My food diary is complete for this day").check();
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(
    page.getByRole("button", { name: /Evening check-in/ }),
  ).toContainText("8,500 steps");
  await page.getByRole("button", { name: "Log water", exact: true }).click();
  await page.getByLabel("Water (ml)", { exact: true }).fill("500");
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(page.locator(".hydration-card")).toContainText("0.5 / 2 L");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Nutrients", exact: true })
    .click();
  await expect(
    page
      .getByRole("row")
      .filter({ has: page.getByRole("button", { name: "Iron", exact: true }) }),
  ).toContainText("Unknown");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Trends", exact: true })
    .click();
  await expect(page.getByText("Your energy picture")).toBeVisible();
  await expect(page.getByText("provisional", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Food diary", exact: true })
    .click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Morning bowl");
  await page
    .getByLabel("Ingredient from your food library")
    .selectOption({ label: "Breakfast oats" });
  await page
    .getByRole("button", { name: "Add ingredient", exact: true })
    .click();
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(page.getByText("Morning bowl", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Today", exact: true })
    .click();
  await page.screenshot({
    path: `test-results/daywell-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".calorie-ring")).toContainText("190");
  await page.getByRole("button", { name: /Morning check-in/ }).click();
  await page.getByLabel("Weight (lb)", { exact: true }).fill("169.5");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Morning check-in/ }),
  ).toContainText("169.5 lb");
  expect(external).toEqual([]);
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((el) => el.clientWidth),
  );
});
