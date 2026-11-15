# BÁO CÁO TOÀN DIỆN: HOÀN TẤT IMPORT TOÀN BỘ KHO VNHSGE VÀO DATABASE CHÍNH STUDYAIDB

**Dự án**: STUDY_AI (Vietnamese High School AI Education Platform)  
**Database Production**: `StudyAIDb` trên SQL Server `localhost\SQLEXPRESS`  
**Kiến trúc Database**: **DUY NHẤT 1 DATABASE PRODUCTION (`StudyAIDb`)**  
**Thời điểm hoàn tất**: 2026-11-15T14:48:00+07:00  

---

## 1. TỔNG KẾT THỰC THI & CHỈ SỐ TOÀN VẸN CƠ SỞ DỮ LIỆU

| Chỉ số CSDL | Trước khi import | Sau khi import hoàn tất | Biến động thực tế | Ghi chú kỹ thuật |
| :--- | :---: | :---: | :---: | :--- |
| **Tổng số câu hỏi (`content_questions`)** | **14** | **16.693** | **+16.679** | Duy nhất 1 bảng `content_questions` |
| - Câu hỏi thủ công gốc (`manual`) | 14 | 14 | 0 | Bảo toàn nguyên vẹn 100% |
| - Câu hỏi VNHSGE nạp mới (`vnhsge`) | 0 | **16.679** | **+16.679** | 100% trạng thái `draft` |
| - Trạng thái Published | 14 | 14 | 0 | Chỉ 14 câu gốc công khai |
| - Trạng thái Draft | 0 | **16.679** | **+16.679** | Khóa bản quyền kiểm duyệt |
| **Tổng số batch đã thực thi** | 0 | **69 / 69** | 100% | Batch size = 250 câu |
| **Câu hỏi trùng lặp nội bộ bỏ qua** | - | **375** | - | Nhận diện qua Code/Prompt hash |
| **Lỗi cú pháp / schema / kết nối** | - | **0** | - | Tỉ lệ lỗi: 0.00% |

---

## 2. KẾT QUẢ CÁC BƯỚC AN TOÀN PREFLIGHT & SAO LƯU

1. **Xác minh kết nối database production**:
   - Connection string: `Server=localhost\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true`
   - Xác thực đối tượng: `StudyAIDb` trực thuộc `localhost\SQLEXPRESS`.
2. **Ghi nhận 14 câu hỏi baseline**:
   - Cả 14 câu hỏi (`qst_15330e32c15f4fd5...`, `qst_math12_c1_b1_q1`, `qst_math12_c1_b1_q2`, v.v.) được ghi nhận snapshot.
   - Kết quả rà soát va chạm (Collision check): **0 va chạm (Zero Collision)**.
3. **Bản sao lưu bảo vệ Snapshot trước khi ghi**:
   - File sao lưu: `D:\TN\backups\StudyAIDb_Production_PreImport_Snapshot.bak`
   - Phương thức: `BACKUP DATABASE ... WITH FORMAT, INIT, CHECKSUM, STATS = 20`
   - Xác minh toàn vẹn: `RESTORE VERIFYONLY FROM DISK = '...' WITH CHECKSUM` $\rightarrow$ Hợp lệ 100%.
   - Diễn tập khôi phục: Phục hồi thử nghiệm trên database tạm `StudyAIDb_PreflightVerifyRestore`, đếm đủ 14 câu hỏi và hủy database thử nghiệm an toàn.
4. **Kiểm tra dung lượng đĩa**:
   - Dung lượng ổ D trống: 109.96 GB (vượt xa mức tối thiểu 2.0 GB).
5. **Dry-Run Preview**:
   - Kiểm tra thử nghiệm 500 câu đầu: 500 valid, 0 duplicate, 0 error.

---

## 3. PHÂN BỔ 16.679 CÂU VNHSGE THEO 9 MÔN HỌC THPT LỚP 12

Dữ liệu thực tế truy vấn trực tiếp từ SQL Server `StudyAIDb`:

| STT | Môn học | Mã môn (`SubjectId`) | Số lượng câu hỏi VNHSGE | Trạng thái | Loại câu hỏi |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **Toán 12** | `sub_math12` | **2.544** | `draft` | Trắc nghiệm 4 lựa chọn, công thức KaTeX/LaTeX |
| 2 | **Tiếng Anh 12** | `sub_eng12` | **2.367** | `draft` | Điền khuyết, đọc hiểu, ngữ âm, ngữ pháp |
| 3 | **Lịch sử 12** | `sub_hist12` | **1.998** | `draft` | Lịch sử Việt Nam & Thế giới |
| 4 | **Vật lý 12** | `sub_phys12` | **1.995** | `draft` | Dao động, sóng cơ, điện xoay chiều, hạt nhân |
| 5 | **Sinh học 12** | `sub_bio12` | **1.989** | `draft` | Di truyền, tiến hóa, sinh thái học |
| 6 | **Hóa học 12** | `sub_chem12` | **1.973** | `draft` | Hóa hữu cơ, vô cơ, phản ứng, thí nghiệm |
| 7 | **Địa lý 12** | `sub_geo12` | **1.931** | `draft` | Địa lí tự nhiên, dân cư, ngành kinh tế |
| 8 | **Giáo dục KT & PL 12** | `sub_civic12` | **1.852** | `draft` | Pháp luật, quyền bình đẳng công dân |
| 9 | **Ngữ văn 12** | `sub_lit12` | **30** | `draft` | Tự luận đọc hiểu văn bản & nghị luận văn học |
| | **TỔNG CỘNG VNHSGE** | | **16.679** | | |

