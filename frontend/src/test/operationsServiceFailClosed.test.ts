import { describe, it, expect, vi, beforeEach } from 'vitest'
import { operationsService } from '@/services/operations.service'
import { apiClient } from '@/lib/apiClient'
import * as authSession from '@/auth/authSession'

describe('Fail-Closed Operations Service (Announcements & Settings)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('saveAnnouncement throws and does not write to localStorage when authenticated and API fails', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_access_token')
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('500 Internal Server Error'))

    const newAnnouncement = {
      title: 'Thông báo lỗi mạng',
      content: 'Nội dung thông báo kiểm tra fail-closed',
      audience: 'all' as const,
      severity: 'info' as const,
    }

    await expect(operationsService.saveAnnouncement(newAnnouncement)).rejects.toThrow(
      '500 Internal Server Error'
    )

    // Verify localStorage was NOT modified with the new announcement
    const raw = localStorage.getItem('study_ai_announcements_v5')
    if (raw) {
      expect(raw).not.toContain('Thông báo lỗi mạng')
    }
  })

  it('deleteAnnouncement throws when authenticated and API fails', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_access_token')
    vi.spyOn(apiClient, 'delete').mockRejectedValue(new Error('403 Forbidden'))

    await expect(operationsService.deleteAnnouncement('anc-123')).rejects.toThrow('403 Forbidden')
  })

  it('saveSettings throws and does not write to localStorage when authenticated and API fails', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_access_token')
    vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('503 Service Unavailable'))

    const settings = {
      systemName: 'Hệ thống cập nhật lỗi',
      systemDescription: 'Mô tả',
      language: 'vi-VN',
      passingScoreThreshold: 5.0,
      lowScoreAlertThreshold: 5.0,
      attentionProgressThreshold: 60,
      requireApprovalBeforePublish: true,
      allowRevisionRequests: true,
      showArchivedContent: false,
      notificationDisplayDays: 7,
      enableDemoAlerts: true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Test Admin',
    }

    await expect(operationsService.saveSettings(settings)).rejects.toThrow('503 Service Unavailable')

    const raw = localStorage.getItem('study_ai_settings_v5')
    if (raw) {
      expect(raw).not.toContain('Hệ thống cập nhật lỗi')
    }
  })

  it('saveAnnouncement succeeds and returns backend data when API returns success', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_access_token')
    const createdItem = {
      id: 'anc_be_999',
      title: 'Thông báo thành công từ BE',
      content: 'Đã lưu vào SQL Server',
      audience: 'all' as const,
      severity: 'info' as const,
      status: 'published' as const,
      createdBy: 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    vi.spyOn(apiClient, 'post').mockResolvedValue(createdItem)

    const result = await operationsService.saveAnnouncement({
      title: 'Thông báo thành công từ BE',
      content: 'Đã lưu vào SQL Server',
    })

    expect(result.id).toBe('anc_be_999')
    expect(result.title).toBe('Thông báo thành công từ BE')
  })

  it('getAuditLogs paginates through all server pages to return complete audit trail', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_access_token')
    const page1Items = Array.from({ length: 25 }, (_, i) => ({
      id: `log-${i + 1}`,
      action: 'user_created',
      actor: 'Admin A',
      targetType: 'user',
      targetId: `usr-${i + 1}`,
      payload: '{}',
      timestamp: new Date().toISOString(),
    }))
    const page2Items = Array.from({ length: 15 }, (_, i) => ({
      id: `log-${i + 26}`,
      action: 'user_updated',
      actor: 'Admin B',
      targetType: 'user',
      targetId: `usr-${i + 26}`,
      payload: '{}',
      timestamp: new Date().toISOString(),
    }))

    vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({
        items: page1Items,
        total: 40,
        page: 1,
        pageSize: 100,
      })
      .mockResolvedValueOnce({
        items: page2Items,
        total: 40,
        page: 2,
        pageSize: 100,
      })

    const allLogs = await operationsService.getAuditLogs()
    expect(allLogs.length).toBe(40)
    expect(allLogs[0].id).toBe('log-1')
    expect(allLogs[39].id).toBe('log-40')
  })

  it('getAuditLogs throws and fails closed when authenticated and API fails', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_access_token')
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('500 Internal Server Error'))

    await expect(operationsService.getAuditLogs()).rejects.toThrow('500 Internal Server Error')
  })

  it('getApprovals calls backend /api/v1/content/approvals and fails closed on error', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_access_token')
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('500 Server Error'))

    await expect(operationsService.getApprovals()).rejects.toThrow('500 Server Error')
  })

  it('getApprovals returns genuine data from backend when authenticated', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_access_token')
    const mockApprovals = [
      {
        id: 'apr_l_101',
        title: 'Mệnh đề toán học',
        contentType: 'lesson',
        contentId: 'les_101',
        subjectId: 'sub_math10',
        subjectName: 'Toán học 10',
        authorName: 'Nguyễn Văn A',
        status: 'pending',
        submittedAt: new Date().toISOString(),
        history: [],
      },
    ]
    vi.spyOn(apiClient, 'get').mockResolvedValue(mockApprovals)

    const result = await operationsService.getApprovals('pending')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('apr_l_101')
    expect(result[0].title).toBe('Mệnh đề toán học')
  })

  it('approveContent calls backend endpoint when authenticated', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_access_token')
    vi.spyOn(apiClient, 'post').mockResolvedValue({ success: true })
    vi.spyOn(apiClient, 'get').mockResolvedValue([
      {
        id: 'apr_l_les_101',
        contentId: 'les_101',
        title: 'Mệnh đề toán học',
        status: 'approved',
        history: [],
      },
    ])

    const res = await operationsService.approveContent('apr_l_les_101', 'Phê duyệt chuẩn GDPT 2018')
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/content/lessons/les_101/approve')
    expect(res.status).toBe('approved')
  })

  it('requestChanges calls backend request-changes endpoint when authenticated', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_access_token')
    vi.spyOn(apiClient, 'post').mockResolvedValue({ success: true })
    vi.spyOn(apiClient, 'get').mockResolvedValue([
      {
        id: 'apr_l_les_101',
        contentId: 'les_101',
        title: 'Mệnh đề toán học',
        status: 'changes-requested',
        history: [],
      },
    ])

    const res = await operationsService.requestChanges('apr_l_les_101', 'Bổ sung ví dụ thực tế')
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/content/lessons/les_101/request-changes', {
      feedback: 'Bổ sung ví dụ thực tế',
    })
    expect(res.status).toBe('changes-requested')
  })

  it('getPublications calls backend /api/v1/content/publications and fails closed on error', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_access_token')
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('500 Server Error'))

    await expect(operationsService.getPublications()).rejects.toThrow('500 Server Error')
  })
})
