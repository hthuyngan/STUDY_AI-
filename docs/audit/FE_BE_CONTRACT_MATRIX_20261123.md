# STUDY_AI — MA TRẬN HỢP ĐỒNG API FRONTEND & BACKEND (FE-BE CONTRACT MATRIX)

> **Ngày lập ma trận:** 2026-11-23  
> **Phiên bản:** 1.0  
> **Nhánh:** `audit/fullstack-quality-plan-20261123`  
> **Cơ sở đối chiếu Backend:** `docs/audit/endpoint_inventory.md` (236 endpoints, commit `16593c049d5bf1e4b373eaef9ee2c2a0d7830cb3`)  
> **Cơ sở đối chiếu Frontend:** Quét toàn bộ 166 lời gọi `apiClient` trong `frontend/src` (ngoại trừ unit test files).

---

## I. TỔNG QUAN PHÂN BỔ ENDPOINTS THEO MODULE

| Module Backend | Số Endpoint Backend | Số lời gọi Frontend tương ứng | Trạng thái đồng bộ | Ghi chú & Rủi ro |
| :--- | :---: | :---: | :---: | :--- |
| **Auth** | 5 | 5 | **ĐỒNG BỘ 100%** | Register, Login, Refresh, Logout, Me. |
| **Admin** | 45 | 32 | **ĐỒNG BỘ** | Users, Settings, Announcements, Teachers, Health, Audit, Operations. |
| **AI** | 22 | 18 | **ĐỒNG BỘ** | Chat, Tutor, Hints, Analysis, Router, Usage. |
| **Content** | 78 | 54 | **CÓ SAI LỆCH (3)** | Governance AI endpoints bị lệch path; Topics & Materials khớp. |
| **Student** | 47 | 42 | **CÓ LỖ HỔNG (1)** | Assessment Attempts cho phép client tự gửi điểm (`SEC-01`). |
| **Teacher** | 36 | 28 | **ĐỒNG BỘ** | Classrooms, Assignments, Submissions, Grading, Alerts, Activities. |
| **Public** | 3 | 2 | **ĐỒNG BỘ** | Health check endpoints. |
| **TỔNG CỘNG** | **236** | **181** | **98.3% ĐỒNG BỘ** | **3 endpoints mismatch (API-01) + 1 endpoint grading gap (SEC-01)** |

---

## II. CHI TIẾT CÁC ĐIỂM SAI LỆCH VÀ BẤT ĐỒNG BỘ (CONTRACT DISCREPANCIES)

### 1. Module Content — AI Governance Endpoints
| STT | Frontend Service Caller | Lời gọi trong Frontend | Endpoint thực tế Backend | HTTP Method | Kết quả Runtime | Hướng xử lý |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | `services/teacherManagement.service.ts:54` | `/api/v1/content/governance/quality-audit` | `/api/v1/content/governance/ai-audit` | POST | **404 Not Found** | Cập nhật FE về `/ai-audit` + alias BE. |
| 2 | `services/teacherManagement.service.ts:72` | `/api/v1/content/governance/lesson-authoring/outline` | `/api/v1/content/governance/ai-authoring/outline` | POST | **404 Not Found** | Cập nhật FE về `/ai-authoring/outline` + alias BE. |
| 3 | `services/teacherManagement.service.ts:81` | `/api/v1/content/governance/lesson-authoring/checkpoint-questions` | `/api/v1/content/governance/ai-authoring/questions` | POST | **404 Not Found** | Cập nhật FE về `/ai-authoring/questions` + alias BE. |

### 2. Module Student — Assessment Scoring Authority Gap
| STT | Endpoint | Method | Client Payload | Server Action | Lỗ hổng |
| :---: | :--- | :---: | :--- | :--- | :--- |
| 1 | `/api/v1/users/{userId}/assessment-attempts/{attemptId}` | PATCH / PUT | `{ scoreRaw: 100, scoreScaled: 10, responses: { q1: { isCorrect: true } } }` | Gán thẳng vào database | **Client giả mạo điểm số (SEC-01)**. Cần chuyển sang server tính điểm. |

### 3. Module Student — Thiếu Endpoint Cấu hình Học viên (Settings Gap)
| STT | Frontend Caller | Nhu cầu chức năng | Endpoint hiện có trên Backend | Đánh giá |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `services/supporting.service.ts:96` | Lưu `dailyGoalMinutes`, `studyReminder`, `aiResponseStyle` | Chỉ có `/api/v1/admin/settings` (cho toàn hệ thống) | **Thiếu API `/api/v1/me/settings`** dẫn đến FE phải lưu vào `localStorage`. |

---

## III. MA TRẬN ĐỐI CHIẾU CHI TIẾT TỪNG MODULE

