# STUDY_AI — Từ điển Dữ liệu Chương trình học (Data Dictionary)
## Chi tiết Thuộc tính, Kiểu dữ liệu, Ràng buộc và Quy tắc Kiểm thực

Ngày ban hành: 09/11/2026  
Mục đích: Cung cấp tài liệu tham chiếu chuẩn xác cho đội ngũ Kỹ sư Dữ liệu, Backend Developer và Chuyên viên Biên soạn Nội dung khi thực hiện nhập liệu hoặc tích hợp API.

---

## 1. Bảng `content_subjects` (Môn học)

Lưu trữ danh mục môn học thuộc các khối lớp theo chuẩn GDPT 2018.

| Tên Cột | Kiểu Dữ liệu SQL Server | Nullable | Giá trị Mặc định | Ràng buộc & Chỉ mục | Quy tắc Kiểm thực (Validation) | Ý nghĩa Nghiệp vụ | Ví dụ Mẫu |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `Id` | `nvarchar(64)` | NO | Sinh tự động | Khóa chính (PK) | Định dạng: `sub_` + chuỗi alphanum (3-32 ký tự). | Mã định danh duy nhất toàn hệ thống của môn học. | `"sub_math12"` |
| `Name` | `nvarchar(128)` | NO | Không | Không | Độ dài: 2 - 128 ký tự. Không chứa ký tự điều khiển. | Tên hiển thị đầy đủ của môn học. | `"Toán 12"` |
| `Code` | `nvarchar(32)` | NO | Không | Unique Index (`IX_content_subjects_Code`) | In hoa, không dấu, regex: `^[A-Z0-9_]{2,32}$`. | Mã môn định danh nghiệp vụ (chống trùng). | `"MATH12"` |
| `Description` | `nvarchar(max)` | YES | NULL | Không | Tối đa 2000 ký tự. | Mô tả tổng quan về định hướng môn học. | `"Chương trình Toán học Lớp 12 - Chuẩn GDPT 2018"` |
| `Grade` | `nvarchar(32)` | NO | Không | Không | Enum: `"10"`, `"11"`, `"12"`. | Khối lớp tương ứng của chương trình. | `"12"` |
| `OrderIndex` | `int` | NO | `0` | Default Constraint (`DF_content_subjects_OrderIndex`) | Số nguyên $\ge 0$. | Thứ tự sắp xếp hiển thị trên giao diện người học. | `1` |
| `IsActive` | `bit` | NO | `1` | Default Constraint (`DF_content_subjects_IsActive`) | `1` (kích hoạt) hoặc `0` (tạm ẩn). | Cờ kích hoạt phục vụ bật/tắt môn học linh hoạt. | `1` |
| `CreatedAt` | `datetimeoffset` | NO | `SYSDATETIMEOFFSET()` | Không | Chuẩn ISO 8601 UTC. | Thời điểm tạo bản ghi. | `"2026-11-09T13:30:00Z"` |
| `UpdatedAt` | `datetimeoffset` | NO | `SYSDATETIMEOFFSET()` | Không | Chuẩn ISO 8601 UTC. | Thời điểm cập nhật cuối cùng. | `"2026-11-09T13:30:00Z"` |

---

## 2. Bảng `content_chapters` (Chương học)

Lưu trữ phân cấp chương hoặc chủ đề lớn bên trong từng môn học.

| Tên Cột | Kiểu Dữ liệu SQL Server | Nullable | Giá trị Mặc định | Ràng buộc & Chỉ mục | Quy tắc Kiểm thực (Validation) | Ý nghĩa Nghiệp vụ | Ví dụ Mẫu |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `Id` | `nvarchar(64)` | NO | Sinh tự động | Khóa chính (PK) | Định dạng: `chp_` + chuỗi alphanum. | Mã định danh duy nhất của chương học. | `"chp_math12_c1"` |
| `SubjectId` | `nvarchar(64)` | NO | Không | Khóa ngoại (FK) $\to$ `content_subjects(Id)` | Phải tồn tại trong `content_subjects`. | Khóa ngoại liên kết môn học cha. | `"sub_math12"` |
| `Title` | `nvarchar(256)` | NO | Không | Không | Độ dài: 3 - 256 ký tự. | Tiêu đề chương học theo GDPT 2018. | `"Chương 1: Ứng dụng đạo hàm để khảo sát hàm số"` |
| `Description` | `nvarchar(max)` | YES | NULL | Không | Tối đa 2000 ký tự. | Tóm lược mục tiêu kiến thức của chương. | `"Khảo sát tính đơn điệu, cực trị, GTLN/GTNN..."` |
| `OrderIndex` | `int` | NO | `0` | Default Constraint (`DF_content_chapters_OrderIndex`) | Số nguyên $\ge 0$. | Thứ tự chương trong môn học. | `1` |
| `IsActive` | `bit` | NO | `1` | Không | `1` (kích hoạt) hoặc `0` (ẩn). | Cờ hiển thị chương học. | `1` |
| `CreatedAt` | `datetimeoffset` | NO | `SYSDATETIMEOFFSET()` | Không | Chuẩn ISO 8601 UTC. | Thời điểm tạo chương. | `"2026-11-09T13:30:00Z"` |
| `UpdatedAt` | `datetimeoffset` | NO | `SYSDATETIMEOFFSET()` | Không | Chuẩn ISO 8601 UTC. | Thời điểm cập nhật cuối. | `"2026-11-09T13:30:00Z"` |