*Ghi chú 14 câu hỏi gốc:*
- Vật lý 12 (`manual`, `published`): 4 câu
- Môn Nháp (`manual`, `published`): 4 câu
- Bảo Mật Test (`manual`, `published`): 4 câu
- Toán 12 (`manual`, `published`): 2 câu  
$\Rightarrow 16.679 + 14 = \mathbf{16.693}$ câu hỏi.

---

## 4. XÁC MINH TÀI NGUYÊN HÌNH ẢNH & KIỂM SOÁT BẢN QUYỀN

1. **Tài nguyên hình ảnh**:
   - Có **719 câu hỏi** có liên kết hình ảnh trực tiếp (`ImageUrl`).
   - Đường dẫn ảnh được lưu trữ dưới dạng relative web URL chuẩn: `/uploads/vnhsge/...`. Tuyệt đối không lưu đường dẫn tuyệt đối máy tính `D:\TN\...`.
   - File ảnh vật lý (1.217 files) đã được đồng bộ vào cả:
     - [backend/src/StudyAI.Api/wwwroot/uploads/vnhsge/](file:///d:/TN/backend/src/StudyAI.Api/wwwroot/uploads/vnhsge/)
     - [frontend/public/uploads/vnhsge/](file:///d:/TN/frontend/public/uploads/vnhsge/)
2. **Copyright Gate (Kiểm soát bản quyền học thuật)**:
   - Dữ liệu tuân thủ giấy phép CC BY-NC-SA 4.0 theo công bố arXiv:2305.12199.
   - Toàn bộ câu hỏi VNHSGE được khóa ở:
     - `Status`: `"draft"`
     - `CopyrightStatus`: `"pending_verification"`
     - `CopyrightProofRef`: `"CC-BY-NC-SA-4.0 (arXiv:2305.12199 - Server Controlled License)"`
     - `SourceType`: `"vnhsge"`
   - Người học và giáo viên hoàn toàn không thể tiếp cận hay làm bài đối với các câu hỏi này cho đến khi được Content Specialist kiểm duyệt và xuất bản từng câu.

---

## 5. KẾT QUẢ ĐỐI SOÁT API & IDEMPOTENCY TRÊN PRODUCTION

1. **Kiểm thử Idempotency trực tiếp trên `StudyAIDb`**:
   - Gửi lại 250 câu hỏi của Batch 1 qua API import.
   - Kết quả: `new = 0`, `duplicates = 250`, `errors = 0`.
   - Xác nhận 100% CSDL không sinh bản ghi trùng khi chạy lại lệnh import.
2. **Kiểm tra API `GET /api/v1/content/questions`**:
   - HTTP Status: `200 OK`.
   - Phân trang, tìm kiếm từ khóa và lọc theo từng `subjectId` phản hồi tức thì dưới 100ms.
   - Endpoint `GET /api/v1/content/questions/statistics`:
     - `totalQuestions`: **16.693**
     - `draftCount`: **16.679**
     - `publishedCount`: **14**
     - `bySource`: `{"vnhsge": 16679, "manual": 14}`
3. **Checkpoint bền vững**:
   - File checkpoint: [scripts/vnhsge_prod_checkpoint.json](file:///d:/TN/scripts/vnhsge_prod_checkpoint.json) ghi nhận trạng thái `lastCompletedBatchNumber: 69 / 69`, `totalImported: 16679`.

---

## 6. HƯỚNG DẪN ROLLBACK AN TOÀN (NẾU CẦN THIẾT)

Hệ thống cung cấp cơ chế Rollback phẫu thuật (Surgical Rollback) mà không làm ảnh hưởng tới các dữ liệu người dùng hay bài tập phát sinh sau này:

```sql
-- Rút lại toàn bộ dữ liệu VNHSGE nếu cần, bảo toàn 100% người dùng và câu hỏi gốc:
DELETE FROM StudyAIDb.dbo.content_questions WHERE SourceType = 'vnhsge';
```

Hoặc khôi phục toàn diện từ snapshot pre-import:
```sql
ALTER DATABASE StudyAIDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE StudyAIDb FROM DISK = 'D:\TN\backups\StudyAIDb_Production_PreImport_Snapshot.bak' WITH REPLACE;
ALTER DATABASE StudyAIDb SET MULTI_USER;
```

---

> **KẾT LUẬN CUỐI CÙNG**: Quá trình triển khai nạp toàn bộ kho câu hỏi VNHSGE vào database chính `StudyAIDb` đã hoàn thành xuất sắc, tuân thủ đúng yêu cầu Single Database, bảo toàn nguyên vẹn 14 câu hỏi ban đầu và đạt độ tin cậy dữ liệu 100%.