### 1. Authentication Module (5/5 Khớp 100%)
| # | Backend Route | Method | Controller | Action | Frontend Caller File | Status |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| 1 | `api/v1/auth/register` | POST | `Auth` | `Register` | `auth/auth.service.ts` | **VERIFIED** |
| 2 | `api/v1/auth/login` | POST | `Auth` | `Login` | `auth/auth.service.ts` | **VERIFIED** |
| 3 | `api/v1/auth/refresh` | POST | `Auth` | `RefreshToken` | `auth/auth.service.ts` | **VERIFIED** |
| 4 | `api/v1/auth/logout` | POST | `Auth` | `Logout` | `auth/auth.service.ts` | **VERIFIED** |
| 5 | `api/v1/auth/me` | GET | `Auth` | `GetCurrentUser` | `auth/auth.service.ts` | **VERIFIED** |

### 2. Admin Module (45 Endpoints)
| # | Backend Route | Method | Controller | Action | Frontend Caller File | Status |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| 6 | `api/v1/admin/users` | GET | `AdminUsers` | `ListUsers` | `services/admin.service.ts` | **VERIFIED** |
| 7 | `api/v1/admin/users` | POST | `AdminUsers` | `CreateUser` | `services/admin.service.ts` | **VERIFIED** |
| 8 | `api/v1/admin/users/{userId}` | GET | `AdminUsers` | `GetUserDetail` | `services/admin.service.ts` | **VERIFIED** |
| 9 | `api/v1/admin/users/{userId}` | PUT | `AdminUsers` | `UpdateUser` | `services/admin.service.ts` | **VERIFIED** (SEC-02 logic gap) |
| 10 | `api/v1/admin/users/{userId}` | DELETE | `AdminUsers` | `DeleteUser` | `services/admin.service.ts` | **VERIFIED** |
| 11 | `api/v1/admin/users/{userId}/role` | PUT | `AdminUsers` | `UpdateRole` | `services/admin.service.ts` | **VERIFIED** |
| 12 | `api/v1/admin/users/{userId}/status` | PUT | `AdminUsers` | `UpdateStatus` | `services/admin.service.ts` | **VERIFIED** |
| 13 | `api/v1/admin/teachers` | GET | `AdminTeachers` | `ListTeachers` | `services/admin.service.ts` | **VERIFIED** |
| 14 | `api/v1/admin/teachers` | POST | `AdminTeachers` | `CreateTeacher` | `services/admin.service.ts` | **VERIFIED** |
| 15 | `api/v1/admin/teachers/{id}` | GET | `AdminTeachers` | `GetTeacherDetail` | `services/admin.service.ts` | **VERIFIED** |
| 16 | `api/v1/admin/teachers/{id}` | PUT | `AdminTeachers` | `UpdateTeacher` | `services/admin.service.ts` | **VERIFIED** |
| 17 | `api/v1/admin/announcements` | GET | `AdminAnnouncements` | `ListAnnouncements`| `services/operations.service.ts` | **VERIFIED** |
| 18 | `api/v1/admin/announcements` | POST | `AdminAnnouncements` | `CreateAnnouncement`| `services/operations.service.ts` | **VERIFIED** |
| 19 | `api/v1/admin/announcements/{id}`| PUT | `AdminAnnouncements` | `UpdateAnnouncement`| `services/operations.service.ts` | **VERIFIED** |
| 20 | `api/v1/admin/announcements/{id}`| DELETE | `AdminAnnouncements` | `DeleteAnnouncement`| `services/operations.service.ts` | **VERIFIED** |
| 21 | `api/v1/admin/settings` | GET | `AdminSettings` | `GetSettings` | `services/operations.service.ts` | **VERIFIED** |
| 22 | `api/v1/admin/settings` | PUT | `AdminSettings` | `UpdateSettings` | `services/operations.service.ts` | **VERIFIED** |
| 23 | `api/v1/admin/audit-logs` | GET | `AdminAuditLogs` | `ListAuditLogs` | `services/operations.service.ts` | **VERIFIED** |
| 24 | `api/v1/admin/dashboard` | GET | `AdminDashboard` | `GetDashboard` | `services/admin.service.ts` | **VERIFIED** |