---

## 3. Bảng `content_lessons` (Bài học)

Lưu trữ nội dung lý thuyết, công thức KaTeX, trạng thái kiểm duyệt và quyền biên soạn của bài học.

| Tên Cột | Kiểu Dữ liệu SQL Server | Nullable | Giá trị Mặc định | Ràng buộc & Chỉ mục | Quy tắc Kiểm thực (Validation) | Ý nghĩa Nghiệp vụ | Ví dụ Mẫu |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `Id` | `nvarchar(64)` | NO | Sinh tự động | Khóa chính (PK) | Định dạng: `les_` + chuỗi alphanum. | Mã định danh duy nhất của bài học. | `"les_math12_c1_b1"` |
| `ChapterId` | `nvarchar(64)` | NO | Không | Khóa ngoại (FK) $\to$ `content_chapters(Id)` | Phải tồn tại trong `content_chapters`. | Khóa ngoại liên kết chương cha. | `"chp_math12_c1"` |
| `Title` | `nvarchar(256)` | NO | Không | Không | Độ dài: 3 - 256 ký tự. | Tên bài học. | `"Bài 1: Tính đơn điệu và cực trị của hàm số"` |
| `Slug` | `nvarchar(256)` | NO | Không | Index (`IX_content_lessons_Slug`) | Chữ thường, gạch nối: `^[a-z0-9-]+$`. | Định danh thân thiện URL cho trình duyệt. | `"tinh-don-dieu-va-cuc-tri-ham-so"` |
| `OrderIndex` | `int` | NO | `0` | Default Constraint (`DF_content_lessons_OrderIndex`) | Số nguyên $\ge 0$. | Thứ tự bài học trong chương. | `1` |
| `Status` | `nvarchar(32)` | NO | `'draft'` | Index (`IX_content_lessons_Status`) | Enum: `"draft"`, `"in-review"`, `"approved"`, `"published"`, `"archived"`. | Trạng thái vòng đời kiểm duyệt nội dung. | `"published"` |
| `AuthorId` | `nvarchar(64)` | NO | Không | Khóa ngoại (FK) $\to$ `users(Id)` | Phải tồn tại trong `users`. | ID của chuyên viên biên soạn bài học. | `"usr_content_staff_01"` |
| `ReviewedBy` | `nvarchar(64)` | YES | NULL | Không | Phải khác `AuthorId` khi `published`. | ID của Admin/Reviewer phê duyệt xuất bản. | `"usr_admin_master"` |
| `Introduction` | `nvarchar(max)` | YES | NULL | Không | Chứa văn bản mở đầu và KaTeX cơ bản. | Lời dẫn nhập bài học tạo cảm hứng. | `"Trong thực tế, nhiều hiện tượng biến thiên..."` |
| `DefinitionsJson` | `nvarchar(max)` | YES | NULL | Không | Chuỗi JSON hợp lệ mảng các định nghĩa. | Mảng các định nghĩa thuật ngữ sư phạm. | `"[{\"term\":\"Đồng biến\",\"content\":\"...\"}]"` |
| `FormulasJson` | `nvarchar(max)` | YES | NULL | Không | Chuỗi JSON hợp lệ mảng công thức. | Mảng các công thức toán học KaTeX. | `"[{\"name\":\"Quy tắc 1\",\"latex\":\"f'(x)=0\"}]"` |
| `ExamplesJson` | `nvarchar(max)` | YES | NULL | Không | Chuỗi JSON hợp lệ mảng ví dụ. | Mảng các bài toán ví dụ giải mẫu chi tiết. | `"[{\"title\":\"Ví dụ 1\",\"solution\":\"...\"}]"` |
| `ImportantNotesJson` | `nvarchar(max)` | YES | NULL | Không | Chuỗi JSON hợp lệ mảng lưu ý. | Những sai lầm thường gặp và lưu ý trọng tâm. | `"[{\"note\":\"Lưu ý đạo hàm đổi dấu...\"}]"` |
| `SummaryPointsJson` | `nvarchar(max)` | YES | NULL | Không | Chuỗi JSON hợp lệ mảng tóm tắt. | Điểm then chốt cần ghi nhớ sau bài học. | `"[{\"point\":\"Ghi nhớ 3 bước khảo sát...\"}]"` |
| `CreatedAt` | `datetimeoffset` | NO | `SYSDATETIMEOFFSET()` | Không | Chuẩn ISO 8601 UTC. | Thời điểm tạo bài học. | `"2026-11-09T13:30:00Z"` |
| `UpdatedAt` | `datetimeoffset` | NO | `SYSDATETIMEOFFSET()` | Không | Chuẩn ISO 8601 UTC. | Thời điểm cập nhật cuối cùng. | `"2026-11-09T13:30:00Z"` |

