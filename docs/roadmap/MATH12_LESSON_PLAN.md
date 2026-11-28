# MATH12 LESSON & CONTENT AUTHORING PLAN (DATA-08)

> **Mục tiêu:** Thiết kế cấu trúc chuẩn cho toàn bộ bộ học liệu Toán 12 nguyên bản trong `backend/data/math12/`.

## 1. Cấu trúc chuẩn mỗi bài giảng (`lesson_content_blocks`)
Mỗi bài học trong 19 bài (`Bài 1`..`Bài 19`) gồm ít nhất 4 khối nội dung có thứ tự (`OrderIndex` 1..4):
1. **Mục tiêu & Khái niệm trọng tâm (`text` / `concept`)**: Tóm tắt định nghĩa, định lý cốt lõi bằng KaTeX chuẩn (`$...$`, `$$...$$`).
2. **Công thức & Quy tắc cần nhớ (`formula`)**: Hệ thống hóa công thức, điều kiện áp dụng, lưu ý sai lầm thường gặp.
3. **Ví dụ minh họa có lời giải từng bước (`example`)**: 1–2 ví dụ mẫu trình bày rõ các bước giải.
4. **Tóm tắt & Ghi chú ôn thi (`summary`)**: Chốt ý chính và gợi ý dạng bài thường gặp trong đề thi TN THPT 2025+.

## 2. Cấu trúc ngân hàng câu hỏi (`backend/data/math12/questions/`)
- Phân bổ đều cho cả 6 chương và 19 bài học:
  - **Trắc nghiệm 4 lựa chọn (`multiple-choice`)**: Tối thiểu 38 câu (2+ câu/bài), đầy đủ mức độ `easy`, `medium`, `hard`.
  - **Đúng/Sai 4 mệnh đề (`true-false-group`)**: Tối thiểu 12 câu (2+ câu/chương), định dạng `OptionsJson` 4 phát biểu và `CorrectAnswer` chuẩn `true,false,...`.
  - **Trả lời ngắn (`short-answer`)**: Tối thiểu 18 câu (3+ câu/chương), đáp án số nguyên, thập phân hoặc phân số rút gọn kèm `acceptedAnswers` trong `MetadataJson`.
- Mọi câu hỏi đều có: `Explanation` chi tiết từng bước, `Difficulty`, `SourceId = "SRC-STUDYAI-ORIG-2026"`, và `SymPy` check PASS.

## 3. Cấu trúc đề kiểm tra (`backend/data/math12/assessments/`)
- **6 Đề kiểm tra 15–30 phút theo chương** (`asm_m12_c1`..`asm_m12_c6`, `PassScore = 70`).
- **2 Đề thi thử tổng hợp Học kỳ / TN THPT 2025+** (`asm_m12_mock_hk1`, `asm_m12_mock_thpt`, kết hợp cả 3 dạng câu hỏi `multiple-choice`, `true-false-group`, `short-answer`).

## 4. Tài liệu ôn tập & Kho tri thức AI (`materials/` & `knowledge/`)
- 6 tài liệu tóm tắt chuyên đề cho 6 chương (`ContentMaterial` + `AiKnowledgeSource` + `AiKnowledgeChunk`), trạng thái `published` & `indexed` để AI Tutor trích dẫn chính xác nguồn Toán 12.
