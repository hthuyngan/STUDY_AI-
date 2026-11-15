# BÁO CÁO TINH GỌN HỆ THỐNG VÀ BẢO VỆ DỮ LIỆU STUDY_AI
**Tài liệu:** `ai-collaboration/STUDY_AI-FEATURE-SIMPLIFICATION-REPORT.md`  
**Dự án:** STUDY_AI  
**Mục tiêu:** Tinh gọn STUDY_AI thành nền tảng học tập AI tập trung, bảo vệ dữ liệu GDPT 2018, siết chặt bảo mật Practice & Exam, gom cụm chức năng và tái cấu trúc navigation.  
**Branch thực hiện:** `feature/frontend-css-architecture`  
**Ngày thực hiện:** 15/11/2026  

---

## 1. TỔNG QUAN 8 MODULE CỐT LÕI ĐƯỢC GIỮ LẠI

| STT | Module cốt lõi | Route chính | Vai trò truy cập | Mô tả & Tình trạng |
|---|---|---|---|---|
| 1 | **Dashboard học sinh** | `/dashboard` | Learner, Teacher, Admin | Trung tâm điều khiển học tập, tích hợp thẻ bài học tiếp tục, AI Tutor gợi ý, widget "Kỹ năng cần cải thiện" và widget "Học gì tiếp theo". |
| 2 | **Môn học & Chương trình GDPT** | `/subjects`, `/subjects/:subjectId` | Tất cả | 4 phân môn chính (Toán học, Vật lý, Hóa học, Tiếng Anh) chuẩn GDPT 2018 theo SGK. |
| 3 | **Bài học & Kiểm tra cuối bài** | `/subjects/:id/lessons/:id`, `/quiz/:id` | Tất cả | Lý thuyết KaTeX/LaTeX, hình ảnh chuẩn, kiểm tra trắc nghiệm cuối bài và thanh ghi chú trực tiếp (`LessonNotesPanel`). |
| 4 | **Luyện tập & Ôn câu sai** | `/practice`, `/practice/session/:id` | Learner | Làm bài tập thực tế từ ngân hàng câu hỏi đã duyệt, chấm điểm GDPT 2018, tab Ôn câu sai & lặp lại ngắt quãng Spaced Repetition (Leitner). |
| 5 | **AI Tutor thông minh** | `/ai-tutor`, `/ai-tutor/:id` | Learner, Teacher | Trợ lý Socratic AI hướng dẫn từng bước theo ngữ cảnh bài học, không giải hộ. |
| 6 | **Thi thử cơ bản** | `/exam`, `/practice?mode=exam` | Learner | Chế độ thi mô phỏng thi tốt nghiệp THPT chuẩn hóa; chặn tuyệt đối xem trước đáp án khi đang làm bài. |
| 7 | **Lớp học & Bài tập giáo viên** | `/assignments`, `/teacher/*` | Learner, Teacher | Học sinh nộp bài tập và xem deadline; giáo viên quản lý lớp, học sinh và chấm bài. |
| 8 | **CMS quản trị nội dung** | `/content/*`, `/admin/*` | Content, Admin | Soạn thảo giáo trình, ngân hàng 16.693 câu hỏi VNHSGE, hàng đợi duyệt và phân quyền. |

---

## 2. DANH SÁCH CHỨC NĂNG TẠM ẨN KHỎI NAVIGATION

Theo đúng yêu cầu, **không xóa database, không xóa API, không xóa mã nguồn**. Chỉ ẩn các entry point trên menu chính để giao diện tập trung và tinh gọn:

1. **Thành tích (Achievements)**:
   - *Entry point*: Ẩn khỏi `Sidebar.tsx` và notification trong `Topbar.tsx`.
   - *Deep link*: Route `/achievements` trong `learnerRoutes.tsx` vẫn duy trì hoạt động bình thường.
2. **Thư viện tài liệu riêng (Library)**:
   - *Entry point*: Ẩn khỏi thanh tìm kiếm `Topbar.tsx`. Chuyển hướng người dùng vào nội dung tóm tắt theo môn học (`/subjects/math`).
   - *Deep link*: Route `/library` vẫn duy trì hoạt động.
