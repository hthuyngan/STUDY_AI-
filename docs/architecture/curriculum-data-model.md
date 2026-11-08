# Mô hình Dữ liệu Chương trình Học (Curriculum Data Model)

## 1. Sơ đồ Thực thể Quan hệ (ERD)

```mermaid
erDiagram
    content_subjects ||--o{ content_chapters : "has"
    content_chapters ||--o{ content_lessons : "has"
    content_lessons ||--o{ content_questions : "contains"
    content_lessons ||--o{ content_assessments : "has"
    content_assessments ||--o{ content_questions : "groups"

    content_subjects {
        string Id PK "sub_math12"
        string Name "Toán học 12"
        string Code "MATH12"
        string Description "Mô tả môn"
        string Grade "12"
        int OrderIndex "1"
        bit IsActive "1"
        datetimeoffset CreatedAt
        datetimeoffset UpdatedAt
    }

    content_chapters {
        string Id PK "chp_xxx"
        string SubjectId FK
        string Title "Chương 1: Khảo sát hàm số"
        string Description "Mô tả chương"
        int OrderIndex "1"
        bit IsActive "1"
        datetimeoffset CreatedAt
        datetimeoffset UpdatedAt
    }

    content_lessons {
        string Id PK "les_xxx"
        string ChapterId FK
        string Title "Bài 1: Cực trị hàm số"
        string Slug "cuc-tri-ham-so"
        int OrderIndex "1"
        string Status "draft|in-review|published"
        string AuthorId FK
        string ReviewedBy
        string Introduction
        string DefinitionsJson
        string FormulasJson
        string ExamplesJson
        string ImportantNotesJson
        string SummaryPointsJson
        datetimeoffset CreatedAt
        datetimeoffset UpdatedAt
    }

    content_questions {
        string Id PK "qst_xxx"
        string LessonId FK
        string ChapterId FK
        string SubjectId FK
        string AssessmentId FK
        string Prompt "Cho hàm số..."
        string OptionsJson "[\"A\", \"B\", \"C\", \"D\"]"
        string CorrectAnswer "B"
        string Explanation "Lời giải chi tiết..."
        string Topic "Cực trị"
        string Difficulty "easy|medium|hard"
        string Type "multiple-choice"
        string Status "published"
        int OrderIndex "1"
        datetimeoffset CreatedAt
        datetimeoffset UpdatedAt
    }
```

---

## 2. Quy định Ràng buộc Toàn vẹn (Integrity Constraints & Indexing)

1. **Mã môn học duy nhất (`Unique Code`)**:
   - `content_subjects.Code` có Unique Index không phân biệt hoa thường.
   - Khi tạo môn trùng mã, hệ thống bắt lỗi và trả về HTTP 409 Conflict.
2. **Chính sách Bảo vệ Xóa (Deletion Guards)**:
   - Không cho phép xóa Môn học khi đang còn chứa Chương học.
   - Không cho phép xóa Chương học khi đang còn chứa Bài học.
   - Không cho phép xóa Câu hỏi khi đã có học viên thực hiện làm bài (Foreign key với `assessment_responses`).
3. **Tránh Vòng lặp Xóa Cascade (SQL Server Multiple Cascade Paths - Error 1785)**:
   - Quan hệ `content_questions` $\to$ `content_lessons` được cấu hình với `DeleteBehavior.NoAction` (hoặc `ReferentialAction.NoAction`).
   - Điều này ngăn chặn xung đột cascade cycle khi `content_lessons` cũng cascade tới `content_assessments`, vốn cũng liên kết tới `content_questions`.
4. **Chỉ mục Hiệu năng cao (Indexes)**:
   - `IX_content_questions_LessonId`
   - `IX_content_questions_ChapterId`
   - `IX_content_questions_SubjectId`
   - `IX_content_questions_Status`
   - `IX_content_lessons_Status`
   - `IX_content_chapters_SubjectId`
