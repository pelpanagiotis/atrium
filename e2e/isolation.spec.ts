import { expect, test } from "@playwright/test";

const password = "atrium-demo-12";

test("a second account cannot see another person's native project", async ({ browser }) => {
  const stamp = Date.now();
  const ownerEmail = `owner.${stamp}@example.com`;
  const otherEmail = `other.${stamp}@example.com`;
  const projectName = `Private board ${stamp}`;

  const owner = await browser.newContext();
  const ownerPage = await owner.newPage();
  await ownerPage.goto("/register");
  await ownerPage.getByLabel("Name").fill("Owner Example");
  await ownerPage.getByLabel("Email").fill(ownerEmail);
  await ownerPage.getByLabel("Password").fill(password);
  await ownerPage.getByRole("button", { name: "Create account" }).click();
  await expect(ownerPage.getByRole("heading", { name: /workspace/i })).toBeVisible();

  await ownerPage.goto("/projects");
  await ownerPage.getByLabel("Name").fill(projectName);
  await ownerPage.getByRole("button", { name: "Create project" }).click();
  await expect(ownerPage.getByText(projectName)).toBeVisible();

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/register");
  await otherPage.getByLabel("Name").fill("Other Example");
  await otherPage.getByLabel("Email").fill(otherEmail);
  await otherPage.getByLabel("Password").fill(password);
  await otherPage.getByRole("button", { name: "Create account" }).click();
  await expect(otherPage.getByRole("heading", { name: /workspace/i })).toBeVisible();
  await otherPage.goto("/projects");
  await expect(otherPage.getByText(projectName)).toHaveCount(0);
  await expect(otherPage.getByText("No projects in this view")).toBeVisible();

  await owner.close();
  await other.close();
});

test("seeded workspaces stay separate on a phone-sized screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email").fill("mira.vell@atrium.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Mira Vell's workspace" })).toBeVisible();
  await page.getByLabel("Workspace").selectOption({ label: "Northwind Studio · owner" });
  await expect(page.getByRole("heading", { name: "Northwind Studio" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Confirm the vendor shortlist/ }).first()).toBeVisible();
  await page.getByLabel("Workspace").selectOption({ label: "Harbor Ledger · owner" });
  await expect(page.getByRole("heading", { name: "Harbor Ledger" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Confirm the vendor shortlist/ })).toHaveCount(0);
  await page.goto("/tasks");
  await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();
  await expect(page.getByText("File the quarter receipts")).toBeVisible();
});
