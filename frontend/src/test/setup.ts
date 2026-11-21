import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock DOM layout & scroll APIs not available in happy-dom / jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn()
window.HTMLElement.prototype.scrollTo = vi.fn()

// Mock Clipboard API with defineProperty
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    readText: vi.fn().mockImplementation(() => Promise.resolve('')),
  },
  configurable: true,
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly scrollMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  disconnect = vi.fn()
  observe = vi.fn()
  takeRecords = vi.fn(() => [])
  unobserve = vi.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver as unknown as typeof IntersectionObserver,
})

// Unit/component tests must never reach a developer machine or a CI service on
// localhost. Individual API tests replace this stub with their own response.
// A deterministic 503 keeps application providers fail-closed without noisy
// ECONNREFUSED/AbortError output from happy-dom during teardown.
vi.stubGlobal(
  'fetch',
  vi.fn(async () =>
    new Response(JSON.stringify({ detail: 'Backend unavailable in frontend unit tests' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }))
)
