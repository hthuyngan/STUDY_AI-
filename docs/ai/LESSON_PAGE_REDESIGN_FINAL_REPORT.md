# BÁO CÁO NGHIỆM THU: LESSON PAGE REDESIGN & CONTEXT-AWARE AI TUTOR

- **Dự án**: STUDY_AI / AItutor
- **Nhánh**: `feature/ai-core-v1`
- **Thời gian nghiệm thu**: 2026-11-16
- **Trạng thái**: HOÀN THÀNH TOÀN DIỆN (PASS)

---

## 1. PHẠM VI TRIỂN KHAI

### 1.1. Thiết kế lại trang bài học (`LessonPage.tsx` & `LessonPage.css`)
Bố cục thẳng từ trên xuống đúng 8 thành phần theo thứ tự nghiêm ngặt:
1. **Breadcrumb nhỏ**: `Trang chủ > Môn học > [Tên môn] > [Tên chương] > [Tên bài]`.
2. **Tên bài học**: `<h1>{lesson.title}</h1>`, chapter tag, thời lượng.
3. **Tiến độ học tập**: Thẻ tiến độ trực quan (% hoàn thành, huy hiệu XP tích lũy).
4. **Video bài giảng**: Khung 16:9, responsive, fullscreen, hỗ trợ loading & error state, không autoplay, có nút "Hỏi AI Tutor" gắn ngữ cảnh video.
5. **Danh sách video**: Hiển thị lưới video khi bài học có nhiều video bài giảng.
6. **Công cụ ghi chú và lưu bài**:
   - Nút mở drawer "Ghi chú của tôi" kèm đếm số lượng ghi chú.
   - Nút "Lưu bài học" / Bookmark toggle.
   - Nút "Hỏi AI Tutor" trên toolbar.
7. **Bài tập thu hoạch**: Collapsible accordion (mặc định thu gọn). Khi mở, tích hợp `LessonAssessmentCard` kết nối API câu hỏi thật không lộ đáp án trước khi nộp, lưu tiến độ vào SQL Server. Trạng thái làm bài không bị mất khi đóng/mở accordion.
8. **Điều hướng bài trước / tiếp theo**: Thanh footer điều hướng chuyển bài học mượt mà.

*Đã loại bỏ*: Sidebar phụ `LessonSidebar`, tab lý thuyết, tab công thức, tab ví dụ rời rạc khỏi giao diện bài học mà vẫn bảo toàn nguyên vẹn dữ liệu trong cơ sở dữ liệu.

### 1.2. AI Tutor bám sát ngữ cảnh bài học
- **Context Binding**: Khi mở bài, AI Tutor tự động liên kết ngữ cảnh bài học qua API `GET /api/v1/ai/context/lesson/{lessonId}` (LessonId, môn học, chương, mục tiêu học tập, định nghĩa, công thức, tóm tắt, video metadata, transcript notice).
- **Phân quyền & Kiểm tra**: Chặn học sinh truy cập bài học chưa xuất bản (`draft`/`archived`), trả về lỗi 403 Forbidden chuẩn xác.
- **Quy tắc độ dài phản hồi (Response Length Policy)**:
  - Khái niệm: 50–90 từ.
  - Công thức: 40–80 từ kèm KaTeX.
  - Hướng dẫn giải: 100–150 từ (tối đa 3 bước gợi ý tư duy).
  - Ngoài chủ đề: 1–2 câu lịch sự định hướng lại bài học.
  - Ngắn hơn: 1–2 câu trọng tâm <= 50 từ.
  - Chi tiết hơn: tối đa ~200 từ.
- **Bảo vệ đáp án khi thi**: AI tuyệt đối không tiết lộ chữ cái đáp án A/B/C/D hoặc giải trực tiếp đề thi khi đang làm bài.

### 1.3. Tách Route chuyển hướng `/ai-tutor` thành module độc lập
- Tạo `legacyRedirectRoutes.tsx` tách biệt việc định tuyến `/ai-tutor` -> `/subjects`.
- `learnerRoutes.tsx` và bộ test dùng chung module này, tránh nạp toàn bộ 25 trang vào test môi trường `happy-dom`.

---

## 2. KẾT QUẢ KIỂM THỬ

### 2.1. Backend Unit Tests (.NET 10)
- Command: `dotnet test backend/tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj --filter "FullyQualifiedName~LessonRedesignAndContextAiTests"`
- Kết quả: **13/13 Passed (0 Failed, 0 Skipped)**
- Thời gian chạy: **2 giây**
- Bao gồm 10 kịch bản đánh giá sư phạm, token budget và kiểm soát độ dài của AI Tutor.

### 2.2. Frontend Tests (Vitest + React 19)
- Command: `npx vitest run src/test/lessonRedesignAndUnifiedAiTutor.test.tsx`
- Kết quả: **5/5 Passed (0 Failed)**
- Thời gian chạy trước khi tối ưu: > 60 giây (treo do loop re-render và nạp 25 trang).
- Thời gian chạy sau khi tối ưu: **3.35 giây** (test execution 427ms).

### 2.3. Frontend Production Build
- Command: `npm run build` (`tsc -b && vite build`)
- Kết quả: **Build thành công (Exit code 0)** trong 4.44s, không có lỗi kiểu TypeScript hay lỗi đóng gói.

---

## 3. THAY ĐỔI GIT & KIỂM TRA BẢO MẬT
- `git diff --check`: 0 lỗi whitespace/newline.
- Secret scanning: Không có token, API key hoặc credentials bị rò rỉ.
