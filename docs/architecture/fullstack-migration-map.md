# STUDY_AI — FULL-STACK MIGRATION & FEATURE INVENTORY MAP
## Bảng Kiểm Kê & Lộ Trình Chuyển Đổi Full-Stack Hệ Thống STUDY_AI

Tài liệu này kiểm kê chi tiết toàn bộ các module chức năng hiện có của dự án STUDY_AI trên cả hai tầng Frontend và Backend, phân loại mức độ hoàn thiện kiến trúc từ Nhóm A đến Nhóm E nhằm đảm bảo tính trung thực kỹ thuật, không tự nhận hoàn thành khi chưa có API và Database thực tế.

---

## 1. ĐỊNH NGHĨA PHÂN LOẠI MỨC ĐỘ TÍCH HỢP (CLASSIFICATION SYSTEM)

| Nhóm | Tên Phân Loại | Tiêu Chuẩn Kỹ Thuật |
| :---: | :--- | :--- |
| **A** | **Full-stack Production** | Đã có đầy đủ UI thật, Application Service, REST API backend, SQLAlchemy Model, Alembic Migration, Database persistence và tests. |
| **B** | **Offline-First with API Sync** | UI thật, Offline-first LocalStorage bền vững, đã có REST API Backend và DB Model đồng bộ hai chiều khi online. |
| **C** | **Client-Side Complete** | UI thật, Domain Calculation Engine và LocalStorage bền vững 100%, chưa kết nối REST API hoặc chưa có bảng DB backend. |
| **D** | **Prototype / Mock UI** | Giao diện đã dựng (Pages, Modals, Drawers) nhưng dữ liệu dựa trên file `.mock.ts` hoặc bộ nhớ in-memory, chưa có API và DB backend thật. |
| **E** | **Planned / Not Implemented** | Chưa có cả giao diện Frontend lẫn API/DB Backend. |

---

## 2. BẢNG KIỂM KÊ 10 CỘT TOÀN BỘ CHỨC NĂNG HỆ THỐNG

