import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:4173'
const INTERACTIONS_DIR = path.join('docs', 'visual-qa', 'interactions')

if (!fs.existsSync(INTERACTIONS_DIR)) {
  fs.mkdirSync(INTERACTIONS_DIR, { recursive: true })
}

async function run() {
  console.log('--- STARTING PLAYWRIGHT MODAL VERIFICATION ---')
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  // 1. Desktop 1440x900
  console.log('Testing Desktop 1440x900...')
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem(
      'study_ai_auth_user',
      JSON.stringify({
        id: 'admin-demo-id',
        email: 'admin@studyai.edu.vn',
        fullName: 'Quản trị viên Demo',
        role: 'admin',
      })
    )
  })

  await page.goto(`${BASE_URL}/admin/teachers`, { waitUntil: 'networkidle' })

  // Open modal
  const addBtn = page.getByRole('button', { name: /Thêm giáo viên mới/i })
  await addBtn.click()

  const modal = page.locator('.teacher-modal-card')
  await modal.waitFor({ state: 'visible' })

  // Assertions for Desktop
  console.log('Asserting bounding box relationships...')
  const nameLabel = page.locator('label[for="create-tch-name"]')
  const nameInput = page.locator('#create-tch-name')
  const emailLabel = page.locator('label[for="create-tch-email"]')
  const emailInput = page.locator('#create-tch-email')
  const phoneLabel = page.locator('label[for="create-tch-phone"]')
  const phoneInput = page.locator('#create-tch-phone')
  const bioLabel = page.locator('label[for="create-tch-bio"]')
  const bioTextarea = page.locator('#create-tch-bio')

  const nameLabelBox = await nameLabel.boundingBox()
  const nameInputBox = await nameInput.boundingBox()
  const emailInputBox = await emailInput.boundingBox()
  const phoneInputBox = await phoneInput.boundingBox()
  const bioLabelBox = await bioLabel.boundingBox()
  const bioTextareaBox = await bioTextarea.boundingBox()

  if (!nameLabelBox || !nameInputBox || !emailInputBox || !phoneInputBox || !bioLabelBox || !bioTextareaBox) {
    throw new Error('Could not get bounding boxes for form fields')
  }

  // Assertion: Label is strictly above input
  if (nameLabelBox.y + nameLabelBox.height > nameInputBox.y) {
    throw new Error(`Name label overlaps name input! label bottom=${nameLabelBox.y + nameLabelBox.height}, input top=${nameInputBox.y}`)
  }
  console.log('✓ Name label is properly above name input with vertical spacing:', nameInputBox.y - (nameLabelBox.y + nameLabelBox.height), 'px')

  // Assertion: 2 columns side by side on desktop (Email left, Phone right)
  if (emailInputBox.x + emailInputBox.width > phoneInputBox.x) {
    throw new Error(`Email input overlaps phone input horizontally!`)
  }
  console.log('✓ 2 Columns side-by-side on desktop. Gap between columns:', phoneInputBox.x - (emailInputBox.x + emailInputBox.width), 'px')

  // Assertion: Textarea label is strictly above textarea
  if (bioLabelBox.y + bioLabelBox.height > bioTextareaBox.y) {
    throw new Error(`Bio label overlaps bio textarea!`)
  }
  console.log('✓ Bio label is properly above bio textarea with vertical spacing:', bioTextareaBox.y - (bioLabelBox.y + bioLabelBox.height), 'px')

  // Assertion: No horizontal overflow
  const modalBody = page.locator('.teacher-modal-body')
  const overflow = await modalBody.evaluate((el) => el.scrollWidth > el.clientWidth)
  if (overflow) {
    throw new Error('Horizontal overflow detected in modal body!')
  }
  console.log('✓ No horizontal overflow in modal body.')

  // Save Desktop Screenshot
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'admin_add_teacher_after_desktop.png'),
    fullPage: false,
  })
  console.log('✓ Saved: admin_add_teacher_after_desktop.png')

  // Test validation error state
  const submitBtn = page.getByRole('button', { name: /^Tạo giáo viên$/i })
  await submitBtn.click()

  const errorAlert = page.locator('.teacher-form-error')
  await errorAlert.waitFor({ state: 'visible' })
  const errorText = await errorAlert.textContent()
  console.log('✓ Validation triggered:', errorText)

  // Save Validation Screenshot
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'admin_add_teacher_validation.png'),
    fullPage: false,
  })
  console.log('✓ Saved: admin_add_teacher_validation.png')

  // Close page
  await page.close()

  // 2. Tablet 768x1024
  console.log('Testing Tablet 768x1024...')
  const tabletPage = await browser.newPage({ viewport: { width: 768, height: 1024 } })
  await tabletPage.goto(`${BASE_URL}/admin/teachers`, { waitUntil: 'networkidle' })
  await tabletPage.getByRole('button', { name: /Thêm giáo viên mới/i }).click()
  await tabletPage.locator('.teacher-modal-card').waitFor({ state: 'visible' })

  // Fill in some details
  await tabletPage.locator('#create-tch-name').fill('ThS. Hoàng Thu Thủy')
  await tabletPage.locator('#create-tch-email').fill('thuthuy@studyai.edu.vn')
  await tabletPage.locator('#create-tch-phone').fill('0912 888 999')

  await tabletPage.screenshot({
    path: path.join(INTERACTIONS_DIR, 'admin_add_teacher_after_tablet.png'),
    fullPage: false,
  })
  console.log('✓ Saved: admin_add_teacher_after_tablet.png')
  await tabletPage.close()

  // 3. Mobile 390x844
  console.log('Testing Mobile 390x844...')
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobilePage.goto(`${BASE_URL}/admin/teachers`, { waitUntil: 'networkidle' })
  await mobilePage.getByRole('button', { name: /Thêm giáo viên mới/i }).click()
  await mobilePage.locator('.teacher-modal-card').waitFor({ state: 'visible' })

  // In mobile, grid must be 1 column (email and phone stacked vertically)
  const mobileEmailInput = mobilePage.locator('#create-tch-email')
  const mobilePhoneInput = mobilePage.locator('#create-tch-phone')
  const mEmailBox = await mobileEmailInput.boundingBox()
  const mPhoneBox = await mobilePhoneInput.boundingBox()
  if (!mEmailBox || !mPhoneBox) throw new Error('Missing mobile bounding box')

  if (mEmailBox.y >= mPhoneBox.y) {
    throw new Error('On mobile, email input should be above phone input!')
  }
  console.log('✓ Mobile 1-column layout confirmed. Email is stacked above Phone.')

  await mobilePage.screenshot({
    path: path.join(INTERACTIONS_DIR, 'admin_add_teacher_after_mobile.png'),
    fullPage: false,
  })
  console.log('✓ Saved: admin_add_teacher_after_mobile.png')

  // Test Escape key closes modal
  await mobilePage.keyboard.press('Escape')
  await mobilePage.locator('.teacher-modal-card').waitFor({ state: 'hidden' })
  console.log('✓ Escape key successfully closed the modal.')
  await mobilePage.close()

  await browser.close()
  console.log('--- ALL PLAYWRIGHT CHECKS PASSED SUCCESSFULLY ---')
}

run().catch((err) => {
  console.error('Playwright Verification Failed:', err)
  process.exit(1)
})
