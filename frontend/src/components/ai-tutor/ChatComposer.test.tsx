import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ChatComposer } from './ChatComposer'

describe('ChatComposer Component', () => {
  it('renders correctly with placeholder and controls', () => {
    render(
      <ChatComposer
        onSendMessage={vi.fn()}
        isStreaming={false}
        onStopStreaming={vi.fn()}
        activeSubject="all"
        onSelectSubject={vi.fn()}
      />
    )

    expect(
      screen.getByPlaceholderText('Đặt câu hỏi về bài học của bạn...')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gửi câu hỏi/i })).toBeDisabled()
    expect(screen.getByRole('combobox')).toHaveValue('all')
  })

  it('enables submit button when text is entered and clears after submit', async () => {
    const handleSend = vi.fn()
    const user = userEvent.setup()

    render(
      <ChatComposer
        onSendMessage={handleSend}
        isStreaming={false}
        onStopStreaming={vi.fn()}
        activeSubject="all"
        onSelectSubject={vi.fn()}
      />
    )

    const textarea = screen.getByPlaceholderText('Đặt câu hỏi về bài học của bạn...')
    await user.type(textarea, 'Giải thích đạo hàm cực trị')

    const submitBtn = screen.getByRole('button', { name: /gửi câu hỏi/i })
    expect(submitBtn).not.toBeDisabled()

    await user.click(submitBtn)
    expect(handleSend).toHaveBeenCalledWith('Giải thích đạo hàm cực trị')
    expect(textarea).toHaveValue('')
  })

  it('submits on Enter key press without Shift', async () => {
    const handleSend = vi.fn()
    render(
      <ChatComposer
        onSendMessage={handleSend}
        isStreaming={false}
        onStopStreaming={vi.fn()}
        activeSubject="all"
        onSelectSubject={vi.fn()}
      />
    )

    const textarea = screen.getByPlaceholderText('Đặt câu hỏi về bài học của bạn...')
    fireEvent.change(textarea, { target: { value: 'Câu hỏi test Enter' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(handleSend).toHaveBeenCalledWith('Câu hỏi test Enter')
  })

  it('does not submit on Shift+Enter and adds a new line', async () => {
    const handleSend = vi.fn()
    render(
      <ChatComposer
        onSendMessage={handleSend}
        isStreaming={false}
        onStopStreaming={vi.fn()}
        activeSubject="all"
        onSelectSubject={vi.fn()}
      />
    )

    const textarea = screen.getByPlaceholderText('Đặt câu hỏi về bài học của bạn...')
    fireEvent.change(textarea, { target: { value: 'Dòng 1' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    expect(handleSend).not.toHaveBeenCalled()
  })

  it('does not send empty or whitespace-only messages', () => {
    const handleSend = vi.fn()
    render(
      <ChatComposer
        onSendMessage={handleSend}
        isStreaming={false}
        onStopStreaming={vi.fn()}
        activeSubject="all"
        onSelectSubject={vi.fn()}
      />
    )

    const textarea = screen.getByPlaceholderText('Đặt câu hỏi về bài học của bạn...')
    fireEvent.change(textarea, { target: { value: '     ' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(handleSend).not.toHaveBeenCalled()
  })

  it('does not submit on Enter when IME is composing (Vietnamese accents)', () => {
    const handleSend = vi.fn()
    render(
      <ChatComposer
        onSendMessage={handleSend}
        isStreaming={false}
        onStopStreaming={vi.fn()}
        activeSubject="all"
        onSelectSubject={vi.fn()}
      />
    )

    const textarea = screen.getByPlaceholderText('Đặt câu hỏi về bài học của bạn...')
    fireEvent.change(textarea, { target: { value: 'Đang gõ' } })
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    Object.defineProperty(event, 'isComposing', { value: true })
    fireEvent(textarea, event)

    expect(handleSend).not.toHaveBeenCalled()
  })

  it('shows stop button during streaming and handles stop streaming click', async () => {
    const handleStop = vi.fn()
    const user = userEvent.setup()

    render(
      <ChatComposer
        onSendMessage={vi.fn()}
        isStreaming={true}
        onStopStreaming={handleStop}
        activeSubject="all"
        onSelectSubject={vi.fn()}
      />
    )

    const stopBtn = screen.getByRole('button', { name: /dừng câu trả lời/i })
    expect(stopBtn).toBeInTheDocument()

    await user.click(stopBtn)
    expect(handleStop).toHaveBeenCalled()
  })
})