| STT | Chức Năng | Frontend Component / Page | Trạng Thái FE | FE Persistence | Backend API Endpoint | Backend Model / Table | Nhóm | Khoảng Trống Kỹ Thuật (Technical Gap) | Kế Hoạch Giải Quyết |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- | :---: | :--- | :--- |
| **1** | **Xác thực Đăng ký & Đăng nhập** | `LoginPage`, `RegisterPage`, `useAuth` | Hoàn chỉnh | Memory Token + HttpOnly Cookie | `POST /api/v1/auth/login`, `POST /api/v1/auth/register` | `User` (`users`) | **A** | Cần bổ sung rate-limiting chống brute-force và xác thực email | Phase 15 |
| **2** | **Làm mới Token & Đăng xuất** | `apiClient`, `authSession.ts` | Hoàn chỉnh | HttpOnly Cookie `refresh_token` | `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` | `User` (`refresh_token` hash) | **A** | Cần cơ chế revoke toàn bộ thiết bị (session blacklist) | Phase 15 |
| **3** | **Thông tin Tài khoản & Phân quyền** | `ProtectedRoute`, `WorkspaceShell` | Hoàn chỉnh | Memory + API Cache | `GET /api/v1/me` | `User` (`role`, `status`) | **A** | Hoàn tất bảo vệ tài khoản admin cuối cùng | Đã xong (Phase 14) |
| **4** | **Kiểm tra Sức khỏe Hệ thống** | Network Monitor / Status Banner | Hoàn chỉnh | Không lưu | `GET /health`, `GET /health/db`, `GET /api/v1/health` | `SELECT 1` probe | **A** | Đã có probe 503 khi DB down, chưa có metrics Prometheus | Phase 19 |
| **5** | **Tiến độ Học bài (Lesson Progress)** | `LessonPage`, `useLearnerSync` | Hoàn chỉnh | LocalStorage + API Sync | `GET/PUT /api/v1/progress/lessons/{id}` | `LessonProgress` (`lesson_progress`) | **B** | Cần giải quyết conflict resolution khi offline dài ngày | Phase 15 |
| **6** | **Lưu kết quả Luyện tập (Attempts)** | `PracticeResultView`, `PracticePage` | Hoàn chỉnh | LocalStorage + API Sync | `POST /api/v1/attempts` | `AssessmentAttempt` (`assessment_attempts`) | **B** | Backend đang lưu raw JSON result, chưa phân tách từng item | Phase 16 |
| **7** | **Nhật ký Sự kiện Học tập (Events)** | `learningContextService`, `useAITutor` | Hoàn chỉnh | LocalStorage + API Sync | `POST /api/v1/events` | `LearningEvent` (`learning_events`) | **B** | Đã đồng bộ batch events, cần streaming analytics worker | Phase 18 |
| **8** | **Ngân hàng Câu hỏi GDPT 2018** | `QuestionBankPage`, `QuestionItemView` | Hoàn chỉnh | In-Memory Repository | `GET /api/v1/content/questions` (inline) | `ContentQuestion` (`content_questions`) | **C** | FE dùng 20 câu approved + 2 câu needs_review trong TS, chưa kéo từ DB | Phase 17 |
| **9** | **Phân tích Năng lực & Lỗ hổng** | `LearningAnalyticsPage`, `PersonalizedAnalyticsView` | Hoàn chỉnh | LocalStorage (`study_ai_practice_results_v1`) | Chưa có endpoint riêng | Chưa có bảng aggregated analytics | **C** | Đang tính toán trực tiếp từ `PracticeResult` ở FE | Phase 18 (Analytics API) |
| **10** | **Lộ trình Học Cá nhân hóa** | `AdaptiveLearningPathView` | Hoàn chỉnh | LocalStorage | Chưa có endpoint riêng | Chưa có bảng learning path | **C** | FE tự sinh lộ trình qua pure rule-based recommendation | Phase 18 |
| **11** | **Ôn tập Thông minh (Smart Review)** | `SmartReviewPage` | Hoàn chỉnh | LocalStorage | Chưa có endpoint riêng | Chưa có bảng review schedule | **C** | Spaced repetition đang chạy cục bộ ở client | Phase 18 |
| **12** | **Ghi chú Học tập & Bookmark** | `MyNotesPage`, `NotebookShell` | Hoàn chỉnh | LocalStorage | Chưa có endpoint riêng | Chưa có bảng user notes | **C** | Cần bảng `user_notes` và `user_bookmarks` trên DB | Phase 15 |
| **13** | **Quản lý Tài khoản Staff & Users** | `AdminUsersPage`, `AdminTeachersPage` | Hoàn chỉnh (UI V2/V4) | LocalStorage / Mock | `GET/POST /api/v1/admin/users` | `User` (`users`) | **B** (một phần) | Backend có API cơ bản, UI V2 dùng Mock/Local state; cần E2E full-stack | Phase 16 |
| **14** | **Quản lý Lớp học (Classes)** | `AdminClassesPage`, `AdminClassDetailPage` | Hoàn chỉnh (UI V4) | `classes.mock.ts` | Chưa có router `/classes` | Chưa có bảng `classes`, `class_members` | **D** | Toàn bộ dữ liệu lớp học hiện là Mock ở client | Phase 16 |
| **15** | **Quản lý Học viên & Chuyển lớp** | `AdminStudentsPage` | Hoàn chỉnh (UI V4) | `students.mock.ts` | Chưa có router `/students` | Chưa có bảng `class_students` | **D** | Dữ liệu học viên trong lớp là Mock | Phase 16 |
| **16** | **Giao bài & Chấm điểm (Assignments)** | `AdminAssignmentsPage`, `AdminGradingPage` | Hoàn chỉnh (UI V4) | `assignments.mock.ts`, `submissions.mock.ts` | Chưa có router `/assignments` | Chưa có bảng `assignments`, `submissions` | **D** | Giao diện nộp bài của giáo viên dựa trên Mock | Phase 16 |
| **17** | **Cảnh báo Học tập (Learning Alerts)** | `AdminAlertsPage` | Hoàn chỉnh (UI V4) | `learningAlerts.mock.ts` | Chưa có router `/alerts` | Chưa có bảng `learning_alerts` | **D** | Cảnh báo học sinh nguy cơ dựa trên Mock | Phase 16 |
| **18** | **Phê duyệt Nội dung (Approvals)** | `AdminApprovalsPage`, `AdminApprovalDetailPage` | Hoàn chỉnh (UI V5) | `contentApprovals.mock.ts` | `GET /api/v1/content/lessons` | `ContentLesson` (`status='draft'`) | **B** (một phần) | API bài học đã có; quy trình review đa cấp chưa nối DB | Phase 17 |
| **19** | **Hỗ trợ Người dùng (Tickets)** | `SupportWorkspace`, `AdminTicketsPage` | Hoàn chỉnh (UI V5) | `tickets.mock.ts` | Chưa có router `/tickets` | Chưa có bảng `support_tickets` | **D** | Luồng nhắn tin hỗ trợ và nội bộ là Mock | Phase 16 |
| **20** | **Thông báo Hệ thống (Announcements)** | `AdminAnnouncementsPage` | Hoàn chỉnh (UI V5) | `announcements.mock.ts` | Chưa có router `/announcements` | Chưa có bảng `announcements` | **D** | Quản lý thông báo trường học là Mock | Phase 16 |
| **21** | **Thiết lập Vận hành (Settings)** | `AdminSettingsPage` | Hoàn chỉnh (UI V5) | `systemSettings.mock.ts` | Chưa có router `/settings` | Chưa có bảng `system_settings` | **D** | Ngưỡng điểm và cấu hình hệ thống lưu Mock | Phase 16 |
| **22** | **Nhật ký Kiểm toán (Audit Logs)** | `AdminAuditLogsPage` | Hoàn chỉnh (UI V5) | `auditLogs.mock.ts` | `GET /api/v1/admin/audit-logs` | `StaffAuditLog` (`staff_audit_logs`) | **A** (Backend có) | Backend đã ghi vết kiểm toán qua `StaffAuditLog`, FE chưa nối | Phase 16 |
| **23** | **Pipeline Nhập liệu Đề thi (Import)** | Chưa có UI hoàn chỉnh | Dự thảo | Không lưu | Chưa có router `/import` | Đã có Domain Schemas (Phase 14) | **E** | Schemas đã sẵn sàng trong `content.py`, chưa có Worker | Phase 17 |
| **24** | **Phân tích Dân số Lớn (Big Data)** | Chưa có UI | Dự kiến | Không lưu | Chưa có | Chưa có | **E** | Cần Data Warehouse hoặc ClickHouse khi có hàng triệu kết quả | Phase 19+ |

