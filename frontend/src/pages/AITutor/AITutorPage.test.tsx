import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AITutorPage } from './AITutorPage'

describe('AITutorPage Component', () => {
  it('renders conversation header, composer and chat components', async () => {
    render(
      <MemoryRouter>
        <AITutorPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Đặt câu hỏi về bài học của bạn...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /đoạn chat mới/i })).toBeInTheDocument()
  })

  it('allows clicking new chat to show empty state with suggestion prompts', async () => {
    render(
      <MemoryRouter>
        <AITutorPage />
      </MemoryRouter>
    )

    const newChatBtn = screen.getByRole('button', { name: /đoạn chat mới/i })
    fireEvent.click(newChatBtn)

    await waitFor(() => {
      expect(screen.getByText('Bạn muốn học gì hôm nay?')).toBeInTheDocument()
    })

    expect(screen.getByText(/bạn có thể hỏi bất kỳ bài học nào/i)).toBeInTheDocument()
  })

  it('can submit a question via composer and render user message', async () => {
    render(
      <MemoryRouter>
        <AITutorPage />
      </MemoryRouter>
    )

    // Start a fresh chat
    const newChatBtn = screen.getByRole('button', { name: /đoạn chat mới/i })
    fireEvent.click(newChatBtn)

    await waitFor(() => {
      expect(screen.getByText('Bạn muốn học gì hôm nay?')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Đặt câu hỏi về bài học của bạn...')
    fireEvent.change(textarea, { target: { value: 'Giải thích định luật Ohm' } })

    const form = textarea.closest('form')!
    fireEvent.submit(form)

    await waitFor(
      () => {
        const matches = screen.getAllByText('Giải thích định luật Ohm')
        expect(matches.length).toBeGreaterThanOrEqual(1)
      },
      { timeout: 3000 }
    )
  })
})