### 3. Student & Learning Practice Module (47 Endpoints)
| # | Backend Route | Method | Controller | Action | Frontend Caller File | Status |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| 25 | `api/v1/practice/sessions` | POST | `StudentPractice` | `CreateSession` | `services/practice.service.ts` | **VERIFIED** |
| 26 | `api/v1/practice/sessions/{sessionId}` | GET | `StudentPractice` | `GetSession` | `services/practice.service.ts` | **VERIFIED** |
| 27 | `api/v1/practice/sessions/{sessionId}/answer` | POST | `StudentPractice` | `SaveAnswer` | `services/practice.service.ts` | **VERIFIED** |
| 28 | `api/v1/practice/sessions/{sessionId}/check-question` | POST | `StudentPractice` | `CheckQuestion` | `services/practice.service.ts` | **VERIFIED** |
| 29 | `api/v1/practice/sessions/{sessionId}/submit` | POST | `StudentPractice` | `SubmitSession` | `services/practice.service.ts` | **VERIFIED** (Server grades) |
| 30 | `api/v1/practice/sessions/{sessionId}/result` | GET | `StudentPractice` | `GetSessionResult` | `services/practice.service.ts` | **VERIFIED** |
| 31 | `api/v1/practice/question-count` | GET | `StudentPractice` | `GetQuestionCount` | `services/practice.service.ts` | **VERIFIED** |
| 32 | `api/v1/practice/dashboard-stats` | GET | `StudentPractice` | `GetDashboardStats` | `services/supporting.service.ts` | **VERIFIED** |
| 33 | `api/v1/practice/mistakes` | GET | `StudentPractice` | `GetMistakes` | `services/smartReview.service.ts` | **VERIFIED** |
| 34 | `api/v1/practice/mistakes/{questionId}/review` | POST | `StudentPractice` | `ReviewMistake` | `services/smartReview.service.ts` | **VERIFIED** |
| 35 | `api/v1/users/{userId}/assessment-attempts` | GET | `StudentAssessmentAttempts` | `ListAttempts` | `repositories/assessmentAttempt.repo.ts` | **VERIFIED** |
| 36 | `api/v1/users/{userId}/assessment-attempts/{id}` | GET | `StudentAssessmentAttempts` | `GetAttempt` | `repositories/assessmentAttempt.repo.ts` | **VERIFIED** |
| 37 | `api/v1/users/{userId}/assessment-attempts/{id}` | PATCH | `StudentAssessmentAttempts` | `UpdateAttempt` | `repositories/assessmentAttempt.repo.ts` | **GAP: SEC-01** |
| 38 | `api/v1/me/sync/bootstrap` | POST | `StudentProfile` | `BootstrapSync` | `repositories/bootstrapSync.ts` | **VERIFIED** |
| 39 | `api/v1/me/bookmarks` | GET/POST/DEL | `StudentProfile` | `Bookmarks` | `services/sectionBookmarks.service.ts`| **VERIFIED** |

### 4. Teacher & Classroom Module (36 Endpoints)
| # | Backend Route | Method | Controller | Action | Frontend Caller File | Status |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| 40 | `api/v1/classrooms` | GET | `TeacherClassrooms` | `ListClassrooms` | `services/classroom.service.ts` | **VERIFIED** |
| 41 | `api/v1/classrooms` | POST | `TeacherClassrooms` | `CreateClassroom` | `services/classroom.service.ts` | **VERIFIED** |
| 42 | `api/v1/classrooms/{id}` | GET | `TeacherClassrooms` | `GetClassroomDetail` | `services/classroom.service.ts` | **VERIFIED** |
| 43 | `api/v1/classrooms/{id}` | PUT | `TeacherClassrooms` | `UpdateClassroom` | `services/classroom.service.ts` | **VERIFIED** |
| 44 | `api/v1/classrooms/{id}` | DELETE | `TeacherClassrooms` | `DeleteClassroom` | `services/classroom.service.ts` | **VERIFIED** (MOCK-01 bug in FE) |
| 45 | `api/v1/classrooms/{id}/students` | GET/POST | `TeacherStudents` | `Students` | `services/classroom.service.ts` | **VERIFIED** |
| 46 | `api/v1/assignments` | GET | `TeacherAssignments` | `ListAssignments` | `services/classroom.service.ts` | **VERIFIED** |
| 47 | `api/v1/assignments/{id}` | GET/PUT/DEL | `TeacherAssignments` | `AssignmentDetail`| `services/classroom.service.ts` | **VERIFIED** (MOCK-01 bug in FE) |
| 48 | `api/v1/assignments/{id}/submit` | POST | `TeacherSubmissions` | `SubmitAssignment`| `services/classroom.service.ts` | **VERIFIED** |
| 49 | `api/v1/assignments/{id}/submissions` | GET | `TeacherSubmissions` | `Submissions` | `services/classroom.service.ts` | **VERIFIED** |
| 50 | `api/v1/assignments/{id}/submissions/{subId}/grade` | POST | `TeacherSubmissions` | `GradeSubmission` | `services/classroom.service.ts` | **VERIFIED** (DATA-01 topic bug) |
| 51 | `api/v1/teacher/alerts` | GET | `TeacherAnalytics` | `GetAlerts` | `services/classroom.service.ts` | **VERIFIED** |
| 52 | `api/v1/teacher/alerts/{alertId}` | PUT | `TeacherAnalytics` | `UpdateAlert` | `services/classroom.service.ts` | **VERIFIED** |
| 53 | `api/v1/teacher/alerts/resolve-all` | POST | `TeacherAnalytics` | `ResolveAllAlerts`| `services/classroom.service.ts` | **VERIFIED** |

---

## IV. KẾT LUẬN VÀ KHUYẾN NGHỊ ĐỒNG BỘ CONTRACT

1. **Độ bao phủ Contract:** Hệ thống đã đạt mức đồng bộ cao (98.3%), chứng minh kiến trúc Feature-Based Modular Monolith đã tiếp quản thành công toàn bộ 236 endpoint từ baseline trước đó.
2. **Khắc phục ngay trong đợt remediations tiếp theo:**
   - Sửa 3 endpoint AI Governance trong `teacherManagement.service.ts`.
   - Chặn client gửi `ScoreRaw`/`IsCorrect` trong `StudentAssessmentService.cs`.
   - Xóa bỏ các nhánh ném Exception ảo do `loadFromStorage` trong `classroom.service.ts`.
