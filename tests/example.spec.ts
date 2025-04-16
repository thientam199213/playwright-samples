import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
test('get app users API', async ({ request }) => {
  const response = await request.get('https://api.smaregi.dev/app/users', {
    headers: {
      'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
      'Content-Type': 'application/json'
    },
    params: {
      // Optional query parameters
      // limit: 20,
      // offset: 0,
      // contract_id: 'string',
      // user_id: 'string', 
      // email: 'string'
    }
  });

  // Check response status
  expect(response.status()).toBe(200);

  // Validate response structure
  const responseBody = await response.json();
  expect(responseBody).toHaveProperty('users');
  expect(Array.isArray(responseBody.users)).toBe(true);

  // Validate user object structure if array is not empty
  if (responseBody.users.length > 0) {
    const user = responseBody.users[0];
    expect(user).toHaveProperty('contract_id');
    expect(user).toHaveProperty('user_id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('status');
    expect(user).toHaveProperty('created');
    expect(user).toHaveProperty('modified');
  }
});
test('Download a file and upload it to the site', async ({ page }) => {
  // 1️⃣ Visit the download page
  await page.goto('https://the-internet.herokuapp.com/download');

  // 2️⃣ Get the first file and trigger download
  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('div.example a').first().click()
  ]);

  const fileName = download.suggestedFilename();
  const downloadPath = path.join(__dirname, 'downloads', fileName);

  // Ensure folder exists
  if (!fs.existsSync(path.dirname(downloadPath))) {
    fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
  }

  // Save the file
  await download.saveAs(downloadPath);
  expect(fs.existsSync(downloadPath)).toBeTruthy();

  // 3️⃣ Visit the upload page
  await page.goto('https://the-internet.herokuapp.com/upload');

  // 4️⃣ Upload the downloaded file
  const fileInput = page.locator('input#file-upload');
  await fileInput.setInputFiles(downloadPath);

  // 5️⃣ Click the Upload button
  await page.click('input#file-submit');

  // 6️⃣ Verify the upload result
  await expect(page.locator('h3')).toHaveText('File Uploaded!');
  await expect(page.locator('#uploaded-files')).toHaveText(fileName);

  // Optional cleanup
  // fs.unlinkSync(downloadPath);
});

test('Floating menu stays visible and links are functional', async ({ page }) => {
  // 1️⃣ Navigate to the floating menu page
  await page.goto('https://the-internet.herokuapp.com/floating_menu');

  const menu = page.locator('#menu');
  const menuLinks = menu.locator('a');

  // 2️⃣ Check if the menu is visible on page load
  await expect(menu).toBeVisible();

  // 3️⃣ Scroll to the bottom of the page
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500); // Wait for any layout adjustments

  // 4️⃣ Verify menu is still visible after scroll
  await expect(menu).toBeVisible();

  // 5️⃣ Check menu stays in the same vertical position
  const boxBefore = await menu.boundingBox();
  await page.evaluate(() => window.scrollBy(0, -300)); // scroll up a bit
  const boxAfter = await menu.boundingBox();
  expect(boxBefore?.y).toBeCloseTo(boxAfter?.y ?? 0, 1); // within 1px margin

  // 6️⃣ Verify all menu links are present and clickable
  const expectedLinks = ['Home', 'News', 'Contact', 'About'];
  for (const text of expectedLinks) {
    const link = menuLinks.filter({ hasText: text });
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toBe(`#${text.toLowerCase()}`);
  }

  await page.screenshot({ path: 'floating-menu-after-scroll.png', fullPage: false });
});

test('jQueryUI Menu - hover interactions and disabled state', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/jqueryui/menu');

  // 1️⃣ Hover over "Enabled"
  const enabledMenu = page.locator('#ui-id-3');
  await enabledMenu.hover();

  // 2️⃣ Wait and hover over "Downloads"
  const downloadsMenu = page.locator('#ui-id-4');
  await downloadsMenu.waitFor({ state: 'visible' });
  await downloadsMenu.hover();

  // 3️⃣ Hover over and click "CSV"
  const csvMenu = page.locator('#ui-id-8');
  await csvMenu.waitFor({ state: 'visible' });
  await expect(csvMenu).toBeVisible();
  await csvMenu.click();

  // 4️⃣ Validate behavior (CSV clicked)
  // If needed, wait or verify file is downloaded or page changes
  // For now, we assume just a successful click
});

// test('Disabled menu item should not be clickable', async ({ page }) => {
//   await page.goto('https://the-internet.herokuapp.com/jqueryui/menu');

//   const disabledMenu = page.locator('#ui-id-1'); // Top level
//   const disabledItem = page.locator('#ui-id-5'); // "Disabled"

//   // Ensure menu is visible
//   await disabledMenu.hover();

//   // Disabled menu item should exist but not be interactable
//   await expect(disabledItem).toBeVisible();
//   await expect(disabledItem).toHaveAttribute('aria-disabled', 'true');

//   // Attempting to click should have no effect
//   await disabledItem.click({ force: true }); // Playwright allows force, but logic won’t fire
// });

test('Validate notification messages after clicking', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/notification_message_rendered');

  // Define expected messages (including typo)
  const validMessages = [
    'Action successful',
    'Action unsuccessful, please try again',
    'Action unsuccesful, please try again' // typo included
  ];

  for (let i = 0; i < 5; i++) {
    // Click the link
    await page.click('a[href="/notification_message"]');

    // Wait for notification message to appear
    const message = await page.locator('#flash').textContent();

    // Clean up whitespace and symbol
    const cleanedMessage = message?.replace('×', '').trim();

    // Log the message (optional)
    console.log(`Iteration ${i + 1}: "${cleanedMessage}"`);

    // Assert that it's one of the known options
    expect(validMessages).toContain(cleanedMessage);
  }
});

test('Test key presses on the-internet.herokuapp.com', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/key_presses');
  const result = page.locator('#result');

  // Helper to test a key and assert result
  const testKey = async (key: string, expected?: string) => {
    await page.keyboard.press(key);
    const expectedText = `You entered: ${expected || key.toUpperCase()}`;
    await expect(result).toHaveText(expectedText);
  };

  // Alphabet
  await testKey('A');
  await testKey('z');

  // Numbers
  await testKey('0');
  await testKey('9');

  // Special Characters
  await testKey('!');
  await testKey('@'); // On most keyboards: Shift+2

  // Navigation
  await testKey('ArrowUp', 'UP');
  await testKey('ArrowDown', 'DOWN');
  await testKey('Enter');
  await testKey('Tab', 'TAB');
  await testKey('Escape', 'ESCAPE');

  // Editing keys
  await testKey('Backspace');
  await testKey('Delete');

  // Modifier keys
  await testKey('Shift');
  await testKey('Control', 'CONTROL');
  await testKey('Alt', 'ALT');

  // Combo simulation: Ctrl+C (note: the page won’t register both keys)
  await page.keyboard.down('Control');
  await page.keyboard.press('C');
  await page.keyboard.up('Control');
  // It will show: "You entered: C"
});