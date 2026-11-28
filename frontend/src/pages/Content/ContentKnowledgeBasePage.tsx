import React, { useCallback, useEffect, useState } from 'react'
import { Database, RefreshCw, Search, Trash2 } from 'lucide-react'
import {
  contentWorkspaceService,
  type AiKnowledgeSourceItem,
  type RetrievedKnowledgeChunk,
} from '@/services/contentWorkspace.service'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import './ContentPages.css'

export const ContentKnowledgeBasePage: React.FC = () => {
  const [sources, setSources] = useState<AiKnowledgeSourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceType, setSourceType] = useState<'lesson' | 'material'>('lesson')
  const [sourceRefId, setSourceRefId] = useState('')
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RetrievedKnowledgeChunk[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSources(await contentWorkspaceService.getKnowledgeSources())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải Kho tri thức AI.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    try {
      await contentWorkspaceService.registerKnowledgeSource({
        sourceType,
        sourceRefId,
        title: title || undefined,
      })
      setSourceRefId('')
      setTitle('')
      setFeedback('Đã đồng bộ và lập chỉ mục nguồn tri thức Toán 12.')
      await load()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Không thể đồng bộ nguồn (chỉ chấp nhận nội dung đã xuất bản).')
    }
  }

  const handleRetrieveTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    try {
      setResults(await contentWorkspaceService.testRetrieveKnowledge(query, 5))
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Lỗi khi kiểm tra truy xuất.')
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1>Kho tri thức AI (RAG Toán 12)</h1>
            <p className="staff-page-desc">
              Quản lý, đồng bộ, lập chỉ mục và thu hồi nguồn tri thức Toán 12 đã kiểm duyệt cho AI Gia sư.
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="staff-card" style={{ marginBottom: 14, padding: '10px 14px' }}>
          {feedback}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        <form className="staff-card" onSubmit={handleRegister}>
          <h2 className="staff-card-title">Thêm & Đồng bộ nguồn đã xuất bản</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select className="staff-select" value={sourceType} onChange={(e) => setSourceType(e.target.value as 'lesson' | 'material')}>
              <option value="lesson">Bài học đã xuất bản (lesson)</option>
              <option value="material">Tài liệu đã xuất bản (material)</option>
            </select>
            <input className="staff-input" required value={sourceRefId} onChange={(e) => setSourceRefId(e.target.value)} placeholder="Mã bài học / tài liệu (VD: lesson-01)" />
            <input className="staff-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề hiển thị (tùy chọn)" />
            <button type="submit" className="staff-btn staff-btn-primary">Đồng bộ & Lập chỉ mục</button>
          </div>
        </form>

        <form className="staff-card" onSubmit={handleRetrieveTest}>
          <h2 className="staff-card-title">Kiểm tra truy xuất tri thức</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="staff-input" style={{ flex: 1 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nhập từ khóa Toán 12 (VD: cực trị, tích phân)..." />
            <button type="submit" className="staff-btn staff-btn-secondary">
              <Search size={15} />
              <span>Truy xuất</span>
            </button>
          </div>
          {results.length > 0 && (
            <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 13 }}>
              {results.map((r) => (
                <li key={r.chunkId} style={{ marginBottom: 6 }}>
                  <strong>{r.sourceTitle}</strong> (score: {r.score}): {r.contentText.slice(0, 140)}...
                </li>
              ))}
            </ul>
          )}
        </form>
      </div>

      {loading ? (
        <Skeleton height={120} />
      ) : error ? (
        <PageErrorState title="Không thể tải Kho tri thức AI" message={error} onRetry={load} />
      ) : sources.length === 0 ? (
        <EmptyState icon={Database} title="Chưa có nguồn tri thức AI" description="Đăng ký bài học hoặc tài liệu Toán 12 đã xuất bản để lập chỉ mục." />
      ) : (
        <div className="staff-card">
          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Nguồn tri thức</th>
                  <th>Loại / Mã tham chiếu</th>
                  <th>Số đoạn (Chunks)</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.title}</strong></td>
                    <td>{s.sourceType} · <code>{s.sourceRefId}</code></td>
                    <td>{s.chunkCount}</td>
                    <td><StatusBadge status={s.status === 'indexed' ? 'published' : 'draft'} label={s.status} /></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="staff-btn staff-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        disabled={busyId === s.id}
                        onClick={async () => {
                          setBusyId(s.id)
                          setFeedback(null)
                          try {
                            await contentWorkspaceService.syncKnowledgeSource(s.id)
                            setFeedback('Đã đồng bộ lại nguồn tri thức.')
                            await load()
                          } catch (err) {
                            setFeedback(err instanceof Error ? err.message : 'Lỗi khi đồng bộ lại nguồn tri thức.')
                          } finally {
                            setBusyId(null)
                          }
                        }}
                      >
                        <RefreshCw size={13} /> Đồng bộ lại
                      </button>
                      {s.status !== 'revoked' && (
                        <button
                          type="button"
                          className="staff-btn staff-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          disabled={busyId === s.id}
                          onClick={async () => {
                            setBusyId(s.id)
                            setFeedback(null)
                            try {
                              await contentWorkspaceService.revokeKnowledgeSource(s.id)
                              setFeedback('Đã thu hồi nguồn tri thức.')
                              await load()
                            } catch (err) {
                              setFeedback(err instanceof Error ? err.message : 'Lỗi khi thu hồi nguồn tri thức.')
                            } finally {
                              setBusyId(null)
                            }
                          }}
                        >
                          <Trash2 size={13} /> Thu hồi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