---

## 3. TỔNG KẾT TỶ LỆ HOÀN THIỆN TOÀN HỆ THỐNG

- **Nhóm A (Full-stack hoàn chỉnh)**: 4 / 24 chức năng (~16.7%) — Xác thực người dùng, Làm mới token, Profile/RBAC, Health Probes & Audit Backend.
- **Nhóm B (Offline-first có API Sync)**: 4 / 24 chức năng (~16.7%) — Tiến độ bài học, Lượt thi trắc nghiệm, Sự kiện học tập, Quản lý nội dung bài học cơ bản.
- **Nhóm C (Frontend Complete, LocalStorage bền vững)**: 5 / 24 chức năng (~20.8%) — Ngân hàng câu hỏi, Phân tích năng lực bằng chứng, Lộ trình thích ứng, Ôn tập ngắt quãng, Ghi chú học tập.
- **Nhóm D (Prototype UI, dữ liệu Mock)**: 9 / 24 chức năng (~37.5%) — Toàn bộ các phân hệ quản lý trường học (Classes, Students, Assignments, Alerts, Tickets, Announcements, Settings, v.v.).
- **Nhóm E (Kế hoạch tương lai)**: 2 / 24 chức năng (~8.3%) — Import Pipeline đề thi thông minh, Big Data Analytics.

> [!IMPORTANT]
> **Cam kết trung thực**: STUDY_AI tuyệt đối không quảng cáo các tính năng Nhóm C và D là "đã chạy trên cloud server". Người dùng được thông báo rõ ràng về tính chất lưu trữ cục bộ (offline-first) hoặc chế độ demo quản trị cho đến khi Phase 15 và 16 hoàn thành.
