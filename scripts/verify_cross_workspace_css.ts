import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const FRONTEND_URL = 'http://localhost:5174';
const QA_DIR = path.join('docs', 'visual-qa', 'cross-workspace');

if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true });
}

interface Flow {
  role: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
  routes: { name: string; path: string }[];
}

const FLOWS: Flow[] = [
  {
    role: 'teacher',
    user: {
      id: 'teacher-demo-01',
      email: 'teacher@studyai.internal',
      displayName: 'Thầy Hoàng Văn Giáo',
      role: 'teacher',
    },
    routes: [
      { name: 'teacher-classes', path: '/teacher/classes' },
      { name: 'teacher-dashboard', path: '/teacher/dashboard' },
    ],
  },
  {
    role: 'support',
    user: {
      id: 'support-demo-01',
      email: 'support@studyai.internal',
      displayName: 'Nguyễn Thị Hỗ Trợ',
      role: 'support',
    },
    routes: [
      { name: 'support-tickets', path: '/support/tickets' },
      { name: 'support-dashboard', path: '/support/dashboard' },
    ],
  },
  {
    role: 'learner',
    user: {
      id: 'learner-demo-01',
      email: 'student@studyai.internal',
      displayName: 'Nguyễn Văn Học',
      role: 'student',
    },
    routes: [
      { name: 'learner-dashboard', path: '/dashboard' },
      { name: 'learner-practice', path: '/practice' },
    ],
  },
];

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
];

async function run() {
  console.log('=== Capturing Teacher, Support & Learner Visual QA Evidence ===');
  const browser = await chromium.launch({ headless: true });

  for (const flow of FLOWS) {
    console.log(`\nTesting Role: ${flow.role.toUpperCase()}`);

    for (const vp of VIEWPORTS) {
      // Only desktop 1440 and tablet 768 to keep verification clean and fast
      if (vp.name === 'desktop-1280' || (flow.role !== 'learner' && vp.name === 'mobile-390')) {
        continue;
      }

      console.log(`  Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      try {
        await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
        await page.evaluate((u) => {
          localStorage.setItem('studyai_user', JSON.stringify(u));
          localStorage.setItem('studyai_token', 'mock-token-studyai-session');
        }, flow.user);

        for (const route of flow.routes) {
          await page.goto(`${FRONTEND_URL}${route.path}`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(600);

          const screenshotName = `${flow.role}-${route.name}-${vp.name}.png`;
          await page.screenshot({
            path: path.join(QA_DIR, screenshotName),
            fullPage: false,
          });
          console.log(`    Saved: ${screenshotName}`);
        }
      } catch (err: any) {
        console.error(`    Error in flow ${flow.role} on ${vp.name}:`, err.message);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
  console.log('\n=== Completed Evidence Capture ===');
}

run().catch((err) => {
  console.error('Run failed:', err);
  process.exit(1);
});
