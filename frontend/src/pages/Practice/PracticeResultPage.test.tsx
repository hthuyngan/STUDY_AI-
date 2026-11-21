import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { practiceService } from '@/services/practice.service'
import { PracticeResultPage } from './PracticeResultPage'
import type { AuthContextValue } from '@/auth/auth.types'

vi.mock('@/auth/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/services/practice.service', () => ({
  practiceService: { getResultById: vi.fn() },
}))

function authValue(state: AuthContextValue['state'], userId?: string): AuthContextValue {
  return {
    state,
    user: userId ? { id: userId, displayName: 'Test Learner', role: 'learner', createdAt: '2026-01-01' } : null,
  } as AuthContextValue
}

function view() {
  return (
    <MemoryRouter initialEntries={['/practice/result/res_123']}>
      <Routes>
        <Route path="/practice/result/:resultId" element={<PracticeResultPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Practice result authentication hydration regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(practiceService.getResultById).mockResolvedValue(null)
  })
  afterEach(() => cleanup())

  it('waits for refresh-token hydration before fetching SQL-backed result', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue('initializing'))
    const screen = render(view())
    expect(practiceService.getResultById).not.toHaveBeenCalled()

    vi.mocked(useAuth).mockReturnValue(authValue('authenticated', 'learner_a'))
    screen.rerender(view())
    await waitFor(() => expect(practiceService.getResultById).toHaveBeenCalledWith('res_123'))
    expect(practiceService.getResultById).toHaveBeenCalledTimes(1)
  })

  it('re-requests on account switch rather than retaining previous result', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue('authenticated', 'learner_a'))
    const screen = render(view())
    await waitFor(() => expect(practiceService.getResultById).toHaveBeenCalledTimes(1))

    vi.mocked(useAuth).mockReturnValue(authValue('authenticated', 'learner_b'))
    screen.rerender(view())
    await waitFor(() => expect(practiceService.getResultById).toHaveBeenCalledTimes(2))
  })
})
