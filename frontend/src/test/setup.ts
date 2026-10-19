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
