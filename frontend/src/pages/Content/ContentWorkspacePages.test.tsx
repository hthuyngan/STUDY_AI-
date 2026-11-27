import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ContentMaterialsPage } from './ContentMaterialsPage'
import { ContentKnowledgeBasePage } from './ContentKnowledgeBasePage'
import { ContentErrorReportsPage } from './ContentErrorReportsPage'
import { contentWorkspaceService } from '@/services/contentWorkspace.service'

describe('Math 12 Content Workspace Pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders ContentMaterialsPage, ContentKnowledgeBasePage, and ContentErrorReportsPage empty states cleanly', async () => {
    vi.spyOn(contentWorkspaceService, 'getMaterials').mockResolvedValue([])
    vi.spyOn(contentWorkspaceService, 'getKnowledgeSources').mockResolvedValue([])
    vi.spyOn(contentWorkspaceService, 'getErrorReports').mockResolvedValue([])

    render(
      <MemoryRouter>
        <ContentMaterialsPage />
        <ContentKnowledgeBasePage />
        <ContentErrorReportsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tài liệu học tập Toán 12')).toBeInTheDocument()
      expect(screen.getByText('Kho tri thức AI (RAG Toán 12)')).toBeInTheDocument()
      expect(screen.getByText('Báo cáo sai sót nội dung')).toBeInTheDocument()
    })
  })
})
