/**
 * P01 LIVE BROWSER CONTRACT: no page.route(), no mocked responses, no screenshot-only PASS.
 * Run ONLY against a disposable, isolated StudyAIDb_E2E instance and a real ASP.NET API.
 *
 * Required: E2E_DB_NAME=StudyAIDb_E2E
 *           E2E_FRONTEND_URL=http://127.0.0.1:5174
 *           E2E_BACKEND_URL=http://127.0.0.1:8000
 *           E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (test-only account)
 *
 * Start backend/SQL separately. This script never starts/migrates a database.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type Page, type Response } from 'playwright'

const baseUrl = process.env.E2E_FRONTEND_URL ?? ''
const backendUrl = process.env.E2E_BACKEND_URL ?? ''
const email = process.env.E2E_ADMIN_EMAIL ?? ''
const password = process.env.E2E_ADMIN_PASSWORD ?? ''
const artifacts = path.resolve('docs/visual-qa/p01-live-browser')

function requireLocal(urlText: string, name: string) {
  const u = new URL(urlText)
  if (!['localhost', '127.0.0.1', '::1'].includes(u.hostname) || !['http:', 'https:'].includes(u.protocol)) {
    throw new Error(`${name} must be a local HTTP endpoint; remote/production servers are forbidden`)
  }
}
if (process.env.E2E_DB_NAME !== 'StudyAIDb_E2E') throw new Error('E2E_DB_NAME must equal StudyAIDb_E2E')
if (!email || !password) throw new Error('Test-only E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
requireLocal(baseUrl, 'E2E_FRONTEND_URL')
requireLocal(backendUrl, 'E2E_BACKEND_URL')
if (new URL(baseUrl).origin === new URL(backendUrl).origin) {
  throw new Error('Frontend and backend origins must be distinct (Vite proxy expected)')
}

const settingsPath = '/api/v1/admin/settings'
function waitForSettingsSave(page: Page): Promise<Response> {
  return page.waitForResponse(r => r.url().includes(settingsPath) && r.request().method() === 'PUT', { timeout: 20000 })
}
async function login(page: Page) {
  await page.goto(`${baseUrl}/login`)
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await Promise.all([
    page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 30000 }),
    page.locator('button[type="submit"]').click(),
  ])
  await page.goto(`${baseUrl}/admin/settings`)
  await page.locator('#set-sysname').waitFor({ state: 'visible', timeout: 30000 })
  await page.getByText('(Đang đồng bộ từ máy chủ...)').waitFor({ state: 'hidden', timeout: 30000 })
}
async function save(page: Page, name: string): Promise<Response> {
  await page.locator('#set-sysname').fill(name)
  const responsePromise = waitForSettingsSave(page)
  await page.getByRole('button', { name: 'Lưu thay đổi cấu hình' }).click()
  return responsePromise
}

async function main() {
  // Fail closed if backend is unavailable. Never silently swap in a stub.
  const authProbe = await fetch(`${backendUrl}/api/v1/auth/refresh`).catch(() => null)
  if (!authProbe || authProbe.status === 404 || authProbe.status >= 500) {
    throw new Error("Real backend auth endpoint unavailable; live browser test cannot proceed")
  }
  fs.mkdirSync(artifacts, { recursive: true })

  let browser: Browser | undefined
  let pageA: Page | undefined
  let previousName = ''
  let changed = false
  try {
    browser = await chromium.launch({ headless: true })
    const adminA = await browser.newContext()
    const adminB = await browser.newContext()
    pageA = await adminA.newPage()
    const pageB = await adminB.newPage()
    await login(pageA)
    await login(pageB)

    // Both sessions must show the same value before either save.
    previousName = await pageA.locator('#set-sysname').inputValue()
    assert.equal(await pageB.locator('#set-sysname').inputValue(), previousName)

    const unique = `LIVE-P01-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const first = await save(pageA, unique)
    assert.equal(first.status(), 200, `First Settings PUT: expected 200, got ${first.status()}`)
    changed = true
    const second = await save(pageB, `${unique}-STALE`)
    assert.equal(second.status(), 409, `Second Settings PUT: expected 409, got ${second.status()}`)
    await pageB.getByText(/Xung đột: Cấu hình/).waitFor({ timeout: 10000 })

    await pageA.reload()
    await pageA.locator('#set-sysname').waitFor({ state: 'visible' })
    assert.equal(await pageA.locator('#set-sysname').inputValue(), unique, 'Winner was not preserved after reload')
    await pageB.reload()
    await pageB.locator('#set-sysname').waitFor({ state: 'visible' })
    assert.equal(await pageB.locator('#set-sysname').inputValue(), unique, 'Stale client overwrote persisted Settings')
    await pageA.screenshot({ path: path.join(artifacts, 'settings-real-api-pass.png'), fullPage: true })
    console.log('[PASS] Live browser Settings: 2 admin contexts, PUT 200, stale PUT 409, persisted value after reload')
  } catch (err) {
    if (pageA) await pageA.screenshot({ path: path.join(artifacts, 'settings-real-api-fail.png'), fullPage: true }).catch(() => {})
    throw err
  } finally {
    // Restore shared E2E settings only. Never restore/write to a non-E2E database.
    if (changed && pageA && previousName) {
      try {
        const restore = await save(pageA, previousName)
        if (restore.status() !== 200) console.error(`[WARN] Test Settings restore failed: ${restore.status()}`)
      } catch (err) {
        console.error('[WARN] Test Settings restore failed:', err)
      }
    }
    await browser?.close()
  }
}
main().catch(err => { console.error('[FAIL] P01 live-browser:', err); process.exitCode = 1 })
