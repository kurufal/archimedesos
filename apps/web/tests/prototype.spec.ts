import {expect, test} from '@playwright/test';
import {groups,hosts,totals} from '../src/lib/mock';

test('all sidebar routes load directly without client errors',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const name of Object.values(groups).flat()){
    const response=await page.goto(name==='Dashboard'?'/':`/${name.toLowerCase()}/`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading',{name,level:1,exact:true})).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('host totals, sorting, selection and display persistence',async({page})=>{
  await page.goto('/');
  for(const id of ['',...hosts.map(host=>host.id)]){
    await page.getByLabel('Active system').selectOption(id);
    await expect(page.locator('.metric strong')).toHaveText(totals(id).map(value=>String(value).padStart(2,'0')));
  }
  await page.getByLabel('Active system').selectOption('');
  await page.getByRole('button',{name:'Detailed view'}).click();
  await page.reload();await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button',{name:'Name',exact:true}).click();
  await expect(page.locator('tbody tr').first()).toContainText('Archimedes Core');
  await page.getByRole('button',{name:'Compute Node'}).click();
  await page.getByRole('button',{name:'Select system'}).click();
  await expect(page.getByLabel('Active system')).toHaveValue('compute');
  await page.getByRole('button',{name:'Tile view'}).click();
  await expect(page.locator('.host-card')).toHaveCount(1);
});

test('editor handles diagnostics, dirty tabs, revert, mock save and protected content',async({page})=>{
  await page.goto('/projects/');await page.getByRole('button',{name:'Open workspace'}).first().click();
  const editor=page.getByRole('textbox',{name:'Edit compose.yaml'});
  const original=await editor.innerText();await editor.fill('services: [');
  await expect(page.locator('.editor-status')).toContainText('1 unsaved');
  page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Images',exact:true}).click();
  await expect(editor).toBeVisible();
  await page.getByRole('button',{name:'Revert changes'}).click();await expect(editor).toHaveText(original.replaceAll('\n',''));
  await editor.press('Control+End');await page.keyboard.type('# demo save');await editor.press('Control+s');
  await expect(page.locator('.editor-status')).toContainText('0 unsaved');
  await page.getByRole('button',{name:'config',exact:true}).click();await page.getByRole('button',{name:'app.json',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Edit config/app.json'})).toBeVisible();
  await page.locator('.file-tabs').getByRole('button',{name:'compose.yaml',exact:true}).click();await expect(editor).toContainText('# demo save');
  await page.getByRole('button',{name:'.env',exact:true}).click();await expect(page.locator('.work-main pre')).toContainText('********');
  await page.getByRole('button',{name:'data',exact:true}).click();await page.getByRole('button',{name:'cache.db'}).click();await expect(page.locator('.work-main')).toContainText('read only');
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toMatch(/demo save|synthetic-example/);
});

test('activity artwork follows pointer and queue actions remain local',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:/Activity \d/}).click();const drawer=page.getByRole('dialog');
  const entry=drawer.locator('article').filter({hasText:'Pulling application image'});await entry.hover({position:{x:12,y:12}});
  const art=entry.locator('.row-art');await expect(art).toBeVisible();
  const rotation=()=>entry.evaluate(row=>parseFloat(row.style.getPropertyValue('--preview-rotate')));
  await expect.poll(rotation).toBeLessThan(0);await entry.hover({position:{x:(await entry.boundingBox())!.width-25,y:25}});await expect.poll(rotation).toBeGreaterThan(0);
  expect(await art.evaluate(image=>image instanceof HTMLImageElement && image.naturalWidth>0 && image.getBoundingClientRect().right<=innerWidth && getComputedStyle(image).pointerEvents==='none')).toBe(true);
  await drawer.locator('h2').hover();await expect(art).toBeHidden();await drawer.locator('article').filter({hasText:'Failed'}).getByTitle('Retry').click();await entry.getByTitle('Cancel').click();await expect(entry).toContainText('Cancelled');
  await drawer.getByRole('button',{name:'Clear completed'}).click();await expect(drawer.locator('article').filter({hasText:'Completed'})).toHaveCount(0);await page.keyboard.press('Escape');await expect(drawer).toHaveCount(0);
});

test('activity cleanup removes cancelled rows and confirms host-scoped clear all', async ({page}) => {
  await page.goto('/');
  await page.getByLabel('Active system').selectOption('core');
  await page.getByRole('button',{name:/Activity \d/}).click();
  const drawer = page.getByRole('dialog');
  const pull = drawer.locator('article').filter({hasText:'Pulling application image'});
  const bar = pull.getByRole('progressbar');
  const prior = await bar.getAttribute('value');
  const positions = () => pull.getByRole('button').evaluateAll(buttons => buttons.map(button => {const {x,y}=button.getBoundingClientRect();return [x,y]}));
  const before = await positions();
  await expect(drawer.locator('article').filter({hasText:'Completed'}).first().getByRole('progressbar')).toHaveAttribute('value','100');
  await pull.getByTitle('Cancel').click();
  await expect(bar).toHaveAttribute('value',prior!);
  await expect(pull.getByTitle('Cancel')).toBeDisabled();
  await expect(pull.getByTitle('Retry')).toBeEnabled();
  expect(await positions()).toEqual(before);
  await drawer.getByLabel('Activity status').selectOption('Cancelled');
  await pull.getByRole('button',{name:/Remove/}).click();
  await expect(pull).toHaveCount(0);
  await drawer.getByRole('button',{name:'Clear completed'}).click();
  await expect(drawer.getByRole('button',{name:'Clear completed'})).toBeDisabled();
  await drawer.getByLabel('Activity status').selectOption('Failed');
  const failed = drawer.locator('article').filter({hasText:'Failed'});
  await expect(failed).toHaveCount(1);
  page.once('dialog', prompt => prompt.dismiss());
  await drawer.getByRole('button',{name:'Clear all'}).click();
  await expect(failed).toHaveCount(1);
  await drawer.getByLabel('Activity status').selectOption('Cancelled');
  page.once('dialog', prompt => prompt.accept());
  await drawer.getByRole('button',{name:'Clear all'}).click();
  await expect(drawer.getByRole('button',{name:'Clear all'})).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByLabel('Active system').selectOption('compute');
  await page.getByRole('button',{name:/Activity \d/}).click();
  await expect(drawer.locator('article').filter({hasText:'System package update'})).toBeVisible();
});