3. **Trung tâm hỗ trợ giả lập (Support Center mock)**:
   - *Entry point*: Ẩn khỏi menu tài khoản học sinh/giáo viên. Chỉ hiển thị trong không gian làm việc của nhân viên hỗ trợ (`support` role).
   - *Deep link*: `/support`, `/support/tickets`, `/support/users` vẫn hoạt động cho nhân sự hỗ trợ.
4. **Knowledge Graph Visualization**:
   - Tạm ẩn khỏi luồng giao diện chính của học sinh, tránh làm rối trải nghiệm học tập trọng tâm.
5. **Classroom Mastery Heatmap chưa hoàn thiện**:
   - Giữ nguyên các báo cáo điểm danh và bảng điểm chuẩn; tạm ẩn visualization heatmap chưa hoàn thiện để đảm bảo tính xác thực dữ liệu.

---

## 3. DANH SÁCH CÁC CHỨC NĂNG ĐƯỢC GỘP

1. **Smart Review → Luyện tập / Ôn câu sai**:
   - Được gộp trực tiếp vào tab *"Ôn câu sai & Smart Review"* trên trang `/practice?tab=mistakes`.
   - Kết nối với hook `useSmartReview`, tính toán chu kỳ lặp lại ngắt quãng (Spaced Repetition) và số câu quá hạn cần ôn.
2. **Knowledge Gaps → Dashboard / Kỹ năng cần cải thiện**:
   - Tạo mới component `frontend/src/components/dashboard/KnowledgeGapsWidget.tsx`.
   - Hiển thị các điểm yếu thực tế từ lịch sử làm bài, phân loại mức độ nghiêm trọng, cung cấp nút *"Hỏi AI"* trực tiếp và *"Ôn tập ngay"*.
3. **Adaptive Learning Path → Dashboard / Học gì tiếp theo**:
   - Tạo mới component `frontend/src/components/dashboard/AdaptiveLearningWidget.tsx`.
   - Kết nối dữ liệu từ `usePersonalization`, đề xuất bước học tối ưu tiếp theo (môn học, bài học, thời lượng dự kiến) kèm nút *"Học ngay"*.
4. **Study Notes → Bài học / Ghi chú**:
   - Gộp trực tiếp vào `LessonPage.tsx` thông qua `LessonNotesPanel`.
   - Học sinh có thể tạo, sửa, xóa ghi chú gắn liền với từng đề mục của bài học. Loại bỏ link rời `/my-notes` trên Sidebar.

---

## 4. CẢI TIẾN BẢO MẬT P0: PRACTICE & EXAM ENGINE

| Mục bảo mật | Chi tiết giải pháp đã triển khai | File xử lý |
|---|---|---|
| **Xác thực API** | Bổ sung `[Authorize]` trên `PracticeController`. Từ chối mọi request ẩn danh với mã HTTP 401 Unauthorized. | `PracticeController.cs` |
| **Quyền sở hữu phiên** | Bắt buộc kiểm tra `attempt.UserId == CurrentUserId` trong `GetSession`, `SaveAnswer`, `SubmitSession`, `CheckSingleQuestion`. Học sinh không thể xem hoặc sửa bài của học sinh khác. | `PracticeController.cs` |
| **Chặn lộ đáp án (Anti-Cheat)** | Khi phiên làm bài ở chế độ thi (`AssessmentId == "asmt_exam"`), phương thức kiểm tra câu hỏi `CheckSingleQuestion` trả về ngay HTTP 403 Forbidden. Pre-submission DTO không bao giờ trả về `CorrectAnswer` và `Explanation`. | `PracticeController.cs` |
| **Dữ liệu thật đã duyệt** | Chỉ truy vấn câu hỏi có trạng thái `!q.IsDeleted && q.Status == "published" && !string.IsNullOrWhiteSpace(q.CorrectAnswer)`. Loại bỏ triệt để mock fallback. | `PracticeController.cs` |

---

## 5. DANH SÁCH FILE THAY ĐỔI

### Backend:
- `backend/src/StudyAI.Api/Controllers/PracticeController.cs`: Thêm `[Authorize]`, quyền sở hữu `CurrentUserId`, chặn lộ đáp án thi thử (HTTP 403), lọc câu hỏi published.
- `backend/src/StudyAI.Application/DTOs/PracticeDTOs.cs`: Thêm DTOs bảo đảm an toàn dữ liệu câu hỏi trước và sau nộp bài.
- `backend/tests/StudyAI.IntegrationTests/PracticeIntegrationTests.cs`: Thêm test kiểm tra xác thực (HTTP 401) và chặn gian lận xem đáp án trong kỳ thi (HTTP 403).

