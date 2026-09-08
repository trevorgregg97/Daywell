import { test, expect } from "@playwright/test";
test("encrypted backup restores check-ins and screen lock works", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Backup test");
  await page.getByRole("button", { name: "Make yourself at home" }).click();
  await page.getByRole("button", { name: /Morning check-in/ }).click();
  await page.getByLabel("Weight (lb)", { exact: true }).fill("170");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page
    .getByLabel("Backup password (at least 10 characters)")
    .fill("strong backup test password");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Create backup" }).click();
  const downloaded = await downloading;
  const file = await downloaded.path();
  expect(file).toBeTruthy();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Today", exact: true })
    .click();
  await page.getByRole("button", { name: /Morning check-in/ }).click();
  await page.getByLabel("Weight (lb)", { exact: true }).fill("175");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page
    .getByLabel("Backup password (at least 10 characters)")
    .fill("strong backup test password");
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles(file!);
  await expect(page.getByRole("status")).toContainText("Backup restored");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Today", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Morning check-in/ }),
  ).toContainText("170.0 lb");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page
    .getByLabel("Screen-lock password", { exact: true })
    .fill("strong lock test password");
  await page.getByRole("button", { name: "Enable lock" }).click();
  await expect(page.getByRole("status")).toContainText("Screen lock enabled");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.getByLabel("App password").fill("wrong");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Incorrect");
  await page.getByLabel("App password").fill("strong lock test password");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Morning check-in/ }),
  ).toContainText("170.0 lb");
});
