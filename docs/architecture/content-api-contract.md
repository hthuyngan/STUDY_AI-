# Bản Tả Đặc tả Hợp đồng API Nội dung & Học tập (Content & Curriculum API Contract)

## 1. Content Management CMS Endpoints (Staff & Admin)
Yêu cầu xác thực: JWT Bearer với Role `admin` hoặc `content`.

### Subjects
- `GET /api/v1/content/subjects?grade={grade}&search={search}&isActive={bool}`: Danh sách tất cả môn học, số chương, số bài học.
- `GET /api/v1/content/subjects/{subjectId}`: Chi tiết môn học kèm cây danh sách chương và bài học.
- `POST /api/v1/content/subjects`: Tạo môn học mới.
  - Body: `{ name, code, grade, description, orderIndex, isActive }`
  - Trả về: 201 Created hoặc 409 Conflict nếu trùng `code`.
- `PATCH /api/v1/content/subjects/{subjectId}`: Cập nhật thông tin môn học.
- `DELETE /api/v1/content/subjects/{subjectId}`: Xóa môn học (Chặn nếu còn chứa chương học).

### Chapters
- `GET /api/v1/content/chapters?subjectId={id}`: Danh sách chương thuộc môn học.
- `POST /api/v1/content/chapters`: Tạo chương học mới.
  - Body: `{ subjectId, title, description, orderIndex, isActive }`
- `PATCH /api/v1/content/chapters/{chapterId}`: Cập nhật chương học.
- `DELETE /api/v1/content/chapters/{chapterId}`: Xóa chương học (Chặn nếu còn chứa bài học).

### Lessons
- `GET /api/v1/content/lessons?chapterId={id}&subjectId={id}&status={status}&page={page}`: Danh sách bài học phân trang.
- `GET /api/v1/content/lessons/{lessonId}`: Chi tiết bài học kèm các mảng lý thuyết JSON KaTeX.
- `POST /api/v1/content/lessons`: Tạo bài học mới (Mặc định trạng thái `draft`).
- `PATCH /api/v1/content/lessons/{lessonId}`: Cập nhật bài học (title, slug, introduction, definitions, formulas, examples, notes, summary).
- `POST /api/v1/content/lessons/{lessonId}/submit-review`: Chuyển trạng thái từ `draft` $\to$ `in-review`.
- `POST /api/v1/content/lessons/{lessonId}/approve`: Chuyển trạng thái từ `in-review` $\to$ `published`.
- `POST /api/v1/content/lessons/{lessonId}/request-changes`: Yêu cầu chỉnh sửa, trả về `draft`.
- `DELETE /api/v1/content/lessons/{lessonId}`: Xóa bài học (chỉ cho phép khi ở trạng thái draft hoặc không có dữ liệu lịch sử quan trọng).

### Question Bank
- `GET /api/v1/content/questions?lessonId={id}&difficulty={diff}&status={status}`: Danh sách câu hỏi trong ngân hàng kèm đáp án đúng và lời giải (dành riêng cho CMS).
- `POST /api/v1/content/questions`: Tạo câu hỏi trắc nghiệm mới.
  - Body: `{ lessonId, prompt, options, correctAnswer, explanation, topic, difficulty, type, status, orderIndex }`
  - Validation: `options` phải có từ 2 phương án trở lên; `correctAnswer` bắt buộc phải trùng khớp với một trong các phần tử của `options`.
- `PATCH /api/v1/content/questions/{questionId}`: Chỉnh sửa câu hỏi.
- `DELETE /api/v1/content/questions/{questionId}`: Xóa câu hỏi.

---

## 2. Learner Portal Curriculum Endpoints (Học viên)
Giao diện truy cập dành cho học viên đã xác thực hoặc khách tham quan:

### `GET /api/v1/curriculum/subjects`
- **Mô tả**: Trả về danh sách các môn học đang kích hoạt (`IsActive == true`) và số lượng bài học đã xuất bản (`published`).
- **Response**: `200 OK`
  ```json
  [
    {
      "id": "sub_math12",
      "name": "Toán 12",
      "code": "MATH12",
      "grade": "12",
      "description": "Chương trình Toán học Lớp 12 - Bộ sách Kết nối tri thức với cuộc sống",
      "orderIndex": 1,
      "chapterCount": 1,
      "lessonCount": 2
    }
  ]
  ```

### `GET /api/v1/curriculum/subjects/{subjectId}/chapters`
- **Mô tả**: Trả về cây danh mục chương và các bài học đã xuất bản thuộc môn học.
- **Response**: `200 OK`
  ```json
  [
    {
      "id": "chp_math12_c1",
      "title": "Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số",
      "description": "...",
      "orderIndex": 1,
      "lessons": [
        {
          "id": "les_math12_c1_b1",
          "title": "Bài 1: Tính đơn điệu và cực trị của hàm số",
          "slug": "tinh-don-dieu-va-cuc-tri",
          "orderIndex": 1,
          "status": "published"
        }
      ]
    }
  ]
  ```

### `GET /api/v1/curriculum/lessons/{lessonId}`
- **Mô tả**: Chi tiết nội dung lý thuyết và công thức KaTeX của bài học đã xuất bản.
- **Quy tắc Bảo mật**: Nếu bài học ở trạng thái `draft` hoặc `in-review`, trả về ngay `404 Not Found`.

### `GET /api/v1/curriculum/lessons/{lessonId}/questions`
- **Mô tả**: Lấy danh sách câu hỏi luyện tập của bài học.
- **ZERO-LEAK INVARIANT**: Tuyệt đối KHÔNG chứa `correctAnswer` và `explanation` trong payload phản hồi.
- **Response**: `200 OK`
  ```json
  [
    {
      "id": "qst_math12_c1_b1_q1",
      "lessonId": "les_math12_c1_b1",
      "prompt": "Cho hàm số $y = f(x)$ có bảng biến thiên...",
      "options": [
        "Hàm số đồng biến trên khoảng $(-\\infty; 1)$",
        "Hàm số nghịch biến trên khoảng $(-1; 1)$",
        "Hàm số đồng biến trên khoảng $(-1; 3)$",
        "Hàm số nghịch biến trên khoảng $(1; +\\infty)$"
      ],
      "topic": "Tính đơn điệu",
      "difficulty": "easy",
      "type": "multiple-choice",
      "orderIndex": 1
    }
  ]
  ```

### `POST /api/v1/curriculum/lessons/{lessonId}/questions/{questionId}/check`
- **Mô tả**: Gửi câu trả lời để máy chủ chấm điểm và trả về lời giải chi tiết.
- **Request Body**:
  ```json
  {
    "selectedOption": "Hàm số nghịch biến trên khoảng (-1; 1)"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "questionId": "qst_math12_c1_b1_q1",
    "isCorrect": true,
    "correctAnswer": "Hàm số nghịch biến trên khoảng (-1; 1)",
    "explanation": "Dựa vào dấu của đạo hàm, $f'(x) < 0$ với mọi $x \\in (-1; 1)$ nên hàm số nghịch biến trên khoảng $(-1; 1)$.",
    "scoreEarned": 5,
    "feedback": "Chính xác! Làm rất tốt."
  }
  ```
