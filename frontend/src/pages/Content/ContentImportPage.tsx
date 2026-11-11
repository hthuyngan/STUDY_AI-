import React, { useState, useRef, useId, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  BookOpen,
  Layers,
  FileText,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  FileUp,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  curriculumImportService,
  CurriculumImportPreviewResponse,
  CurriculumImportConfirmResponse,
} from '@/services/curriculumImport.service'
import { ApiError } from '@/lib/apiClient'
import './ContentPages.css'
import './ContentImportPage.css'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15MB limit matching backend parser
const ALLOWED_EXTENSIONS = ['.json', '.csv', '.xlsx']

export const ContentImportPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const auditNoteId = useId()

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileClientError, setFileClientError] = useState<string | null>(null)

  // API Call states
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<CurriculumImportPreviewResponse | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Confirm states
  const [auditNote, setAuditNote] = useState('')
  const [isDryRun, setIsDryRun] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [confirmResult, setConfirmResult] = useState<CurriculumImportConfirmResponse | null>(null)

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  // Validate selected file extension and size
  const validateFile = (file: File): boolean => {
    setFileClientError(null)
    const lowerName = file.name.toLowerCase()
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
    if (!hasValidExt) {
      setFileClientError(
        `Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp .json, .csv hoặc .xlsx.`
      )
      return false
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileClientError(
        `Dung lượng tệp (${formatBytes(file.size)}) vượt quá giới hạn tối đa 15MB.`
      )
      return false
    }

    if (file.size === 0) {
      setFileClientError('Tệp rỗng (0 bytes). Vui lòng chọn tệp có nội dung.')
      return false
    }

    return true
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (validateFile(file)) {
        setSelectedFile(file)
        setPreviewData(null)
        setPreviewError(null)
        setConfirmResult(null)
        setConfirmError(null)
      } else {
        setSelectedFile(null)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (validateFile(file)) {
        setSelectedFile(file)
        setPreviewData(null)
        setPreviewError(null)
        setConfirmResult(null)
        setConfirmError(null)
      } else {
        setSelectedFile(null)
      }
    }
  }

  const handleTriggerPreview = async () => {
    if (!selectedFile) return
    setIsPreviewing(true)
    setPreviewError(null)
    setConfirmError(null)
    setConfirmResult(null)

    try {
      const res = await curriculumImportService.previewImport(selectedFile)
      setPreviewData(res)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setPreviewError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
        } else if (err.status === 403) {
          setPreviewError('Bạn không có quyền thực hiện thao tác này (cần quyền content hoặc admin).')
        } else if (err.status === 400 || err.status === 422) {
          const body = err.data as { message?: string; detail?: string }
          setPreviewError(body?.message || body?.detail || 'Dữ liệu tệp không hợp lệ.')
        } else {
          setPreviewError(`Lỗi khi xem trước dữ liệu: ${err.message}`)
        }
      } else {
        setPreviewError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền mạng.')
      }
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!previewData?.previewToken || isConfirming) return
    setIsConfirming(true)
    setConfirmError(null)

    try {
      const res = isDryRun
        ? await curriculumImportService.confirmImport(
            previewData.previewToken,
            auditNote,
            true
          )
        : await curriculumImportService.confirmImport(
            previewData.previewToken,
            auditNote
          )
      setConfirmResult(res)
      setIsConfirmDialogOpen(false)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          const body = err.data as { message?: string; errorCode?: string }
          setConfirmError(
            `Xung đột dữ liệu (409): ${body?.message || 'Dữ liệu đã tồn tại hoặc đã thay đổi trong hệ thống.'}`
          )
        } else if (err.status === 404) {
          setConfirmError(
            'Mã phiên xem trước đã hết hạn (404) hoặc không tìm thấy. Vui lòng tải lại tệp để xem trước mới.'
          )
        } else if (err.status === 403) {
          setConfirmError('Bạn không có quyền thực hiện xác nhận nhập dữ liệu (403).')
        } else {
          setConfirmError(`Không thể xác nhận nhập dữ liệu: ${err.message}`)
        }
      } else {
        setConfirmError('Không thể hoàn thành giao dịch nhập dữ liệu do sự cố kết nối.')
      }
      setIsConfirmDialogOpen(false)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewData(null)
    setPreviewError(null)
    setFileClientError(null)
    setConfirmError(null)
    setConfirmResult(null)
    setAuditNote('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Derive counts from previewItems
  const entityCounts = useMemo(() => {
    if (!previewData?.previewItems) {
      return { subjects: 0, chapters: 0, lessons: 0, questions: 0 }
    }
    return {
      subjects: previewData.previewItems.filter((i) => i.entityType?.toLowerCase() === 'subject').length,
      chapters: previewData.previewItems.filter((i) => i.entityType?.toLowerCase() === 'chapter').length,
      lessons: previewData.previewItems.filter((i) => i.entityType?.toLowerCase() === 'lesson').length,
      questions: previewData.previewItems.filter((i) => i.entityType?.toLowerCase() === 'question').length,
    }
  }, [previewData])

  const isValidForConfirm = Boolean(
    previewData?.summary?.isValid &&
    previewData?.summary?.errorCount === 0 &&
    previewData?.summary?.conflictCount === 0
  )

  return (
    <div className="staff-page">
      {/* Header & Breadcrumb */}
      <div className="staff-page-header">
        <Breadcrumb
          items={[
            { label: 'Nội dung', to: '/content' },
            { label: 'Chương trình học', to: '/content/subjects' },
            { label: 'Nhập giáo trình' },
          ]}
        />
        <div className="staff-page-title-row" style={{ marginTop: '10px' }}>
          <div>
            <h1>Nhập giáo trình hàng loạt</h1>
            <p className="staff-page-desc">
              Tải lên cấu trúc môn học, chương, bài học và câu hỏi từ tệp JSON, CSV hoặc Excel
              với cơ chế kiểm thử tính toàn vẹn 2 bước (Preview & Confirm) nghiêm ngặt.
            </p>
          </div>
        </div>
      </div>

      <div className="import-container">
        {/* SUCCESS OR DRY-RUN RESULT STATE */}
        {confirmResult && (
          <div className="import-success-card" data-testid="import-success-card">
            <div className="import-success-icon">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="import-success-title">
              {confirmResult.isDryRun
                ? 'Đối soát Dry-Run hoàn thành thành công!'
                : 'Nhập giáo trình thành công!'}
            </h2>
            <p className="import-success-desc">
              {confirmResult.isDryRun
                ? 'Đã đối soát toàn vẹn cấu trúc và mô phỏng quy trình nhập dữ liệu thành công. Không có bất kỳ thay đổi nào được ghi vào cơ sở dữ liệu.'
                : 'Toàn bộ cấu trúc giáo trình đã được nhập an toàn vào hệ thống trong giao dịch ACID duy nhất. Dữ liệu đã sẵn sàng để quản lý và học tập.'}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div className="import-success-audit-chip" title="Mã ghi vết kiểm toán hệ thống">
                <ShieldCheck size={16} />
                <span>AuditLog ID: <strong>{confirmResult.auditLogId}</strong></span>
              </div>
              {confirmResult.isDryRun && (
                <div className="import-success-audit-chip" style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#166534' }}>
                  <span>Chế độ: <strong>DRY-RUN (Zero DB Writes)</strong></span>
                </div>
              )}
              {confirmResult.provenance && (
                <div className="import-success-audit-chip" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
                  <span>Nguồn: <strong>{confirmResult.provenance}</strong></span>
                </div>
              )}
            </div>

            {/* Imported entities summary */}
            <div className="import-kpi-grid" style={{ width: '100%', maxWidth: '800px' }}>
              <div className="import-kpi-card">
                <div className="import-kpi-icon subject">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="import-kpi-value">{confirmResult.entityCounts.subjects}</div>
                  <div className="import-kpi-label">Môn học đã tạo</div>
                </div>
              </div>

              <div className="import-kpi-card">
                <div className="import-kpi-icon chapter">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="import-kpi-value">{confirmResult.entityCounts.chapters}</div>
                  <div className="import-kpi-label">Chương học đã tạo</div>
                </div>
              </div>

              <div className="import-kpi-card">
                <div className="import-kpi-icon lesson">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="import-kpi-value">{confirmResult.entityCounts.lessons}</div>
                  <div className="import-kpi-label">Bài học đã tạo</div>
                </div>
              </div>

              <div className="import-kpi-card">
                <div className="import-kpi-icon question">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <div className="import-kpi-value">{confirmResult.entityCounts.questions}</div>
                  <div className="import-kpi-label">Câu hỏi trắc nghiệm</div>
                </div>
              </div>
            </div>

            <div className="import-success-actions">
              <Link to="/content/subjects" className="staff-btn staff-btn-primary">
                <BookOpen size={15} />
                <span>Xem danh sách môn học</span>
              </Link>
              <Link to="/content/lessons" className="staff-btn staff-btn-secondary">
                <FileText size={15} />
                <span>Xem danh sách bài học</span>
              </Link>
              <button
                type="button"
                className="staff-btn staff-btn-secondary"
                onClick={handleReset}
              >
                <RotateCcw size={15} />
                <span>Nhập tệp khác</span>
              </button>
            </div>
          </div>
        )}

        {/* VNHSGE Academic Attribution & Copyright Notice */}
        <div style={{ marginBottom: '16px', padding: '14px 18px', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: '10px' }} data-testid="vnhsge-attribution-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-primary, #2563eb)', marginBottom: '4px' }}>
            <ShieldCheck size={18} />
            <span>Hỗ trợ bộ dữ liệu chuẩn hóa VNHSGE (arXiv:2305.12199 / CC BY-NC-SA 4.0)</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary, #475569)', lineHeight: 1.5 }}>
            Hệ thống hỗ trợ phân tích và trích xuất tự động 9 môn thi THPT (Toán, Vật lý, Hóa học, Sinh học, Ngữ văn, Tiếng Anh, Lịch sử, Địa lý, GDCD), tự động nhận diện câu hỏi trắc nghiệm và tự luận, bảo toàn biểu thức Toán học (KaTeX/LaTeX) và liên kết tệp hình ảnh. Thao tác đối soát được thực hiện an toàn qua chế độ Dry-run bảo đảm tính toàn vẹn dữ liệu.
          </p>
        </div>

        {/* STEP 1: FILE SELECTION / DROPZONE */}
        {!confirmResult && (
          <div className="import-card">
            <div className="import-card-header">
              <h2 className="import-card-title">
                <UploadCloud size={20} />
                <span>Bước 1: Chọn tệp dữ liệu</span>
              </h2>
              <span className="staff-page-desc" style={{ fontSize: '0.8rem' }}>
                Hỗ trợ định dạng .json, .csv, .xlsx — Tối đa 15MB
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json,.csv,.xlsx,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              data-testid="file-upload-input"
            />

            <div
              className={`import-dropzone ${isDragOver ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileInputRef.current?.click()
                }
              }}
              data-testid="import-dropzone"
            >
              <div className="import-dropzone-icon">
                <FileUp size={24} />
              </div>
              <p className="import-dropzone-title">
                Kéo và thả tệp dữ liệu vào đây, hoặc <span style={{ color: 'var(--color-primary, #2563eb)' }}>bấm để duyệt</span>
              </p>
              <p className="import-dropzone-subtitle">
                Đảm bảo tệp tuân thủ đúng cấu trúc phân cấp: Môn học $\rightarrow$ Chương $\rightarrow$ Bài học $\rightarrow$ Câu hỏi
              </p>
            </div>

            {/* Client file validation error */}
            {fileClientError && (
              <div
                className="import-banner error"
                style={{ marginTop: '12px' }}
                data-testid="file-client-error"
              >
                <XCircle size={18} />
                <div>{fileClientError}</div>
              </div>
            )}

            {/* Selected File Card */}
            {selectedFile && !fileClientError && (
              <div className="import-file-selected" data-testid="selected-file-info">
                <div className="import-file-meta">
                  <FileCheck2 size={24} color="var(--color-primary, #2563eb)" />
                  <div>
                    <div className="import-file-name">{selectedFile.name}</div>
                    <div className="import-file-size">{formatBytes(selectedFile.size)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="staff-btn staff-btn-secondary"
                    onClick={handleReset}
                    disabled={isPreviewing || isConfirming}
                  >
                    Đổi tệp
                  </button>
                  <button
                    type="button"
                    className="staff-btn staff-btn-primary"
                    onClick={handleTriggerPreview}
                    disabled={isPreviewing || isConfirming}
                    data-testid="btn-preview-import"
                  >
                    {isPreviewing ? 'Đang trích xuất dữ liệu...' : 'Xem trước dữ liệu'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PREVIEW ERROR BANNER */}
        {previewError && (
          <div className="import-banner error" data-testid="preview-error-banner">
            <XCircle size={20} />
            <div>
              <div className="import-banner-title">Lỗi xem trước dữ liệu</div>
              <div>{previewError}</div>
            </div>
          </div>
        )}

        {/* CONFIRM ERROR BANNER */}
        {confirmError && (
          <div className="import-banner error" data-testid="confirm-error-banner">
            <XCircle size={20} />
            <div>
              <div className="import-banner-title">Xác nhận nhập dữ liệu thất bại</div>
              <div>{confirmError}</div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW SUMMARY & VALIDATION RESULTS */}
        {previewData && !confirmResult && (
          <div className="import-card" data-testid="preview-result-card">
            <div className="import-card-header">
              <h2 className="import-card-title">
                <FileCheck2 size={20} />
                <span>Bước 2: Kết quả kiểm tra dữ liệu</span>
              </h2>
              <span className="import-file-size">
                Phiên token: <code>{previewData.previewToken.slice(0, 16)}...</code> (Hạn: 1 giờ)
              </span>
            </div>

            {/* STRICT-ONLY STATUS BANNER */}
            {isValidForConfirm ? (
              <div className="import-banner success" data-testid="preview-valid-banner">
                <CheckCircle2 size={20} />
                <div>
                  <div className="import-banner-title">Tệp hợp lệ để nhập vào hệ thống</div>
                  <div>
                    Không phát hiện lỗi định dạng hoặc xung đột dữ liệu. Bạn có thể tiến hành
                    xác nhận ghi dữ liệu.
                  </div>
                </div>
              </div>
            ) : (
              <div className="import-banner error" data-testid="preview-invalid-banner">
                <AlertTriangle size={20} />
                <div>
                  <div className="import-banner-title">
                    Phát hiện {previewData.summary.errorCount} lỗi hoặc xung đột dữ liệu
                  </div>
                  <div>
                    Hệ thống áp dụng chính sách <strong>Strict-only (Fail-closed)</strong>: Toàn bộ
                    tệp nhập sẽ bị từ chối nếu có bất kỳ lỗi nào. Vui lòng sửa các lỗi bên dưới
                    trước khi tải lại.
                  </div>
                </div>
              </div>
            )}

            {/* ENTITY COUNTS GRID */}
            <div className="import-kpi-grid">
              <div className="import-kpi-card">
                <div className="import-kpi-icon subject">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="import-kpi-value">{entityCounts.subjects}</div>
                  <div className="import-kpi-label">Môn học trích xuất</div>
                </div>
              </div>

              <div className="import-kpi-card">
                <div className="import-kpi-icon chapter">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="import-kpi-value">{entityCounts.chapters}</div>
                  <div className="import-kpi-label">Chương học trích xuất</div>
                </div>
              </div>

              <div className="import-kpi-card">
                <div className="import-kpi-icon lesson">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="import-kpi-value">{entityCounts.lessons}</div>
                  <div className="import-kpi-label">Bài học trích xuất</div>
                </div>
              </div>

              <div className="import-kpi-card">
                <div className="import-kpi-icon question">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <div className="import-kpi-value">{entityCounts.questions}</div>
                  <div className="import-kpi-label">Câu hỏi trắc nghiệm</div>
                </div>
              </div>
            </div>

            {/* DETAILED ERRORS LIST */}
            {previewData.errors && previewData.errors.length > 0 && (
              <div className="import-issues-section" data-testid="preview-errors-list">
                <div className="import-issues-header" style={{ color: 'var(--color-danger, #dc2626)' }}>
                  <XCircle size={16} />
                  <span>Danh sách lỗi chi tiết ({previewData.errors.length})</span>
                </div>
                <div className="staff-table-wrapper">
                  <table className="import-issues-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Dòng</th>
                        <th style={{ width: '140px' }}>Trường</th>
                        <th style={{ width: '180px' }}>Mã lỗi</th>
                        <th>Nội dung thông báo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.errors.map((err, idx) => (
                        <tr key={idx}>
                          <td>{err.row > 0 ? `Dòng ${err.row}` : 'Toàn tệp'}</td>
                          <td><code>{err.field || '—'}</code></td>
                          <td><span className="badge-error">{err.errorCode}</span></td>
                          <td>{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* WARNINGS LIST */}
            {previewData.warnings && previewData.warnings.length > 0 && (
              <div className="import-issues-section" data-testid="preview-warnings-list">
                <div className="import-issues-header" style={{ color: 'var(--color-warning, #d97706)' }}>
                  <AlertTriangle size={16} />
                  <span>Cảnh báo lưu ý ({previewData.warnings.length})</span>
                </div>
                <div className="staff-table-wrapper">
                  <table className="import-issues-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Dòng</th>
                        <th style={{ width: '140px' }}>Trường</th>
                        <th style={{ width: '180px' }}>Mã cảnh báo</th>
                        <th>Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.warnings.map((w, idx) => (
                        <tr key={idx}>
                          <td>{w.row > 0 ? `Dòng ${w.row}` : '—'}</td>
                          <td><code>{w.field || '—'}</code></td>
                          <td><span className="badge-warning">{w.errorCode}</span></td>
                          <td>{w.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AUDIT NOTE & DRY-RUN OPTION & CONFIRM ACTION */}
            <div className="import-audit-section">
              <label htmlFor={auditNoteId} className="import-audit-label">
                Ghi chú kiểm toán hệ thống (Audit Note - Tùy chọn)
              </label>
              <textarea
                id={auditNoteId}
                className="import-audit-textarea"
                placeholder="Ví dụ: Nhập bổ sung chương trình Toán 12 học kỳ II năm học 2026-2027 theo chuẩn mới..."
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                disabled={isConfirming || !isValidForConfirm}
                maxLength={500}
                data-testid="audit-note-input"
              />

              {/* Dry-run simulation mode toggle */}
              <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--color-bg-subtle, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                    data-testid="dry-run-checkbox"
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Chế độ kiểm thử an toàn (Dry-Run) — Đối soát toàn vẹn, hoàn toàn không ghi CSDL</span>
                </label>
                <p style={{ margin: '4px 0 0 26px', fontSize: '0.8rem', color: 'var(--color-text-secondary, #64748b)' }}>
                  Khuyến nghị bật khi kiểm thử cấu trúc đề thi VNHSGE hoặc tệp mới trước khi thực hiện ghi dữ liệu.
                </p>
              </div>
            </div>

            <div className="import-action-bar">
              <button
                type="button"
                className="staff-btn staff-btn-secondary"
                onClick={handleReset}
                disabled={isConfirming}
              >
                Hủy / Chọn tệp khác
              </button>

              <button
                type="button"
                className="staff-btn staff-btn-primary"
                onClick={() => setIsConfirmDialogOpen(true)}
                disabled={!isValidForConfirm || isConfirming}
                data-testid="btn-open-confirm-modal"
              >
                {isConfirming ? (
                  <span>Đang nhập dữ liệu...</span>
                ) : (
                  <>
                    <span>Xác nhận nhập dữ liệu</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title={isDryRun ? 'Xác nhận đối soát Dry-Run' : 'Xác nhận nhập giáo trình vào CSDL'}
        description={
          isDryRun
            ? `Bạn chuẩn bị thực hiện đối soát Dry-Run cho ${previewData?.summary?.totalItems || 0} thực thể (${entityCounts.subjects} môn học, ${entityCounts.chapters} chương, ${entityCounts.lessons} bài học, ${entityCounts.questions} câu hỏi). Quá trình này sẽ mô phỏng toàn diện và hoàn toàn không ghi dữ liệu vào CSDL.`
            : `Bạn chuẩn bị nhập ${previewData?.summary?.totalItems || 0} thực thể (${entityCounts.subjects} môn học, ${entityCounts.chapters} chương, ${entityCounts.lessons} bài học, ${entityCounts.questions} câu hỏi) vào hệ thống. Hành động này sẽ được ghi vết kiểm toán vĩnh viễn.`
        }
        confirmText={isConfirming ? 'Đang thực thi...' : isDryRun ? 'Xác nhận Dry-Run' : 'Xác nhận nhập'}
        cancelText="Đóng"
        isLoading={isConfirming}
        onConfirm={handleConfirmImport}
        onCancel={() => {
          if (!isConfirming) {
            setIsConfirmDialogOpen(false)
          }
        }}
      />
    </div>
  )
}