### Frontend:
- `frontend/src/components/layout/Sidebar.tsx`: Tinh gọn menu còn 6 mục chính cho học viên + phân môn + cài đặt + phím tắt không gian giáo viên/quản trị.
- `frontend/src/components/layout/SidebarItem.tsx`: Tối ưu hóa active state hỗ trợ query parameters (`/practice?mode=exam`).
- `frontend/src/components/layout/Topbar.tsx`: Thay thế gợi ý tìm kiếm Thư viện bằng Bài học; cập nhật notification sang luyện tập; ẩn shortcut hỗ trợ đối với học viên.
- `frontend/src/routes/learnerRoutes.tsx`: Thêm alias route `/exam` chuyển hướng sang `/practice?mode=exam`; bảo toàn toàn bộ deep link routes.
- `frontend/src/types/practice.ts`: Bổ sung `mode?: 'practice' | 'exam'` trong `PracticeSetupConfig`.
- `frontend/src/services/practice.service.ts`: Truyền chính xác tham số `mode` lên backend API.
- `frontend/src/pages/Practice/PracticeHubPage.tsx`: Tích hợp tab Ôn câu sai & Smart Review, hỗ trợ giao diện thi thử chuẩn hóa khi có `mode=exam`.
- `frontend/src/pages/Dashboard/DashboardPage.tsx`: Nhúng `AdaptiveLearningWidget` và `KnowledgeGapsWidget`.
- `frontend/src/components/dashboard/KnowledgeGapsWidget.tsx`: Widget kỹ năng yếu.
- `frontend/src/components/dashboard/AdaptiveLearningWidget.tsx`: Widget học gì tiếp theo.
- `frontend/src/components/dashboard/ContinueLearningCard.tsx`: Chỉnh sửa link liên kết sang `/subjects`.

---

## 6. KẾT QUẢ KIỂM THỬ (TEST RESULTS)

| Phân hệ kiểm thử | Công cụ / Lệnh | Kết quả | Trạng thái |
|---|---|---|---|
| **Frontend Build** | `npm --prefix frontend run build` | `tsc -b && vite build` hoàn thành trong 2.74s, 0 errors, 0 warnings. | **PASS** |
| **Frontend Test Suite** | `npm --prefix frontend test -- --run` | 52 test files passed, 406/406 tests passed. | **PASS** |
| **Backend Unit Tests** | `dotnet test backend/tests/StudyAI.UnitTests` | 81/81 tests passed, 0 failures. | **PASS** |
| **Backend Integration Tests** | `dotnet test backend/tests/StudyAI.IntegrationTests` | 132/132 tests passed (bao gồm test bảo mật Practice unauthenticated & Anti-cheat thi thử). | **PASS** |
| **Database Safety Guard** | Database Safety Assertion | Không có bất kỳ lệnh write / migration nào tác động lên database `StudyAIDb`. Toàn bộ dữ liệu 16.693 câu hỏi VNHSGE được bảo toàn 100%. | **PASS** |

---

## 7. CÁC VẤN ĐỀ TỒN ĐỌNG & KHUYẾN NGHỊ TIẾP THEO

1. **Bộ đếm thời gian cho Chế độ Thi thử (Exam Timer)**:
   - Hiện tại chế độ thi đã khóa xem đáp án trước nộp bài (HTTP 403 Forbidden). Bước tiếp theo có thể bổ sung đồng hồ đếm ngược (e.g. 50 phút hoặc 90 phút) trên giao diện `PracticeSessionPage` và tự động nộp bài khi hết giờ.
2. **Đồng bộ hóa Spaced Repetition với Database chính**:
   - Hiện tại thuật toán Spaced Repetition (Leitner 5 hộp) lưu trạng thái ôn tập câu sai trên local/repository của học viên. Cần mở rộng bảng `StudentMistakeReviews` trên backend để đồng bộ đa thiết bị khi người dùng đăng nhập tài khoản khác.
