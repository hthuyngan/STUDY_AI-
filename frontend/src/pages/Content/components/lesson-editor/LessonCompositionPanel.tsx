import React, { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, History, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { LessonContentBlockRenderer } from '@/components/lesson/LessonContentBlockRenderer'
import { contentService } from '@/services/content.service'
import type {
  CurriculumNodeRef,
  LessonBlockType,
  LessonComposition,
  LessonContentBlock,
  LessonRevision,
  PrerequisiteLessonRef,
} from '@/types/content'
import './LessonCompositionPanel.css'

export interface LessonCompositionPanelProps {
  lessonId: string
  onCompositionMutated?: () => Promise<void> | void
}

const BLOCK_TYPE_LABELS: Record<LessonBlockType, string> = {
  text: 'Văn bản (text)',
  markdown: 'Markdown',
  formula: 'Công thức (formula)',
  image: 'Hình ảnh (image)',
  video: 'Video',
  example: 'Ví dụ (example)',
  exercise: 'Bài tập (exercise)',
  table: 'Bảng (table)',
  diagram: 'Sơ đồ (diagram)',
  timeline: 'Dòng thời gian (timeline)',
  summary: 'Tóm tắt (summary)',
  reference: 'Tài liệu tham khảo (reference)',
}

function createDefaultBlock(blockType: LessonBlockType, orderIndex: number): LessonContentBlock {
  switch (blockType) {
    case 'text':
      return { blockType: 'text', schemaVersion: 1, orderIndex, payload: { content: '' } }
    case 'markdown':
      return { blockType: 'markdown', schemaVersion: 1, orderIndex, payload: { content: '' } }
    case 'formula':
      return { blockType: 'formula', schemaVersion: 1, orderIndex, payload: { latex: '', displayMode: true, caption: '' } }
    case 'image':
      return { blockType: 'image', schemaVersion: 1, orderIndex, payload: { url: '', alt: '', caption: '' } }
    case 'video':
      return { blockType: 'video', schemaVersion: 1, orderIndex, payload: { url: '', title: '' } }
    case 'example':
      return { blockType: 'example', schemaVersion: 1, orderIndex, payload: { title: '', prompt: '', solution: '' } }
    case 'exercise':
      return { blockType: 'exercise', schemaVersion: 1, orderIndex, payload: { prompt: '', hint: '', solution: '', answerKey: '' } }
    case 'table':
      return { blockType: 'table', schemaVersion: 1, orderIndex, payload: { caption: '', headers: ['Cột 1', 'Cột 2'], rows: [['', '']] } }
    case 'diagram':
      return { blockType: 'diagram', schemaVersion: 1, orderIndex, payload: { format: 'mermaid', source: '', alt: '', caption: '' } }
    case 'timeline':
      return { blockType: 'timeline', schemaVersion: 1, orderIndex, payload: { caption: '', events: [{ date: '', title: '', description: '' }] } }
    case 'summary':
      return { blockType: 'summary', schemaVersion: 1, orderIndex, payload: { title: 'Tóm tắt', points: [''] } }
    case 'reference':
      return { blockType: 'reference', schemaVersion: 1, orderIndex, payload: { label: '', url: '', citation: '' } }
  }
}

export const LessonCompositionPanel: React.FC<LessonCompositionPanelProps> = ({
  lessonId,
  onCompositionMutated,
}) => {
  const [composition, setComposition] = useState<LessonComposition | null>(null)
  const [blocks, setBlocks] = useState<LessonContentBlock[]>([])
  const [objectiveIds, setObjectiveIds] = useState<string[]>([])
  const [knowledgeUnitIds, setKnowledgeUnitIds] = useState<string[]>([])
  const [skillIds, setSkillIds] = useState<string[]>([])
  const [prerequisiteLessonIds, setPrerequisiteLessonIds] = useState<string[]>([])
  const [revisions, setRevisions] = useState<LessonRevision[]>([])

  const [allObjectives, setAllObjectives] = useState<CurriculumNodeRef[]>([])
  const [allKnowledgeUnits, setAllKnowledgeUnits] = useState<CurriculumNodeRef[]>([])
  const [allSkills, setAllSkills] = useState<CurriculumNodeRef[]>([])
  const [allPrereqLessons, setAllPrereqLessons] = useState<PrerequisiteLessonRef[]>([])

  const [newBlockType, setNewBlockType] = useState<LessonBlockType>('text')
  const [showPreview, setShowPreview] = useState(false)
  const [activeTab, setActiveTab] = useState<'blocks' | 'objectives' | 'graph' | 'revisions'>('blocks')
  const [nodeSearch, setNodeSearch] = useState('')
  const [newNodeCode, setNewNodeCode] = useState('')
  const [newNodeTitle, setNewNodeTitle] = useState('')

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<LessonRevision | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [comp, revPage] = await Promise.all([
        contentService.getLessonComposition(lessonId),
        contentService.getLessonRevisions(lessonId, 1, 20),
      ])
      setComposition(comp)
      setBlocks(comp.blocks)
      setObjectiveIds(comp.objectives.map((o) => o.id))
      setKnowledgeUnitIds(comp.knowledgeUnits.map((k) => k.id))
      setSkillIds(comp.skills.map((s) => s.id))
      setPrerequisiteLessonIds(comp.prerequisites.map((p) => p.lessonId))
      setRevisions(revPage.items)

      if (comp.curriculumId) {
        const [objs, kus, sks, lessons] = await Promise.all([
          contentService.listCurriculumObjectives(comp.curriculumId),
          contentService.listCurriculumKnowledgeUnits(comp.curriculumId),
          contentService.listCurriculumSkills(comp.curriculumId),
          contentService.listCurriculumLessons(comp.curriculumId, lessonId),
        ])
        setAllObjectives(objs)
        setAllKnowledgeUnits(kus)
        setAllSkills(sks)
        setAllPrereqLessons(lessons)
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không thể tải cấu trúc P03 của bài học.')
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const handleAddBlock = () => {
    setBlocks((prev) => [...prev, createDefaultBlock(newBlockType, prev.length)])
    setActionSuccess(null)
    setActionError(null)
  }

  const handleMoveBlock = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= blocks.length) return
    setBlocks((prev) => {
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next.map((b, i) => ({ ...b, orderIndex: i }))
    })
  }

  const handleRemoveBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, orderIndex: i })))
  }

  const handleUpdateBlockPayload = (index: number, patch: Record<string, unknown>) => {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === index
          ? ({ ...b, payload: { ...(b.payload as Record<string, unknown>), ...patch } } as LessonContentBlock)
          : b
      )
    )
  }

  const handleSaveComposition = async () => {
    if (!composition) return
    setSaving(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const updated = await contentService.replaceLessonComposition(lessonId, {
        rowVersion: composition.rowVersion,
        blocks: blocks.map((b, i) => ({ ...b, orderIndex: i })),
        objectiveIds,
        knowledgeUnitIds,
        skillIds,
        prerequisiteLessonIds,
      })
      setComposition(updated)
      setBlocks(updated.blocks)
      const revPage = await contentService.getLessonRevisions(lessonId, 1, 20)
      setRevisions(revPage.items)
      setActionSuccess('✓ Đã lưu cấu trúc khối nội dung & đồ thị kiến thức P03.')
      await onCompositionMutated?.()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Lỗi khi lưu cấu trúc P03.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateNode = async (kind: 'objective' | 'ku' | 'skill') => {
    if (!composition?.curriculumId) return
    setActionError(null)
    try {
      if (kind === 'objective') {
        const created = await contentService.createCurriculumObjective(composition.curriculumId, {
          code: newNodeCode,
          title: newNodeTitle,
        })
        setAllObjectives((prev) => [...prev, created])
        setObjectiveIds((prev) => [...prev, created.id])
      } else if (kind === 'ku') {
        const created = await contentService.createCurriculumKnowledgeUnit(composition.curriculumId, {
          code: newNodeCode,
          title: newNodeTitle,
        })
        setAllKnowledgeUnits((prev) => [...prev, created])
        setKnowledgeUnitIds((prev) => [...prev, created.id])
      } else {
        const created = await contentService.createCurriculumSkill(composition.curriculumId, {
          code: newNodeCode,
          title: newNodeTitle,
        })
        setAllSkills((prev) => [...prev, created])
        setSkillIds((prev) => [...prev, created.id])
      }
      setNewNodeCode('')
      setNewNodeTitle('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể tạo mục mới.')
    }
  }

  const handleConfirmRollback = async () => {
    if (!composition || !rollbackTarget) return
    setSaving(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const updated = await contentService.rollbackLessonRevision(lessonId, rollbackTarget.id, {
        rowVersion: composition.rowVersion,
      })
      setComposition(updated)
      setBlocks(updated.blocks)
      setObjectiveIds(updated.objectives.map((o) => o.id))
      setKnowledgeUnitIds(updated.knowledgeUnits.map((k) => k.id))
      setSkillIds(updated.skills.map((s) => s.id))
      setPrerequisiteLessonIds(updated.prerequisites.map((p) => p.lessonId))
      const revPage = await contentService.getLessonRevisions(lessonId, 1, 20)
      setRevisions(revPage.items)
      setRollbackTarget(null)
      setActionSuccess(`✓ Đã khôi phục bản nháp từ phiên bản v${rollbackTarget.version}.`)
      await onCompositionMutated?.()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Lỗi khi rollback phiên bản.')
      setRollbackTarget(null)
    } finally {
      setSaving(false)
    }
  }

  const toggleId = (list: string[], id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  if (loading) {
    return (
      <section className="lcp-panel" aria-label="Cấu trúc bài học P03">
        <Skeleton height={36} />
        <Skeleton height={120} />
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="lcp-panel" aria-label="Cấu trúc bài học P03">
        <PageErrorState title="Không thể tải cấu trúc bài học P03" description={loadError} onRetry={loadAll} />
      </section>
    )
  }

  const filterNodes = (nodes: CurriculumNodeRef[]) => {
    if (!nodeSearch.trim()) return nodes
    const q = nodeSearch.trim().toLowerCase()
    return nodes.filter((n) => n.code.toLowerCase().includes(q) || n.title.toLowerCase().includes(q))
  }

  return (
    <section className="lcp-panel" aria-label="Cấu trúc bài học P03">
      <div className="lcp-header">
        <div>
          <h2 className="lcp-title">Cấu trúc bài học chuẩn hóa (P03)</h2>
          <p className="lcp-subtitle">
            Khối nội dung đóng theo schema v1, mục tiêu học tập, đơn vị kiến thức, kỹ năng và lịch sử phiên bản.
          </p>
        </div>
        <div className="lcp-header-actions">
          <Button variant="secondary" size="sm" onClick={() => setShowPreview((p) => !p)}>
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPreview ? 'Ẩn xem trước' : 'Xem trước'}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveComposition} disabled={saving}>
            <Save size={15} />
            {saving ? 'Đang lưu...' : 'Lưu cấu trúc P03'}
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="lcp-alert lcp-alert--error" role="alert">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="lcp-alert lcp-alert--success" role="status">
          {actionSuccess}
        </div>
      )}

      <div className="lcp-tabs" role="tablist" aria-label="Phần cấu trúc P03">
        <button type="button" role="tab" aria-selected={activeTab === 'blocks'} className={`lcp-tab ${activeTab === 'blocks' ? 'is-active' : ''}`} onClick={() => setActiveTab('blocks')}>
          Khối nội dung ({blocks.length})
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'objectives'} className={`lcp-tab ${activeTab === 'objectives' ? 'is-active' : ''}`} onClick={() => setActiveTab('objectives')}>
          Mục tiêu ({objectiveIds.length})
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'graph'} className={`lcp-tab ${activeTab === 'graph' ? 'is-active' : ''}`} onClick={() => setActiveTab('graph')}>
          Kiến thức & Kỹ năng ({knowledgeUnitIds.length + skillIds.length + prerequisiteLessonIds.length})
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'revisions'} className={`lcp-tab ${activeTab === 'revisions' ? 'is-active' : ''}`} onClick={() => setActiveTab('revisions')}>
          <History size={14} /> Phiên bản ({revisions.length})
        </button>
      </div>

      {activeTab === 'blocks' && (
        <div className="lcp-section">
          <div className="lcp-add-bar">
            <label htmlFor="lcp-block-type" className="lcp-sr-label">Loại khối nội dung</label>
            <select
              id="lcp-block-type"
              className="lcp-select"
              value={newBlockType}
              onChange={(e) => setNewBlockType(e.target.value as LessonBlockType)}
            >
              {(Object.keys(BLOCK_TYPE_LABELS) as LessonBlockType[]).map((bt) => (
                <option key={bt} value={bt}>{BLOCK_TYPE_LABELS[bt]}</option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={handleAddBlock}>
              <Plus size={15} /> Thêm khối
            </Button>
          </div>

          {blocks.length === 0 ? (
            <EmptyState
              title="Chưa có khối nội dung P03"
              description="Chọn loại khối ở trên và nhấn Thêm khối để soạn nội dung có kiểm định schema."
            />
          ) : (
            <div className="lcp-block-list">
              {blocks.map((block, index) => (
                <div key={block.id ?? `new-${index}`} className="lcp-block-card">
                  <div className="lcp-block-card__head">
                    <span className="lcp-block-badge">#{index + 1} · {BLOCK_TYPE_LABELS[block.blockType]}</span>
                    <div className="lcp-block-card__actions">
                      <button type="button" className="lcp-icon-btn" aria-label={`Di chuyển khối ${index + 1} lên`} onClick={() => handleMoveBlock(index, -1)} disabled={index === 0}>
                        <ArrowUp size={15} />
                      </button>
                      <button type="button" className="lcp-icon-btn" aria-label={`Di chuyển khối ${index + 1} xuống`} onClick={() => handleMoveBlock(index, 1)} disabled={index === blocks.length - 1}>
                        <ArrowDown size={15} />
                      </button>
                      <button type="button" className="lcp-icon-btn lcp-icon-btn--danger" aria-label={`Xóa khối ${index + 1}`} onClick={() => handleRemoveBlock(index)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <BlockFieldsEditor block={block} onChange={(patch) => handleUpdateBlockPayload(index, patch)} />
                </div>
              ))}
            </div>
          )}

          {showPreview && blocks.length > 0 && (
            <div className="lcp-preview">
              <h3>Xem trước học sinh</h3>
              <LessonContentBlockRenderer blocks={blocks} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'objectives' && (
        <div className="lcp-section">
          {!composition?.curriculumId ? (
            <EmptyState title="Chưa gắn CurriculumEdition" description="Bài học cần thuộc một chương đã gắn CurriculumEdition để liên kết mục tiêu." />
          ) : (
            <>
              <div className="lcp-node-toolbar">
                <input className="lcp-input" placeholder="Tìm mục tiêu..." value={nodeSearch} onChange={(e) => setNodeSearch(e.target.value)} />
                <input className="lcp-input lcp-input--sm" placeholder="Mã (VD: OBJ01)" value={newNodeCode} onChange={(e) => setNewNodeCode(e.target.value)} />
                <input className="lcp-input" placeholder="Tên mục tiêu mới" value={newNodeTitle} onChange={(e) => setNewNodeTitle(e.target.value)} />
                <Button variant="secondary" size="sm" onClick={() => handleCreateNode('objective')} disabled={!newNodeCode.trim() || !newNodeTitle.trim()}>
                  <Plus size={14} /> Tạo
                </Button>
              </div>
              <div className="lcp-checklist">
                {filterNodes(allObjectives).map((obj) => (
                  <label key={obj.id} className="lcp-check-item">
                    <input type="checkbox" checked={objectiveIds.includes(obj.id)} onChange={() => toggleId(objectiveIds, obj.id, setObjectiveIds)} />
                    <span><strong>{obj.code}</strong> — {obj.title}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'graph' && (
        <div className="lcp-section">
          {!composition?.curriculumId ? (
            <EmptyState title="Chưa gắn CurriculumEdition" description="Bài học cần thuộc một chương đã gắn CurriculumEdition để liên kết kiến thức, kỹ năng và bài tiên quyết." />
          ) : (
            <div className="lcp-graph-grid">
              <div>
                <h3>Đơn vị kiến thức (Knowledge Units)</h3>
                <div className="lcp-node-toolbar">
                  <input className="lcp-input lcp-input--sm" placeholder="Mã KU" value={newNodeCode} onChange={(e) => setNewNodeCode(e.target.value)} />
                  <input className="lcp-input" placeholder="Tên kiến thức" value={newNodeTitle} onChange={(e) => setNewNodeTitle(e.target.value)} />
                  <Button variant="secondary" size="sm" onClick={() => handleCreateNode('ku')} disabled={!newNodeCode.trim() || !newNodeTitle.trim()}>
                    <Plus size={14} /> Tạo KU
                  </Button>
                </div>
                <div className="lcp-checklist">
                  {allKnowledgeUnits.map((ku) => (
                    <label key={ku.id} className="lcp-check-item">
                      <input type="checkbox" checked={knowledgeUnitIds.includes(ku.id)} onChange={() => toggleId(knowledgeUnitIds, ku.id, setKnowledgeUnitIds)} />
                      <span><strong>{ku.code}</strong> — {ku.title}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h3>Kỹ năng (Skills)</h3>
                <div className="lcp-node-toolbar">
                  <Button variant="secondary" size="sm" onClick={() => handleCreateNode('skill')} disabled={!newNodeCode.trim() || !newNodeTitle.trim()}>
                    <Plus size={14} /> Tạo Skill từ mã/tên trên
                  </Button>
                </div>
                <div className="lcp-checklist">
                  {allSkills.map((sk) => (
                    <label key={sk.id} className="lcp-check-item">
                      <input type="checkbox" checked={skillIds.includes(sk.id)} onChange={() => toggleId(skillIds, sk.id, setSkillIds)} />
                      <span><strong>{sk.code}</strong> — {sk.title}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h3>Bài học tiên quyết (Prerequisites)</h3>
                <div className="lcp-checklist">
                  {allPrereqLessons.map((pl) => (
                    <label key={pl.lessonId} className="lcp-check-item">
                      <input type="checkbox" checked={prerequisiteLessonIds.includes(pl.lessonId)} onChange={() => toggleId(prerequisiteLessonIds, pl.lessonId, setPrerequisiteLessonIds)} />
                      <span>{pl.code ? `${pl.code} — ` : ''}{pl.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'revisions' && (
        <div className="lcp-section">
          {revisions.length === 0 ? (
            <EmptyState title="Chưa có lịch sử phiên bản" description="Lưu cấu trúc P03 để tạo phiên bản bất biến đầu tiên." />
          ) : (
            <div className="lcp-rev-list">
              {revisions.map((rev) => (
                <div key={rev.id} className="lcp-rev-item">
                  <div>
                    <strong>v{rev.version}</strong> · <span>{rev.status}</span> · <small>{new Date(rev.createdAt).toLocaleString('vi-VN')}</small>
                    <p className="lcp-rev-meta">
                      Tác giả: {rev.createdBy || rev.authorId || 'staff'}
                      {rev.reason ? ` · Lý do: ${rev.reason}` : ''}
                      {rev.sourceRevisionId ? ` · Nguồn: ${rev.sourceRevisionId}` : ''}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setRollbackTarget(rev)} disabled={saving}>
                    <RotateCcw size={14} /> Khôi phục bản nháp
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={rollbackTarget !== null}
        title="Xác nhận khôi phục phiên bản"
        description={rollbackTarget ? `Khôi phục nội dung từ v${rollbackTarget.version} thành một bản nháp mới? Lịch sử các phiên bản cũ vẫn được giữ nguyên.` : ''}
        confirmText="Khôi phục"
        cancelText="Hủy"
        isLoading={saving}
        onConfirm={handleConfirmRollback}
        onCancel={() => setRollbackTarget(null)}
      />
    </section>
  )
}

function BlockFieldsEditor({ block, onChange }: { block: LessonContentBlock; onChange: (patch: Record<string, unknown>) => void }) {
  switch (block.blockType) {
    case 'text':
    case 'markdown':
      return (
        <textarea
          className="lcp-textarea"
          rows={3}
          placeholder={block.blockType === 'markdown' ? 'Nhập Markdown an toàn (#, -, văn bản)...' : 'Nhập nội dung văn bản...'}
          value={block.payload.content}
          onChange={(e) => onChange({ content: e.target.value })}
        />
      )
    case 'formula':
      return (
        <div className="lcp-fields-grid">
          <input className="lcp-input" placeholder="LaTeX (VD: E = mc^2)" value={block.payload.latex} onChange={(e) => onChange({ latex: e.target.value })} />
          <input className="lcp-input" placeholder="Chú thích (tùy chọn)" value={block.payload.caption ?? ''} onChange={(e) => onChange({ caption: e.target.value })} />
        </div>
      )
    case 'image':
      return (
        <div className="lcp-fields-grid">
          <input className="lcp-input" placeholder="URL ảnh (https://... hoặc /uploads/...)" value={block.payload.url} onChange={(e) => onChange({ url: e.target.value })} />
          <input className="lcp-input" placeholder="Văn bản thay thế alt (bắt buộc)" value={block.payload.alt} onChange={(e) => onChange({ alt: e.target.value })} />
          <input className="lcp-input" placeholder="Chú thích (tùy chọn)" value={block.payload.caption ?? ''} onChange={(e) => onChange({ caption: e.target.value })} />
        </div>
      )
    case 'video':
      return (
        <div className="lcp-fields-grid">
          <input className="lcp-input" placeholder="URL video (https://...)" value={block.payload.url} onChange={(e) => onChange({ url: e.target.value })} />
          <input className="lcp-input" placeholder="Tiêu đề video" value={block.payload.title} onChange={(e) => onChange({ title: e.target.value })} />
        </div>
      )
    case 'example':
      return (
        <div className="lcp-fields-grid">
          <input className="lcp-input" placeholder="Tiêu đề ví dụ" value={block.payload.title} onChange={(e) => onChange({ title: e.target.value })} />
          <textarea className="lcp-textarea" rows={2} placeholder="Đề bài / tình huống" value={block.payload.prompt} onChange={(e) => onChange({ prompt: e.target.value })} />
          <textarea className="lcp-textarea" rows={2} placeholder="Lời giải (tùy chọn)" value={block.payload.solution ?? ''} onChange={(e) => onChange({ solution: e.target.value })} />
        </div>
      )
    case 'exercise':
      return (
        <div className="lcp-fields-grid">
          <textarea className="lcp-textarea" rows={2} placeholder="Nội dung bài tập" value={block.payload.prompt} onChange={(e) => onChange({ prompt: e.target.value })} />
          <input className="lcp-input" placeholder="Gợi ý (tùy chọn)" value={block.payload.hint ?? ''} onChange={(e) => onChange({ hint: e.target.value })} />
          <input className="lcp-input" placeholder="Đáp án bảo vệ (ẩn với học sinh)" value={block.payload.answerKey ?? ''} onChange={(e) => onChange({ answerKey: e.target.value })} />
        </div>
      )
    case 'table':
      return (
        <div className="lcp-fields-grid">
          <input className="lcp-input" placeholder="Tiêu đề bảng (caption)" value={block.payload.caption ?? ''} onChange={(e) => onChange({ caption: e.target.value })} />
          <input
            className="lcp-input"
            placeholder="Tiêu đề cột (ngăn cách bằng dấu |)"
            value={block.payload.headers.join(' | ')}
            onChange={(e) => onChange({ headers: e.target.value.split('|').map((s) => s.trim()) })}
          />
          <textarea
            className="lcp-textarea"
            rows={3}
            placeholder="Mỗi dòng một hàng, các ô ngăn cách bằng |"
            value={block.payload.rows.map((r) => r.join(' | ')).join('\n')}
            onChange={(e) =>
              onChange({
                rows: e.target.value.split(/\r?\n/).filter(Boolean).map((line) => line.split('|').map((c) => c.trim())),
              })
            }
          />
        </div>
      )
    case 'diagram':
      return (
        <div className="lcp-fields-grid">
          <select className="lcp-select" value={block.payload.format} onChange={(e) => onChange({ format: e.target.value })}>
            <option value="mermaid">mermaid</option>
            <option value="svg-ref">svg-ref</option>
            <option value="structured">structured</option>
          </select>
          <input className="lcp-input" placeholder="Mô tả alt (bắt buộc)" value={block.payload.alt} onChange={(e) => onChange({ alt: e.target.value })} />
          <textarea className="lcp-textarea" rows={2} placeholder="Mã nguồn sơ đồ" value={block.payload.source} onChange={(e) => onChange({ source: e.target.value })} />
        </div>
      )
    case 'timeline':
      return (
        <div className="lcp-fields-grid">
          <input className="lcp-input" placeholder="Tiêu đề dòng thời gian" value={block.payload.caption ?? ''} onChange={(e) => onChange({ caption: e.target.value })} />
          <textarea
            className="lcp-textarea"
            rows={3}
            placeholder="Mỗi dòng: Mốc thời gian | Tiêu đề | Mô tả"
            value={block.payload.events.map((ev) => `${ev.date} | ${ev.title}${ev.description ? ` | ${ev.description}` : ''}`).join('\n')}
            onChange={(e) =>
              onChange({
                events: e.target.value.split(/\r?\n/).filter(Boolean).map((line) => {
                  const [date = '', title = '', description = ''] = line.split('|').map((s) => s.trim())
                  return { date, title, description }
                }),
              })
            }
          />
        </div>
      )
    case 'summary':
      return (
        <div className="lcp-fields-grid">
          <input className="lcp-input" placeholder="Tiêu đề tóm tắt" value={block.payload.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} />
          <textarea
            className="lcp-textarea"
            rows={3}
            placeholder="Mỗi dòng một điểm trọng tâm"
            value={block.payload.points.join('\n')}
            onChange={(e) => onChange({ points: e.target.value.split(/\r?\n/) })}
          />
        </div>
      )
    case 'reference':
      return (
        <div className="lcp-fields-grid">
          <input className="lcp-input" placeholder="Nhãn tài liệu" value={block.payload.label} onChange={(e) => onChange({ label: e.target.value })} />
          <input className="lcp-input" placeholder="URL (tùy chọn)" value={block.payload.url ?? ''} onChange={(e) => onChange({ url: e.target.value })} />
          <input className="lcp-input" placeholder="Trích dẫn (tùy chọn)" value={block.payload.citation ?? ''} onChange={(e) => onChange({ citation: e.target.value })} />
        </div>
      )
  }
}