---

## 4. Bảng `content_questions` (Ngân hàng Câu hỏi)

Lưu trữ từng câu hỏi trắc nghiệm, các lựa chọn, đáp án đúng và lời giải chi tiết.

| Tên Cột | Kiểu Dữ liệu SQL Server | Nullable | Giá trị Mặc định | Ràng buộc & Chỉ mục | Quy tắc Kiểm thực (Validation) | Ý nghĩa Nghiệp vụ | Ví dụ Mẫu |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `Id` | `nvarchar(64)` | NO | Sinh tự động | Khóa chính (PK) | Định dạng: `qst_` + chuỗi alphanum. | Mã định danh duy nhất toàn hệ thống của câu hỏi. | `"qst_math12_c1_001"` |
| `LessonId` | `nvarchar(64)` | YES | NULL | Khóa ngoại (FK) $\to$ `content_lessons(Id)`, Index | Phải tồn tại nếu có giá trị. | Bài học chứa câu hỏi này. | `"les_math12_c1_b1"` |
| `ChapterId` | `nvarchar(64)` | YES | NULL | Index (`IX_content_questions_ChapterId`) | Phải tồn tại nếu có giá trị. | Chương học chứa câu hỏi (hỗ trợ lọc nhanh). | `"chp_math12_c1"` |
| `SubjectId` | `nvarchar(64)` | YES | NULL | Index (`IX_content_questions_SubjectId`) | Phải tồn tại nếu có giá trị. | Môn học chứa câu hỏi (hỗ trợ đề thi tổng hợp). | `"sub_math12"` |
| `AssessmentId` | `nvarchar(64)` | YES | NULL | Khóa ngoại (FK) $\to$ `content_assessments(Id)` | Phải tồn tại nếu có giá trị. | Đợt bài thu hoạch liên kết câu hỏi này. | `NULL` hoặc `"asm_math12_01"` |
| `Prompt` | `nvarchar(max)` | NO | Không | Không | Độ dài 5 - 4000 ký tự. KaTeX cân bằng dấu `$`. | Nội dung câu hỏi (hỗ trợ KaTeX inline/display). | `"Cho hàm số $y=f(x)$ có bảng biến thiên..."` |
| `OptionsJson` | `nvarchar(max)` | NO | `'[]'` | Không | JSON Array gồm chính xác 4 phần tử chuỗi. | Các phương án lựa chọn A, B, C, D. | `"[\"x=1\", \"x=2\", \"x=-1\", \"x=0\"]"` |
| `CorrectAnswer` | `nvarchar(256)` | NO | Không | Không | Enum: `"A"`, `"B"`, `"C"`, `"D"` (hoặc JSON object). | **Đáp án đúng (Tuyệt đối giấu với học viên)**. | `"B"` |
| `Explanation` | `nvarchar(max)` | YES | NULL | Không | Lời giải chi tiết sư phạm (chứa KaTeX). | Lời giải thích chỉ trả về sau khi nộp bài. | `"Dựa vào bảng biến thiên, tại điểm $x=2$..."` |
| `Topic` | `nvarchar(128)` | YES | NULL | Không | Tối đa 128 ký tự. | Chủ đề nhánh kiến thức sư phạm. | `"Cực trị hàm số"` |
| `Difficulty` | `nvarchar(32)` | NO | `'medium'` | Không | Enum: `"easy"` (Nhận biết), `"medium"` (Thông hiểu), `"hard"` (Vận dụng). | Độ khó câu hỏi theo chuẩn sư phạm. | `"medium"` |
| `Type` | `nvarchar(32)` | NO | `'multiple-choice'` | Không | Enum: `"multiple-choice"`, `"true-false"`, `"short-answer"`. | Định dạng câu hỏi khảo thí. | `"multiple-choice"` |
| `Status` | `nvarchar(32)` | NO | `'published'` | Index (`IX_content_questions_Status`) | Enum: `"draft"`, `"in-review"`, `"published"`. | Trạng thái hiển thị trong ngân hàng đề. | `"published"` |
| `OrderIndex` | `int` | NO | `0` | Default Constraint (`DF_content_questions_OrderIndex`) | Số nguyên $\ge 0$. | Thứ tự câu hỏi trong đề hoặc bài học. | `1` |
| `CreatedAt` | `datetimeoffset` | NO | `SYSDATETIMEOFFSET()` | Không | Chuẩn ISO 8601 UTC. | Thời điểm tạo câu hỏi. | `"2026-11-09T13:30:00Z"` |
| `UpdatedAt` | `datetimeoffset` | NO | `SYSDATETIMEOFFSET()` | Không | Chuẩn ISO 8601 UTC. | Thời điểm cập nhật cuối cùng. | `"2026-11-09T13:30:00Z"` |

