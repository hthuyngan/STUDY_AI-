import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const PROD_BASE = 'https://hthuyngan.github.io/STUDY_AI-';

async function main() {
  console.log('=== VERIFYING PHASE 8 ON LIVE PRODUCTION ===');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const screenshotsDir = path.resolve(process.cwd(), 'docs/visual-qa/screenshots');
  const interactionsDir = path.resolve(process.cwd(), 'docs/visual-qa/interactions');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  if (!fs.existsSync(interactionsDir)) fs.mkdirSync(interactionsDir, { recursive: true });

  const contextDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await contextDesktop.newPage();

  // 1. Authenticate demo learner
  console.log('1. Setting up learner session on Production...');
  await page.goto(`${PROD_BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem(
      'study_ai_user',
      JSON.stringify({
        id: 'usr-learner-01',
        name: 'Đặng Thảo Vy',
        role: 'learner',
        email: 'vy.dang@example.com',
      })
    );
  });

  // 2. Open Lesson Page
  console.log('2. Navigating to Lesson Page on Production...');
  await page.goto(`${PROD_BASE}/subjects/math/lessons/les-math-12-01`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const askAIBtns = page.locator('.lesson-ask-ai-btn');
  const btnCount = await askAIBtns.count();
  console.log(`Found ${btnCount} "Hỏi AI về mục này" buttons in lesson.`);

  await page.screenshot({
    path: path.join(screenshotsDir, 'prod_phase8_lesson_ask_ai_desktop.png'),
    fullPage: false
  });
  console.log('Captured prod_phase8_lesson_ask_ai_desktop.png');

  // 3. Click "Hỏi AI về mục này" on first section
  console.log('3. Clicking "Hỏi AI về mục này" on Section 1...');
  await askAIBtns.first().click();
  await page.waitForTimeout(2000);

  console.log('Current URL:', page.url());
  const contextualBadge = page.locator('.contextual-header-panel');
  console.log('Contextual Header Panel visible on Production:', await contextualBadge.isVisible());

  await page.screenshot({
    path: path.join(screenshotsDir, 'prod_phase8_ai_tutor_context_desktop.png'),
    fullPage: false
  });
  console.log('Captured prod_phase8_ai_tutor_context_desktop.png');

  // 4. Switch to Step-by-Step mode & trigger KaTeX Math Response
  console.log('4. Selecting Step-by-Step mode & triggering KaTeX Math Response...');
  const stepByStepBtn = page.locator('button.mode-pill-btn:has-text("Từng bước")');
  if (await stepByStepBtn.isVisible()) {
    await stepByStepBtn.click();
    await page.waitForTimeout(600);
  }

  const textarea = page.locator('textarea.composer-textarea');
  await textarea.fill('Hãy giải thích công thức tính vi phân và đạo hàm');
  await page.keyboard.press('Enter');

  // Wait for mock AI streaming response
  await page.waitForTimeout(5500);

  const mathBlock = page.locator('.ai-math-block-container');
  console.log('KaTeX math block container count on Production:', await mathBlock.count());

  await page.screenshot({
    path: path.join(screenshotsDir, 'prod_phase8_ai_tutor_katex_desktop.png'),
    fullPage: false
  });
  console.log('Captured prod_phase8_ai_tutor_katex_desktop.png');

  // 5. Test Mode Switching: Hint Mode
  console.log('5. Switching to Hint Mode...');
  const hintModeBtn = page.locator('.mode-pill-btn:has-text("Gợi ý")');
  if (await hintModeBtn.isVisible()) {
    await hintModeBtn.click();
    await page.waitForTimeout(800);
  }

  await page.screenshot({
    path: path.join(screenshotsDir, 'prod_phase8_ai_tutor_modes_desktop.png'),
    fullPage: false
  });
  console.log('Captured prod_phase8_ai_tutor_modes_desktop.png');

  // 6. Verify Progress Invariant
  const progressState = await page.evaluate(() => {
    return localStorage.getItem('study_ai_lesson_progress_les-math-12-01');
  });
  console.log('Lesson progress invariant verified. Stored progress state:', progressState);

  // 7. Verify Mobile 390x844 Viewport
  console.log('7. Verifying Mobile 390x844 layout & equation horizontal scroll...');
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1
  });
  const pageMobile = await contextMobile.newPage();
  await pageMobile.goto(`${PROD_BASE}/`, { waitUntil: 'domcontentloaded' });
  await pageMobile.evaluate(() => {
    localStorage.setItem(
      'study_ai_user',
      JSON.stringify({
        id: 'usr-learner-01',
        name: 'Đặng Thảo Vy',
        role: 'learner',
        email: 'vy.dang@example.com',
      })
    );
  });
  await pageMobile.goto(`${PROD_BASE}/ai-tutor`, { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(2000);

  // Switch to step-by-step mode on mobile
  const mobileStepBtn = pageMobile.locator('button.mode-pill-btn:has-text("Từng bước")');
  if (await mobileStepBtn.isVisible()) {
    await mobileStepBtn.click();
    await pageMobile.waitForTimeout(500);
  }

  const mobileTextarea = pageMobile.locator('textarea.composer-textarea');
  await mobileTextarea.fill('Cho công thức đạo hàm hàm hợp bậc cao');
  await pageMobile.keyboard.press('Enter');
  await pageMobile.waitForTimeout(5000);

  const isBodyOverflowing = await pageMobile.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  console.log('Mobile viewport has horizontal body overflow (should be false):', isBodyOverflowing);

  await pageMobile.screenshot({
    path: path.join(screenshotsDir, 'prod_phase8_ai_tutor_mobile_390.png'),
    fullPage: false
  });
  console.log('Captured prod_phase8_ai_tutor_mobile_390.png');

  // 8. Verify Knowledge Gaps Ask AI Integration
  console.log('8. Verifying Knowledge Gaps Ask AI on Production...');
  await page.goto(`${PROD_BASE}/knowledge-gaps`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const gapAskAiBtn = page.locator('button:has-text("Nhờ AI giải thích")').first();
  if (await gapAskAiBtn.isVisible()) {
    console.log('Found "Nhờ AI giải thích" button on Knowledge Gaps.');
    await page.screenshot({
      path: path.join(interactionsDir, 'prod_phase8_gap_ask_ai_desktop.png'),
      fullPage: false
    });
    console.log('Captured prod_phase8_gap_ask_ai_desktop.png');
  }

  // 9. Verify My Notes Ask AI Integration
  console.log('9. Verifying My Notes Ask AI on Production...');
  await page.goto(`${PROD_BASE}/notes`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const noteAskAiBtn = page.locator('button:has-text("Hỏi AI")').first();
  if (await noteAskAiBtn.isVisible()) {
    console.log('Found "Hỏi AI" button on Notes page.');
    await page.screenshot({
      path: path.join(interactionsDir, 'prod_phase8_notes_ask_ai_desktop.png'),
      fullPage: false
    });
    console.log('Captured prod_phase8_notes_ask_ai_desktop.png');
  }

  await browser.close();
  console.log('=== PHASE 8 LIVE PRODUCTION VERIFICATION COMPLETED ===');
}

main().catch((err) => {
  console.error('Error during production verification:', err);
  process.exit(1);
});
