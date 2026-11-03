import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createStudyNote } from '@/services/studyNotes.service'
import { toggleSectionBookmark } from '@/services/sectionBookmarks.service'
import { MyNotesPage } from './MyNotesPage'

describe('MyNotesPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders notes and switches to bookmarks tab', () => {
    createStudyNote({
      lessonId: 'lesson-math-01',
      subjectId: 'math',
      lessonTitle: 'Bài 01 · Đơn điệu hàm số',
      subjectName: 'Toán học',
      sectionId: 'formulas',
      sectionTitle: 'Công thức trọng tâm',
      content: 'Ghi chú nhớ đạo hàm f(x)',
    })

    toggleSectionBookmark({
      lessonId: 'lesson-math-01',
      subjectId: 'math',
      lessonTitle: 'Bài 01 · Đơn điệu hàm số',
      subjectName: 'Toán học',
      sectionId: 'definitions',
      sectionTitle: 'Định nghĩa cơ bản',
    })

    render(
      <MemoryRouter>
        <MyNotesPage />
      </MemoryRouter>
    )

    // Notes tab is active by default
    expect(screen.getByText('Ghi chú & Đoạn kiến thức đã lưu')).toBeDefined()
    expect(screen.getByText('Ghi chú nhớ đạo hàm f(x)')).toBeDefined()
    expect(screen.getByText('Bài 01 · Đơn điệu hàm số')).toBeDefined()

    // Switch to Bookmarks tab
    const bookmarksTab = screen.getByRole('tab', { name: /Đoạn lưu/ })
    fireEvent.click(bookmarksTab)

    expect(screen.getByText('Định nghĩa cơ bản')).toBeDefined()
    expect(screen.getByText('Xem lại đoạn này')).toBeDefined()
  })

  it('filters notes using subject filter pills', () => {
    createStudyNote({
      lessonId: 'lesson-math-01',
      subjectId: 'math',
      lessonTitle: 'Toán 1',
      subjectName: 'Toán học',
      content: 'Nội dung Toán',
    })

    createStudyNote({
      lessonId: 'lesson-phy-01',
      subjectId: 'physics',
      lessonTitle: 'Lý 1',
      subjectName: 'Vật lý',
      content: 'Nội dung Vật lý',
    })

    render(
      <MemoryRouter>
        <MyNotesPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Nội dung Toán')).toBeDefined()
    expect(screen.getByText('Nội dung Vật lý')).toBeDefined()

    // Click 'Vật lý' chip
    const phyChip = screen.getByRole('button', { name: 'Vật lý' })
    fireEvent.click(phyChip)

    expect(screen.queryByText('Nội dung Toán')).toBeNull()
    expect(screen.getByText('Nội dung Vật lý')).toBeDefined()
  })
})