---

## 5. Bảng `content_assessments` (Đợt Đánh giá / Thu hoạch)

Lưu trữ tiêu chí bài thu hoạch cuối bài học.

| Tên Cột | Kiểu Dữ liệu SQL Server | Nullable | Giá trị Mặc định | Ràng buộc & Chỉ mục | Quy tắc Kiểm thực (Validation) | Ý nghĩa Nghiệp vụ | Ví dụ Mẫu |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `Id` | `nvarchar(64)` | NO | Sinh tự động | Khóa chính (PK) | Định dạng: `asm_` + chuỗi alphanum. | Mã định danh đợt đánh giá. | `"asm_math12_c1_b1"` |
| `LessonId` | `nvarchar(64)` | NO | Không | Khóa ngoại (FK) $\to$ `content_lessons(Id)` | Phải tồn tại trong `content_lessons`. | Bài học liên kết đợt thu hoạch. | `"les_math12_c1_b1"` |
| `Title` | `nvarchar(256)` | NO | Không | Không | Độ dài: 3 - 256 ký tự. | Tên bài thu hoạch. | `"Bài thu hoạch: Đơn điệu và cực trị"` |
| `PassScore` | `int` | NO | `80` | Không | Giá trị từ 0 đến 100 (mặc định 80%). | Ngưỡng điểm đạt để mở khóa bài học kế tiếp. | `80` |
| `CreatedAt` | `datetimeoffset` | NO | `SYSDATETIMEOFFSET()` | Không | Chuẩn ISO 8601 UTC. | Thời điểm khởi tạo bài thu hoạch. | `"2026-11-09T13:30:00Z"` |

---

## 6. Bảng `staff_audit_logs` (Nhật ký Kiểm toán Nhân sự)

Ghi nhận toàn bộ thao tác phê duyệt, từ chối, xuất bản và import dữ liệu nội dung phục vụ truy vết bảo mật (Dual-Control Audit Trail).

| Tên Cột | Kiểu Dữ liệu SQL Server | Nullable | Ràng buộc | Ý nghĩa Nghiệp vụ | Ví dụ Mẫu |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `Id` | `nvarchar(64)` | NO | Khóa chính (PK) | Mã định danh bản ghi nhật ký. | `"log_audit_9812491"` |
| `StaffUserId` | `nvarchar(64)` | NO | Khóa ngoại $\to$ `users(Id)` | ID nhân sự thực hiện thao tác. | `"usr_admin_master"` |
| `StaffEmail` | `nvarchar(256)` | NO | Không | Email nhân sự tại thời điểm thao tác. | `"admin@studyai.internal"` |
| `StaffRole` | `nvarchar(32)` | NO | Không | Vai trò (`admin`, `content`, `reviewer`). | `"admin"` |
| `Action` | `nvarchar(64)` | NO | Không | Hành động: `content.approve`, `content.bulk_import`, `content.create_lesson`. | `"content.approve"` |
| `TargetType` | `nvarchar(64)` | YES | Không | Loại đối tượng: `lesson`, `question`, `subject`. | `"lesson"` |
| `TargetId` | `nvarchar(64)` | YES | Không | ID của đối tượng bị tác động. | `"les_math12_c1_b1"` |
| `Details` | `nvarchar(max)` | YES | Không | Chi tiết thay đổi hoặc số lượng bản ghi import. | `"Phê duyệt bài học. AuthorId: usr_content_01"` |
| `Timestamp` | `datetimeoffset` | NO | Index | Thời điểm ghi nhận hành động. | `"2026-11-09T13:30:00Z"` |

