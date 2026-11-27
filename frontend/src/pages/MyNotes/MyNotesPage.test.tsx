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

    // Mistakes tab is active by default (3-tab Study Notebook)
    expect(screen.getByText('Ghi chú & Đoạn kiến thức đã lưu')).toBeDefined()
    expect(screen.getByRole('tab', { name: /Bài tập sai/ })).toBeDefined()

    // Switch to Bookmarks tab
    const bookmarksTab = screen.getByRole('tab', { name: /Nội dung đã lưu/ })
    fireEvent.click(bookmarksTab)
    expect(screen.getByText('Định nghĩa cơ bản')).toBeDefined()
    expect(screen.getByText('Xem lại đoạn này')).toBeDefined()

    // Switch to Personal Notes tab
    const notesTab = screen.getByRole('tab', { name: /Ghi chú cá nhân/ })
    fireEvent.click(notesTab)
    expect(screen.getByText('Ghi chú nhớ đạo hàm f(x)')).toBeDefined()
    expect(screen.getByText('Bài 01 · Đơn điệu hàm số')).toBeDefined()
  })

  it('filters notes by search keyword without legacy multi-subject pills', () => {
    createStudyNote({
      lessonId: 'lesson-math-01',
      subjectId: 'math',
      lessonTitle: 'Toán 12 - Cực trị',
      subjectName: 'Toán học 12',
      content: 'Nội dung Cực trị hàm số',
    })
    createStudyNote({
      lessonId: 'lesson-math-02',
      subjectId: 'math',
      lessonTitle: 'Toán 12 - Tích phân',
      subjectName: 'Toán học 12',
      content: 'Nội dung Tích phân',
    })

    render(
      <MemoryRouter>
        <MyNotesPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('tab', { name: /Ghi chú cá nhân/ }))
    expect(screen.getByText('Nội dung Cực trị hàm số')).toBeDefined()
    expect(screen.getByText('Nội dung Tích phân')).toBeDefined()

    const searchInput = screen.getByLabelText('Tìm kiếm trong sổ tay')
    fireEvent.change(searchInput, { target: { value: 'Tích phân' } })

    expect(screen.queryByText('Nội dung Cực trị hàm số')).toBeNull()
    expect(screen.getByText('Nội dung Tích phân')).toBeDefined()
  })
})