test('updates refresh respects the selected host and cleared versions', async ({page}) => {
  await page.goto('/updates/');
  await page.getByLabel('Active system').selectOption('compute');
  const job = page.getByRole('row').filter({hasText:'jellyfin'});
  await job.getByRole('button',{name:'Mock update'}).click();
  await expect(job).toContainText('Completed');
  await page.getByRole('button',{name:'Clear completed'}).click();
  await page.getByRole('button',{name:'Check for updates'}).click();
  await expect(page.getByText(/Last checked: .* UTC/)).toBeVisible();
  await expect(job).toHaveCount(0);
  await expect(page.getByRole('row').filter({hasText:'systemd'})).toContainText('In progress');
  await page.getByLabel('Active system').selectOption('core');
  await expect(page.getByRole('row').filter({hasText:'redis'})).toContainText('Completed');
});

test('responsive keyboard navigation and bulk container action',async({page})=>{
  for(const width of [768,390]){
    await page.setViewportSize({width,height:844});await page.goto('/');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  }
  await page.getByRole('button',{name:'Open navigation'}).focus();await page.keyboard.press('Enter');
  await page.getByRole('link',{name:'Containers',exact:true}).click();await page.getByRole('button',{name:'Detailed view'}).click();
  await page.getByLabel('Search containers...').fill('traefik');await page.getByLabel('Select traefik').check();await page.getByRole('button',{name:'Stop selected'}).click();await expect(page.locator('tbody tr')).toContainText('Stopped');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('scrolling up returns the same filters without resetting the search', async ({page}) => {
  await page.setViewportSize({width:900,height:500});
  await page.goto('/containers/');
  const search = page.getByLabel('Search containers...');
  await search.fill('stable');
  await search.blur();
  const main = page.locator('main'), strip = main.locator('.filter-strip');
  await main.evaluate(pane => pane.scrollTop = 470);
  await expect(strip).toHaveClass(/tucked/);
  await main.evaluate(pane => pane.scrollTop -= 45);
  await expect(strip).not.toHaveClass(/tucked/);
  await expect(strip).toHaveClass(/floating/);
  await expect(search).toBeInViewport();
  await expect(search).toHaveValue('stable');
  await search.focus(); await main.evaluate(pane => pane.scrollTop += 35);
  await expect(search).toBeInViewport();
});

test('project service inspector follows selection and preserves configuration drafts', async ({page}) => {
  await page.goto('/projects/');
  await page.getByRole('button',{name:'Open workspace'}).first().click();
  const editor = page.getByRole('textbox',{name:'Edit compose.yaml'});
  await editor.fill('services: {}\n# draft');
  await page.getByRole('button',{name:'Services',exact:true}).click();
  const tree = page.getByRole('complementary',{name:'Project services'});
  const inspector = page.getByRole('region',{name:'Service inspector'});
  await expect(inspector).toContainText('traefik:stable');
  const left = await tree.boundingBox(), right = await inspector.boundingBox();
  expect(left!.x + left!.width).toBeLessThanOrEqual(right!.x + 1);
  await inspector.getByRole('button',{name:'Shell',exact:true}).click();
  await tree.getByRole('button',{name:'redis',exact:true}).click();
  await inspector.getByLabel('Demo shell command').fill('hostname');
  await inspector.getByRole('button',{name:'Run',exact:true}).click();
  await expect(inspector.locator('pre')).toHaveText('$ hostname\nredis');
  await inspector.getByRole('button',{name:'Processes',exact:true}).click();
  await expect(inspector.getByRole('cell',{name:'redis',exact:true})).toBeVisible();
  await inspector.getByTitle('Stop redis').click();
  await expect(inspector).toContainText('No running processes');
  await inspector.getByRole('button',{name:'Logs',exact:true}).click();
  await expect(inspector.locator('pre')).toContainText('redis: stop (demo), stopped');
  await inspector.getByRole('button',{name:'Metrics',exact:true}).click();
  await expect(inspector.getByLabel('Service CPU')).toHaveAttribute('value','0');
  await inspector.getByRole('button',{name:'Start redis',exact:true}).click();
  await expect(inspector.getByLabel('Service CPU')).toHaveAttribute('value','3');
  await page.getByRole('button',{name:'Configuration',exact:true}).click();
  await expect(editor).toContainText('# draft');
  await expect(page.locator('.editor-status')).toContainText('1 unsaved');
});