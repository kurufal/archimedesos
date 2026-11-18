import { expect, test, type APIResponse, type Page, type Route } from '@playwright/test';

async function interceptXterm(page:Page, handle:(route:Route,response:APIResponse)=>Promise<void>) {
  await page.route('**/_app/immutable/chunks/*.js', async route => {
    const response = await route.fetch();
    if ((await response.text()).includes('xterm-helper-textarea')) await handle(route,response);
    else await route.fulfill({response});
  });
}

test('Terminal preloads only on its route and pending tabs can be switched and closed safely', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => release = resolve);
  let requests = 0;
  await interceptXterm(page,async (route,response) => { requests++; await gate; await route.fulfill({response}); });
  const errors: string[] = [];
  page.on('pageerror',error => errors.push(error.message));
  try {
    await page.goto('/',{waitUntil:'networkidle'});
    expect(requests).toBe(0);
    await page.getByRole('link',{name:'Terminal',exact:true}).click();
    await expect.poll(() => requests).toBe(1);
    const add = page.getByRole('button',{name:'New tab'});
    const tabs = page.locator('[data-tab-id]');
    const terminal = page.locator('.xterm:visible');
    await add.evaluate(button => {for (let index=0; index<3; index++) (button as HTMLButtonElement).click();});
    await expect(tabs).toHaveCount(3);
    const ids = await tabs.evaluateAll(items => items.map(item => (item as HTMLElement).dataset.tabId));
    expect(new Set(ids).size).toBe(3);
    await expect(page.getByText('Loading terminal…',{exact:true}).filter({visible:true})).toBeVisible();
    await expect(terminal).toHaveCount(0);

    await tabs.nth(1).getByRole('button',{name:'Archimedes Core',exact:true}).click();
    await tabs.nth(1).getByTitle('Close Archimedes Core').evaluate(button => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
    await expect(tabs).toHaveCount(2);
    await tabs.first().getByRole('button',{name:'Archimedes Core',exact:true}).click();
    release();
    await expect(terminal).toContainText('Demo terminal: Archimedes Core');
    await expect(page.locator(`[data-session-id="${ids[1]}"]`)).toHaveCount(0);
    await expect(page.locator('.xterm')).toHaveCount(1);
    await expect(page.locator('.terminal-status')).toContainText(/[1-9]\d* × [1-9]\d*/);
    await tabs.last().getByRole('button',{name:'Archimedes Core',exact:true}).click();
    await expect(page.locator('.xterm')).toHaveCount(2);
    await expect(terminal).toHaveCount(1);
    await expect.poll(() => tabs.evaluateAll(items => items.map(item => (item as HTMLElement).dataset.tabId))).toEqual([ids[0],ids[2]]);
    const oldRenderer = await terminal.elementHandle();
    await page.getByRole('link',{name:'Dashboard',exact:true}).click();
    await expect(page.locator('.xterm')).toHaveCount(0);
    expect(await oldRenderer?.evaluate(element => element.isConnected)).toBe(false);
    expect(errors).toEqual([]);
  } finally { release(); }
});

test('Terminal shows initialization failure without closing the tab', async ({page}) => {
  await interceptXterm(page, route => route.abort('failed'));
  await page.goto('/terminal/');
  const add = page.getByRole('button',{name:'New tab'});
  await add.click();
  await expect(page.getByRole('alert')).toContainText('Terminal could not initialize');
  await expect(page.locator('[data-tab-id]')).toHaveCount(1);
  await expect(page.locator('.xterm')).toHaveCount(0);
  await page.getByTitle('Close Archimedes Core').click();
  await expect(page.getByText('No terminal tabs.')).toBeVisible();
});