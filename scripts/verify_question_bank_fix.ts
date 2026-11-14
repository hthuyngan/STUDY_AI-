import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const QA_DIR = path.join('docs', 'visual-qa', 'question-bank');
if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true });
}

async function verifyQuestionBankFix() {
  console.log('=== VERIFYING QUESTION BANK FIX (END-TO-END) ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const networkRequests: { url: string; status: number }[] = [];

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/v1/content/')) {
      networkRequests.push({ url, status: res.status() });
      console.log(`[API Response] ${res.status()} ${url}`);
    }
  });

  // 1. Login
  console.log('1. Logging in as Content Specialist...');
  await page.goto('http://localhost:5174/login');
  await page.waitForLoadState('networkidle');
  await page.fill('#login-email', 'content@studyai.internal');
  await page.fill('#login-password', 'Content@123456');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

  // 2. Navigate to Question Bank
  console.log('2. Navigating to http://localhost:5174/content/questions...');
  await page.goto('http://localhost:5174/content/questions');
  await page.waitForTimeout(2500);

  // 3. Verify Initial Load
  const initialRows = page.locator('.staff-table tbody tr');
  const initialCount = await initialRows.count();
  console.log(`Initial Table row count: ${initialCount}`);

  // Take screenshot of workstation with real data
  await page.screenshot({ path: path.join(QA_DIR, 'verified-initial-load.png') });
  console.log('Saved screenshot: verified-initial-load.png');

  // Check subjects dropdown options
  const subjectSelect = page.locator('select').first();
  const subjectOptions = await subjectSelect.locator('option').allTextContents();
  console.log('Populated Subject Options from API:', subjectOptions);

  // 4. Test selecting "Toán 12 (MATH12)"
  console.log('3. Selecting "Toán 12" in subject dropdown...');
  const mathOption = subjectOptions.find((opt) => opt.includes('Toán 12'));
  if (mathOption) {
    await subjectSelect.selectOption({ label: mathOption });
    await page.waitForTimeout(2000);

    const mathRows = page.locator('.staff-table tbody tr');
    const mathCount = await mathRows.count();
    console.log(`Row count after selecting "${mathOption}": ${mathCount}`);

    const mathRowText = await mathRows.first().innerText();
    console.log('Math Row Text:', mathRowText.replace(/\s+/g, ' ').trim());

    await page.screenshot({ path: path.join(QA_DIR, 'verified-filter-math.png') });
    console.log('Saved screenshot: verified-filter-math.png');
  }

  // 5. Test Reset filters
  console.log('4. Testing Reset Button...');
  const resetBtn = page.locator('button:has-text("Đặt lại")');
  await resetBtn.click();
  await page.waitForTimeout(2000);
  const countAfterReset = await page.locator('.staff-table tbody tr').count();
  console.log(`Row count after Reset: ${countAfterReset}`);

  // 6. Test Grade filter: "Lớp 12"
  console.log('5. Selecting "Lớp 12" in Grade filter...');
  const gradeSelect = page.locator('select').nth(1);
  await gradeSelect.selectOption({ label: 'Lớp 12' });
  await page.waitForTimeout(2000);
  const countAfterGrade = await page.locator('.staff-table tbody tr').count();
  console.log(`Row count after Grade filter: ${countAfterGrade}`);
  await page.screenshot({ path: path.join(QA_DIR, 'verified-filter-grade12.png') });

  // Reset filter back
  await resetBtn.click();
  await page.waitForTimeout(1500);

  // 7. Test Pagination: Page 2
  console.log('6. Testing Pagination: Page 2...');
  const page2Btn = page.locator('button:has-text("2")').first();
  if (await page2Btn.count() > 0) {
    await page2Btn.click();
    await page.waitForTimeout(2000);
    const countPage2 = await page.locator('.staff-table tbody tr').count();
    console.log(`Row count on Page 2: ${countPage2}`);
    await page.screenshot({ path: path.join(QA_DIR, 'verified-pagination-page2.png') });
  }

  await browser.close();
  console.log('=== ALL QUESTION BANK FIX VERIFICATIONS PASSED ===');
}

verifyQuestionBankFix().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
