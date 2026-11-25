# STUDY_AI — MA TRẬN HỢP ĐỒNG API FRONTEND & BACKEND (FE-BE CONTRACT MATRIX)

> **Ngày lập ma trận:** 2026-11-23  
> **Phiên bản:** 2.0 (Cập nhật chuẩn hóa theo inventory thực tế và phân tích call-sites)  
> **Nhánh:** `audit/fullstack-quality-plan-20261123`  
> **Pull Request:** [Draft PR #22](https://github.com/hthuyngan/STUDY_AI-/pull/22)  
> **Trạng thái Codex Review:** `REVIEW_BLOCKED_USAGE_LIMIT` (Yêu cầu review bị tạm dừng do tài khoản GitHub hết hạn mức sử dụng / usage limit; chưa có phê duyệt chính thức).  
> **Cơ sở đối chiếu Backend:** `docs/audit/endpoint_inventory.md` (236 endpoints, commit baseline `16593c049d5bf1e4b373eaef9ee2c2a0d7830cb3`).  
> **Cơ sở đối chiếu Frontend:** 166 lời gọi `apiClient` tĩnh và động được trích xuất từ toàn bộ mã nguồn `frontend/src` (ngoại trừ các tệp unit test).

---

## I. BẢNG PHÂN BỔ 236 ENDPOINTS THEO INVENTORY THỰC TẾ

Dưới đây là bảng phân bổ chính xác 236 endpoints theo từng Module và từng Controller được trích xuất trực tiếp từ `docs/audit/endpoint_inventory.md`:

| Module Backend | Số Controller | Danh sách Controllers và số Endpoint | Tổng Endpoint Backend | Số Endpoint được FE gọi trực tiếp | Trạng thái đồng bộ |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **Auth** | 1 | `Auth` (5) | **5** | 5 | **100% Khớp hoàn hảo** |
| **Admin** | 9 | `AdminUsers` (11), `AdminOperations` (8), `AdminTeachers` (6), `AdminAnnouncements` (4), `AiAdmin` (4), `AdminDashboard` (3), `AdminSettings` (2), `AdminAuditLogs` (1), `AdminSystem` (1) | **40** | 28 | **Đồng bộ cao** (Phần còn lại là batch/system ops) |
| **AI** | 1 | `AiChat` (9) | **9** | 8 | **Đồng bộ** |
| **Content** | 11 | `ContentQuestions` (16), `ContentLessons` (13), `ContentVideos` (10), `ContentAssessments` (7), `ContentChapters` (7), `ContentSubjects` (6), `ContentTopics` (6), `ContentGovernance` (5), `ContentCurriculumImport` (3), `ContentReview` (2), `CurriculumImport` (2) | **77** | 52 | **Có sai lệch 3 endpoints AI Governance** (`API-01`) |
| **Public** | 1 | `Health` (4) | **4** | 2 | **Đồng bộ** (Health checks) |
| **Student** | 9 | `StudentCurriculum` (13), `StudentPractice` (12), `StudentAssessmentAttempts` (10), `ExamPreparation` (8), `AdaptiveLearning` (7), `StudentProgress` (6), `LearningAnalytics` (5), `StudentEvents` (4), `StudentProfile` (4) | **69** | 46 | **Đồng bộ contract** (Có lỗ hổng logic chấm điểm `SEC-01`) |
| **Teacher** | 6 | `TeacherAnalytics` (9), `TeacherClassrooms` (7), `TeacherAssignments` (6), `TeacherStudents` (4), `TeacherSubmissions` (4), `TeacherGrading` (2) | **32** | 24 | **Đồng bộ** |
| **TỔNG CỘNG** | **38** | **38 Controllers** | **236** | **165** | **98.7% Contract Khớp (3 mismatches đã xác định)** |

---

## II. GIẢI THÍCH CHI TIẾT SỰ TƯƠNG QUAN VÀ SỐ LƯỢNG LỜI GỌI FRONTEND

Quá trình quét tự động bằng cú pháp AST và Regex trên toàn bộ thư mục `frontend/src` ghi nhận **166 vị trí gọi `apiClient`** (call-sites). Sự chênh lệch giữa 236 endpoints Backend và 166 lời gọi Frontend được giải thích minh bạch như sau:

1. **Cơ chế Route Aliases trên Backend (.NET 10):**
   Nhiều Controller được thiết kế sẵn 2 route alias cho cùng một action nghiệp vụ. Ví dụ:
   - `StudentAssessmentAttemptsController`: Đăng ký cả `GET api/v1/users/{userId}/assessment-attempts` (dành cho Admin/Teacher) và `GET api/v1/me/assessment-attempts` (dành cho chính học viên). Đây là 2 routes riêng biệt trên backend nhưng frontend chỉ gọi endpoint phù hợp với vai trò đang đăng nhập.
   - Các route alias tương tự tồn tại giữa `api/v1/practice/...` và `api/v1/student/practice/...`.
2. **Các Endpoint Quản trị Hệ thống, Vận hành và Batch:**
   Khoảng 50 endpoints trên Backend thuộc về:
   - Các tác vụ quản trị cấp thấp (`AdminOperations`): Đồng bộ chỉ mục tìm kiếm, dọn dẹp cache, kiểm tra toàn vẹn dữ liệu học tập định kỳ (Health / Consistency maintenance).
   - Nhập dữ liệu lớn qua tệp (`ContentCurriculumImport` / `CurriculumImport`): Một số action được chuẩn bị cho tiến trình batch background mà UI chưa gọi trực tiếp.
3. **Hiện tượng một Endpoint được gọi ở nhiều Call-sites:**
   Một số endpoint phổ biến được gọi ở nhiều service và component khác nhau. Ví dụ:
   - `GET /api/v1/content/questions` được gọi đồng thời tại `questionBankApi.ts` và `contentQuestionBank.service.ts`.
   - `POST /api/v1/practice/sessions` được gọi trong cả `practice.service.ts` và bài thi thử trong `examPrep.service.ts`.
4. **Phân tích 6 lời gọi Frontend chưa khớp Regex ban đầu:**
   - **3 lời gọi sai lệch Route thực sự (`API-01` - Đã xác minh):**
     1. `POST /api/v1/content/governance/quality-audit` (Backend là `/ai-audit`).
     2. `POST /api/v1/content/governance/lesson-authoring/outline` (Backend là `/ai-authoring/outline`).
     3. `POST /api/v1/content/governance/lesson-authoring/checkpoint-questions` (Backend là `/ai-authoring/questions`).
   - **3 lời gọi khớp hoàn toàn sau khi loại bỏ query string template:**
     4. `GET api/v1/admin/ai/usage-stats${queryString}` -> Khớp với `api/v1/admin/ai/usage-stats`.
     5. `GET api/v1/curriculum/subjects${qs}` -> Khớp với `api/v1/curriculum/subjects`.
     6. `GET api/v1/content/topics${qs}` -> Khớp với `api/v1/content/topics`.

---

## III. BẢNG ĐỐI CHIẾU CÁC ĐIỂM BẤT THƯỜNG VÀ KẾ HOẠCH KHẮC PHỤC

| STT | Mã Finding | Phân loại trạng thái | Endpoint Backend | Endpoint Frontend đang gọi | Tệp nguồn & Vị trí | Tác động FE–BE–SQL | Logic dự kiến sửa | Regression Test |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **API-01** | **VERIFIED** | `POST api/v1/content/governance/ai-audit` | `/api/v1/content/governance/quality-audit` | `teacherManagement.service.ts:54` | FE nhận 404 Not Found; BE có sẵn service; SQL không đổi. | Sửa FE trỏ về `/ai-audit`; thêm alias trên `ContentGovernanceController`. | Vitest kiểm tra gọi đúng route; test BE phản hồi 200. |
| 2 | **API-01** | **VERIFIED** | `POST api/v1/content/governance/ai-authoring/outline` | `/api/v1/content/governance/lesson-authoring/outline` | `teacherManagement.service.ts:72` | FE nhận 404 Not Found; AI soạn giáo án bị tê liệt. | Sửa FE trỏ về `/ai-authoring/outline`; thêm alias trên BE. | Vitest kiểm tra draft outline sinh thành công. |
| 3 | **API-01** | **VERIFIED** | `POST api/v1/content/governance/ai-authoring/questions` | `/api/v1/content/governance/lesson-authoring/checkpoint-questions` | `teacherManagement.service.ts:81` | FE nhận 404 Not Found; sinh câu hỏi chốt bài bị lỗi. | Sửa FE trỏ về `/ai-authoring/questions`; thêm alias trên BE. | Vitest kiểm tra checkpoint questions sinh thành công. |
| 4 | **SEC-01** | **VERIFIED** | `PATCH /api/v1/users/{userId}/assessment-attempts/{id}` | Nhận `scoreRaw`, `scoreScaled`, `isCorrect` từ client | `StudentAssessmentService.cs:159-196` | Lỗ hổng gian lận điểm; học sinh tự gửi điểm 10 vào DB. | Server tự so khớp đáp án theo loại câu hỏi, tự tính điểm. | Test giả lập gửi điểm 10 với đáp án sai -> server lưu 0 điểm. |
| 5 | **DATA-01** | **VERIFIED** | `POST /api/v1/assignments/{id}/submissions/{subId}/grade` | Chấm bài tự do gây suy đoán môn học và tự INSERT môn | `TeacherSubmissionsService.cs:280-355` | Ô nhiễm `StudentTopicMastery` và phát sinh `ContentSubject` rác. | Bỏ đoán chuỗi; lấy subject từ classroom; xóa lệnh `_db.Add(subject)`. | Test chấm bài với tiêu đề "Kiểm tra 15p" không chèn môn mới. |
| 6 | **MOCK-01** | **VERIFIED** | `DELETE /api/v1/classrooms/{id}`, `DELETE /api/v1/assignments/{id}` | Xóa thành công trên server rồi gọi `loadFromStorage` | `classroom.service.ts:742, 1093` | Giao diện hiện thông báo lỗi đỏ giả sau khi xóa thành công. | Xóa bỏ lệnh gọi `loadFromStorage` trong nhánh authenticated. | Vitest mô phỏng có token, xóa không ném ngoại lệ. |

---

## IV. MA TRẬN ĐỐI CHIẾU THEO TỪNG NHÓM CHỨC NĂNG CHÍNH

### 1. Phân hệ Xác thực (Auth Module — 5 Endpoints)
- `POST /api/v1/auth/register` (Controller: `Auth`, Action: `Register`) -> `auth/auth.service.ts` (**VERIFIED - Khớp 100%**)
- `POST /api/v1/auth/login` (Controller: `Auth`, Action: `Login`) -> `auth/auth.service.ts` (**VERIFIED - Khớp 100%**)
- `POST /api/v1/auth/refresh` (Controller: `Auth`, Action: `RefreshToken`) -> `auth/auth.service.ts` (**VERIFIED - Khớp 100%**)
- `POST /api/v1/auth/logout` (Controller: `Auth`, Action: `Logout`) -> `auth/auth.service.ts` (**VERIFIED - Khớp 100%**)
- `GET /api/v1/auth/me` (Controller: `Auth`, Action: `GetCurrentUser`) -> `auth/auth.service.ts` (**VERIFIED - Khớp 100%**)

### 2. Phân hệ Quản trị & Vận hành (Admin Module — 40 Endpoints)
- Quản lý người dùng (`AdminUsers`: 11 endpoints): `GET/POST /api/v1/admin/users`, `GET/PUT/DELETE /api/v1/admin/users/{userId}`, role/status updates -> `services/admin.service.ts` (**VERIFIED** - Lưu ý `SEC-02` đã lên kế hoạch bảo vệ).
- Quản lý giáo viên (`AdminTeachers`: 6 endpoints): `GET/POST /api/v1/admin/teachers`, `GET/PUT /api/v1/admin/teachers/{id}`, status/class assign -> `services/admin.service.ts` (**VERIFIED**).
- Thông báo hệ thống (`AdminAnnouncements`: 4 endpoints): `GET/POST /api/v1/admin/announcements`, `PUT/DELETE /api/v1/admin/announcements/{id}` -> `services/operations.service.ts` (**VERIFIED** - Lưu ý `MOCK-02` loại bỏ nuốt lỗi).
- Cấu hình vận hành (`AdminSettings`: 2 endpoints): `GET/PUT /api/v1/admin/settings` -> `services/operations.service.ts` (**VERIFIED**).
- Nhật ký kiểm toán (`AdminAuditLogs`: 1 endpoint): `GET /api/v1/admin/audit-logs` -> `services/operations.service.ts` (**VERIFIED**).
- Thống kê Dashboard (`AdminDashboard`: 3 endpoints): `GET /api/v1/admin/dashboard` và sub-kpis -> `services/admin.service.ts` (**VERIFIED**).
- Giám sát AI (`AiAdmin`: 4 endpoints): `GET /api/v1/admin/ai/usage-stats`, quality evaluations, cost optimization -> `services/aiTutor.service.ts` (**VERIFIED**).

### 3. Phân hệ Nội dung & Học liệu (Content Module — 77 Endpoints)
- Ngân hàng câu hỏi (`ContentQuestions`: 16 endpoints): CRUD câu hỏi, import, restore, statistics, review transitions -> `questionBankApi.ts` & `contentQuestionBank.service.ts` (**VERIFIED**).
- Quản lý bài học (`ContentLessons`: 13 endpoints): CRUD bài học, reorder, submit-review, approve, publish, unpublish, rollback -> `education.service.ts` & `operations.service.ts` (**VERIFIED**).
- Video bài học (`ContentVideos`: 10 endpoints): CRUD video bài giảng, publish/unpublish video -> `education.service.ts` (**VERIFIED**).
- Chương & Môn học (`ContentChapters`: 7, `ContentSubjects`: 6, `ContentTopics`: 6): Danh mục GDPT 2018 -> `education.service.ts` & `curriculum.service.ts` (**VERIFIED**).
- Kiểm duyệt & Xuất bản (`ContentReview`: 2 endpoints): `GET /api/v1/content/approvals`, `GET /api/v1/content/publications` -> `operations.service.ts` (**VERIFIED**).
- Quản trị AI (`ContentGovernance`: 5 endpoints): AI audit, outline drafting, question generation, flagging -> `teacherManagement.service.ts` (**VERIFIED** - Sửa 3 đường dẫn `API-01`).

### 4. Phân hệ Học sinh & Luyện tập (Student Module — 69 Endpoints)
- Phiên luyện tập (`StudentPractice`: 12 endpoints): `POST /api/v1/practice/sessions`, `GET .../result`, `POST .../answer`, `POST .../check-question`, `POST .../submit`, `GET .../dashboard-stats`, `GET .../mistakes` -> `practice.service.ts`, `supporting.service.ts`, `smartReview.service.ts` (**VERIFIED**).
- Phiên làm bài đánh giá (`StudentAssessmentAttempts`: 10 endpoints): `GET/POST/PUT/PATCH /api/v1/users/{userId}/assessment-attempts` và `/api/v1/me/assessment-attempts` -> `assessmentAttempt.repository.ts` (**VERIFIED** - Kế hoạch `SEC-01` chuyển tính điểm về server).
- Đồng bộ & Dấu trang (`StudentProfile`: 4 endpoints): `POST /api/v1/me/sync/bootstrap`, `GET/POST/DELETE /api/v1/me/bookmarks` -> `bootstrapSync.ts`, `sectionBookmarks.service.ts` (**VERIFIED**).
- Học tập thích ứng & Ôn thi (`AdaptiveLearning`: 7, `ExamPreparation`: 8, `LearningAnalytics`: 5, `StudentProgress`: 6): -> `personalization.service.ts`, `examPrep.service.ts`, `learningAnalytics.service.ts` (**VERIFIED**).

### 5. Phân hệ Giáo viên & Lớp học (Teacher Module — 32 Endpoints)
- Lớp học (`TeacherClassrooms`: 7 endpoints): CRUD lớp học, danh sách học sinh, hoạt động lớp học -> `classroom.service.ts` (**VERIFIED** - Sửa lỗi `MOCK-01`).
- Bài tập & Nộp bài (`TeacherAssignments`: 6, `TeacherSubmissions`: 4, `TeacherGrading`: 2): Giao bài tập, nộp bài, chấm điểm và phản hồi -> `classroom.service.ts` (**VERIFIED** - Sửa side-effect `DATA-01`).
- Cảnh báo & Phân tích lớp học (`TeacherAnalytics`: 9 endpoints): `GET/PUT /api/v1/teacher/alerts`, resolve all, classroom analytics -> `classroom.service.ts` & `teacherManagement.service.ts` (**VERIFIED**).

---

## V. KẾT LUẬN VÀ BƯỚC ĐI TIẾP THEO

- Toàn bộ 236 endpoints Backend đã được lập danh mục và định vị chính xác vị trí trong mã nguồn.
- Mọi điểm sai lệch contract (`API-01`), lỗ hổng chấm điểm (`SEC-01`), side-effect dữ liệu (`DATA-01`) và lỗi ném exception ảo (`MOCK-01`) đều đã có giải pháp kỹ thuật cụ thể và regression test đi kèm.
- **Tuân thủ quy tắc an toàn:** Chưa tiến hành bất kỳ chỉnh sửa nào trên mã nguồn ứng dụng hoặc cơ sở dữ liệu. Ba tài liệu hoàn thiện được đẩy lên PR #22 để người dùng nghiệm thu lần cuối.
