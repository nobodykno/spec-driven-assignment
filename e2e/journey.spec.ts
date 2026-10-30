import { expect, test, type Browser, type Page } from '@playwright/test';

// NFR-TST-002: the whole user journey through web → gateway → services → PostgreSQL.
// Needs the running stack (design D14): `pnpm db:up`, `pnpm db:migrate`, then docker compose up
// with JWT_SECRET and INTERNAL_TOKEN set; E2E_BASE_URL=http://localhost:8080 when using nginx.

const PASSWORD = 'Passw0rdx';
const EVIDENCE = 'docs/evidence/DEV-19';

async function register(page: Page, name: string, email: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
}

async function newUserPage(browser: Browser, name: string, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await register(page, name, email);
  return page;
}

test('NFR-TST-002: register, project, member, task, assign, DONE, comment, activity', async ({
  browser,
}) => {
  const run = Date.now();
  const ownerEmail = `owner${run}@example.com`;
  const memberEmail = `member${run}@example.com`;
  const projectName = `Journey ${run}`;
  const taskTitle = `Ship it ${run}`;

  const owner = await test.step('register the owner', () =>
    newUserPage(browser, 'Olivia Owner', ownerEmail));
  const member = await test.step('register the second user', () =>
    newUserPage(browser, 'Max Member', memberEmail));

  await test.step('owner creates a project', async () => {
    await owner.getByLabel('Name').fill(projectName);
    await owner.getByRole('button', { name: 'Create project' }).click();
    await expect(owner.getByRole('link', { name: projectName })).toBeVisible();
  });

  await test.step('owner adds the second user as a member', async () => {
    await owner.getByRole('link', { name: 'Settings' }).first().click();
    await expect(owner.getByRole('heading', { name: 'Project settings' })).toBeVisible();
    await owner.getByLabel('Member email').fill(memberEmail);
    await owner.getByRole('button', { name: 'Add member' }).click();
    await expect(owner.getByText(memberEmail)).toBeVisible();
  });

  await test.step('owner creates a task', async () => {
    await owner.goto(owner.url().replace('/settings', ''));
    await owner.getByLabel('Title').fill(taskTitle);
    await owner.getByRole('button', { name: 'Create task' }).click();
    await expect(owner.getByRole('link', { name: taskTitle })).toBeVisible();
    await owner.getByRole('link', { name: taskTitle }).click();
    await expect(owner.getByRole('heading', { name: taskTitle })).toBeVisible();
  });

  await test.step('owner assigns the task to the member', async () => {
    await owner.getByLabel('Assignee').selectOption({ label: 'Max Member' });
    await expect(owner.getByText('Max Member').first()).toBeVisible();
    await expect(owner.getByRole('alert')).toHaveCount(0);
  });

  await test.step('member moves the task to DONE along the allowed transitions', async () => {
    await member.goto(owner.url());
    await expect(member.getByRole('heading', { name: taskTitle })).toBeVisible();
    for (const status of ['IN_PROGRESS', 'IN_REVIEW', 'DONE']) {
      await member.getByLabel('Status').selectOption(status);
      await expect(member.getByLabel('Status')).toHaveValue(status);
    }
  });

  await test.step('member comments', async () => {
    await member.getByLabel('Add a comment').fill('All done from my side.');
    await member.getByRole('button', { name: 'Post comment' }).click();
    await expect(member.getByText('All done from my side.')).toBeVisible();
  });

  await test.step('owner sees the comment and the activity', async () => {
    await owner.reload();
    await expect(owner.getByText('All done from my side.')).toBeVisible();
    await expect(owner.getByText('created the task')).toBeVisible();
    await expect(owner.getByText('changed the assignee')).toBeVisible();
    await expect(owner.getByText('changed the status')).toHaveCount(3);
    await expect(owner.getByLabel('Status')).toHaveValue('DONE');
    const entries = await owner
      .locator('li')
      .filter({ hasText: /created the task|changed the (assignee|status)/ })
      .allInnerTexts();
    expect(entries[0]).toContain('changed the status');
    expect(entries.at(-1)).toContain('created the task');
    await owner.screenshot({ path: `${EVIDENCE}/journey-task-activity.png`, fullPage: true });
  });
});
