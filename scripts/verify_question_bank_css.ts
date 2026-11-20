import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const FRONTEND_URL = 'http://localhost:5174';
const QA_DIR = path.join('docs', 'visual-qa', 'question-bank');

if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true });
}

async function run() {
  console.log('--- Starting Question Bank Visual QA Verification ---');
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'desktop-1280', width: 1280, height: 800 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    console.log(`Testing viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    // Login as Content Specialist
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('#login-email', 'content@studyai.internal');
    await page.fill('#login-password', 'Content@123456');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // Navigate to Question Bank
    await page.goto(`${FRONTEND_URL}/content/questions`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.staff-table tbody tr', { timeout: 15000 });

    if (vp.width >= 1024) {
      // Desktop: 2-column layout is visible immediately
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(QA_DIR, `${vp.name}-workstation.png`),
        fullPage: false,
      });
      console.log(`Saved screenshot: ${vp.name}-workstation.png`);
    } else {
      // Tablet / Mobile: Table is visible first
      await page.screenshot({
        path: path.join(QA_DIR, `${vp.name}-table.png`),
        fullPage: false,
      });
      console.log(`Saved screenshot: ${vp.name}-table.png`);

      // Tap first row to open drawer
      const firstRow = page.locator('.staff-table tbody tr').first();
      await firstRow.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(QA_DIR, `${vp.name}-drawer-open.png`),
        fullPage: false,
      });
      console.log(`Saved screenshot: ${vp.name}-drawer-open.png`);

      // Close drawer
      const closeDrawerBtn = page.locator('button[title="Đóng bảng xem trước"]');
      if (await closeDrawerBtn.count() > 0) {
        await closeDrawerBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // Only test modals and menus on the desktop-1440 pass
    if (vp.name === 'desktop-1440') {
      // 1. Kebab menu open
      const firstKebabBtn = page.locator('.staff-table tbody tr button[title="Thao tác khác"]').first();
      await firstKebabBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(QA_DIR, 'kebab-menu-open.png'),
      });
      console.log('Saved screenshot: kebab-menu-open.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // 2. Standalone Preview modal
      const previewBtn = page.locator('.staff-table tbody tr button[title="Xem trước"]').first();
      await previewBtn.click();
      await page.waitForSelector('.staff-modal', { timeout: 5000 });
      await page.screenshot({
        path: path.join(QA_DIR, 'modal-preview-katex.png'),
      });
      console.log('Saved screenshot: modal-preview-katex.png');
      await page.click('.staff-modal-close');
      await page.waitForSelector('.staff-modal', { state: 'detached', timeout: 5000 });

      // 3. Create Question Modal
      await page.click('button:has-text("Soạn câu hỏi mới")');
      await page.waitForSelector('.staff-modal', { timeout: 5000 });
      await page.screenshot({
        path: path.join(QA_DIR, 'modal-create-question.png'),
      });
      console.log('Saved screenshot: modal-create-question.png');
      await page.click('.staff-modal-close');
      await page.waitForSelector('.staff-modal', { state: 'detached', timeout: 5000 });
    }

    await context.close();
  }

  await browser.close();
  console.log('--- Visual QA Verification Complete ---');
}

run().catch((err) => {
  console.error('Visual QA failed:', err);
  process.exit(1);
});
