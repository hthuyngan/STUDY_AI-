import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

window.HTMLElement.prototype.scrollIntoView = vi.fn()
window.HTMLElement.prototype.scrollTo = vi.fn()

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    readText: vi.fn().mockImplementation(() => Promise.resolve('')),
  },
  configurable: true,
})
