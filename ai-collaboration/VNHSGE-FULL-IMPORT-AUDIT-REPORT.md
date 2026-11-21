# BÁO CÁO KHÔI PHỤC VÀ HOÀN TẤT DIỄN TẬP TOÀN BỘ KHO VNHSGE (16.906+ CÂU)
**Dự án**: STUDY_AI (Vietnamese High School AI Education Platform)  
**Phạm vi kiểm thử**: `StudyAIDb_E2E` (Single Database Architecture Verification)  
**Trạng thái Production Database (`StudyAIDb`)**: **14 CÂU HỎI GỐC (BẢO TOÀN NGUYÊN VẸN 100%)**  
**Thời điểm hoàn tất**: 2026-11-15T14:07:00+07:00  

---

## 1. TỔNG QUAN TIẾN TRÌNH KHÔI PHỤC & KẾT QUẢ ĐỐI SOÁT

### 1.1. Tình trạng phiên chạy trước (Hôm qua)
- **Số batch đã hoàn tất**: **55 / 69 batch** (kích thước 250 câu/batch).
- **Số câu đã nạp vào CSDL**: **13.384 câu VNHSGE** (100% `status = "draft"`).
- **Số câu trùng lặp nội bộ đã phát hiện & bỏ qua**: **366 câu**.
- **Tổng số câu đã duyệt**: $55 \times 250 = 13.750$ câu ($13.384 + 366 = 13.750$, khớp chính xác 100%).
- **Nguyên nhân gián đoạn**: Máy tính/server khởi động lại (hệ thống ghi nhận sự kiện server restart). Do kiến trúc batch của STUDY_AI sử dụng **Database ExecutionStrategy & ACID Transaction** trên từng batch HTTP, 55 batch trước đó đã commit nguyên vẹn vào SQL Server, không phát sinh bất kỳ dòng dữ liệu lỗi hay bản ghi rác nào.

### 1.2. Tiến trình khôi phục hôm nay
- **Cơ chế tiếp tục**: Script khôi phục resilient `scripts/resume_vnhsge_import_e2e.ts` đã kiểm tra toàn bộ `Code` và `Prompt` hash trong `StudyAIDb_E2E`, xác định chính xác 55 batch đầu đã hoàn tất và tiếp tục từ **Batch 56 (index 55) đến Batch 69 (index 68)**.
- **Số batch nạp hôm nay**: **14 batch còn lại** (gồm 3.304 câu hỏi nguồn).
- **Số câu nạp mới hôm nay**: **3.295 câu**.
- **Số câu trùng lặp bỏ qua hôm nay**: **9 câu**.
- **Lỗi phát sinh**: **0 lỗi**.
- **Checkpoint bền vững**: Đã lưu tại `scripts/vnhsge_checkpoint.json` (`lastCompletedBatchNumber: 69 / 69`).

---

## 2. BẢNG TỔNG KẾT DỮ LIỆU ĐỐI SOÁT

| Chỉ số | Dữ liệu nguồn VNHSGE | Đã nạp thành công (E2E) | Trùng lặp nội bộ bỏ qua | Lỗi cú pháp / Schema | Ghi chú |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Tổng số câu hỏi** | **17.054** | **16.679** | **375** | **0** | $16.679 + 375 = 17.054$ |
| - Trắc nghiệm (MCQ) | 16.898 | 16.523 | 375 | 0 | Đầy đủ 4 phương án A-B-C-D |
| - Trả lời ngắn / phi chuẩn | 126 | 126 | 0 | 0 | Dạng điền đáp án số/chữ |
| - Tự luận (Ngữ văn) | 30 | 30 | 0 | 0 | Kèm gợi ý chấm điểm |
| **Số câu có hình ảnh** | 1.160 tham chiếu | **722 câu** | - | 0 | 1.217 file ảnh vật lý đồng bộ |

---

## 3. PHÂN BỔ 16.679 CÂU VNHSGE THEO 9 MÔN HỌC THPT LỚP 12

Tất cả câu hỏi đã được tự động phân bổ chuẩn hóa vào 9 môn học cốt lõi của chương trình THPT:

| STT | Môn học | Mã môn (`SubjectId`) | Số lượng câu hỏi | Loại câu hỏi chính |
| :---: | :--- | :--- | :---: | :--- |
| 1 | **Toán 12** | `sub_math12` | **2.544** | Trắc nghiệm 4 lựa chọn, công thức KaTeX |
| 2 | **Tiếng Anh 12** | `sub_eng12` | **2.367** | Điền từ, đọc hiểu, trắc nghiệm ngữ pháp |
| 3 | **Lịch sử 12** | `sub_hist12` | **1.998** | Trắc nghiệm sự kiện, lịch sử VN & thế giới |
| 4 | **Vật lý 12** | `sub_phys12` | **1.995** | Trắc nghiệm dao động, sóng, hạt nhân, mạch điện |
| 5 | **Sinh học 12** | `sub_bio12` | **1.989** | Di truyền, tiến hóa, sinh thái học |
| 6 | **Hóa học 12** | `sub_chem12` | **1.973** | Hóa hữu cơ, vô cơ, phản ứng, thí nghiệm |
| 7 | **Địa lý 12** | `sub_geo12` | **1.931** | Địa lí tự nhiên, dân cư, ngành kinh tế |
| 8 | **Giáo dục KT & PL 12** | `sub_civic12` | **1.852** | Pháp luật, quyền công dân, kinh tế thị trường |
| 9 | **Ngữ văn 12** | `sub_lit12` | **30** | Đọc hiểu văn bản & nghị luận văn học |
| | **TỔNG CỘNG** | | **16.679** | |

*Ghi chú: CSDL `StudyAIDb_E2E` có thêm 152 câu hỏi mẫu nội bộ có sẵn từ trước, tổng số câu hỏi hiện tại trên CSDL kiểm thử là **16.831 câu**.*

---

## 4. KẾT QUẢ KIỂM THỬ TOÀN DIỆN (100% GREEN)

1. **Kiểm thử chống trùng (Idempotency Audit)**:
   - Gửi lại toàn bộ Batch 56 (250 câu) qua API import.
   - Kết quả: `new = 0`, `duplicates = 250`, `errors = 0`.
   - Không có bất kỳ câu hỏi nào bị nhân bản (Zero Duplicate Insertion).
2. **Kiểm thử API Endpoint (`GET /api/v1/content/questions`)**:
   - Truy vấn danh sách: HTTP 200, phân trang mượt mà (trang 10, 20, 50, 100 câu).
   - Truy vấn lọc theo từng môn học (`subjectId`): Cả 9 môn học đều trả về dữ liệu chuẩn xác, đúng phân loại.
   - Endpoint thống kê (`/questions/statistics`): Thống kê chuẩn xác 16.831 câu hỏi (16.700 draft, 2 approved, 129 published).
3. **Kiểm thử tài nguyên hình ảnh**:
   - Có 722 câu hỏi chứa liên kết hình ảnh (`/uploads/vnhsge/...`).
   - Đã đối soát 1.217 file ảnh vật lý trong cả backend (`backend/src/StudyAI.Api/wwwroot/uploads/vnhsge/`) và frontend (`frontend/public/uploads/vnhsge/`). Không có liên kết ảnh bị gãy (Broken Image).
4. **Bộ kiểm thử tự động toàn dự án**:
   - Backend Unit Tests: **81 / 81 passed** (100%).
   - Backend Integration Tests: **127 / 127 passed** (100%).
   - Frontend Tests (`vitest`): **406 / 406 passed** (52 suites, 100%).

---

## 5. BẢO VỆ CƠ SỞ DỮ LIỆU CHÍNH (`StudyAIDb`)

- **Số câu hỏi trên `StudyAIDb`**: **ĐÚNG 14 CÂU HỎI GỐC** (Hoàn toàn không suy suyển).
- **Trạng thái kết nối**: Trong suốt quá trình diễn tập, toàn bộ lệnh kết nối đều được trỏ duy nhất vào `StudyAIDb_E2E`.
- **Bản sao lưu dự phòng (Disaster Recovery)**:
  - File sao lưu: `D:\TN\backups\StudyAIDb_Before_VNHSGE_Import.bak`.
  - Đã thực hiện `BACKUP DATABASE ... WITH CHECKSUM`.
  - Đã kiểm tra tính toàn vẹn bằng `RESTORE VERIFYONLY` (Kết quả: *The backup set on file 1 is valid*).
  - Đã diễn tập phục hồi thực tế trên database tạm `StudyAIDb_RestoreTest` và kiểm tra đủ 14 câu hỏi thành công.

---

## 6. XÁC MINH BẢN QUYỀN & CƠ CHẾ KIỂM SOÁT (COPYRIGHT GATE)

- **Cơ sở bản quyền nguồn dữ liệu VNHSGE**:
  - Dữ liệu nghiên cứu công bố theo bài báo arXiv:2305.12199 (*"VNHSGE: VietNamese High School Graduation Examination Dataset for Large Language Models"*, nhóm tác giả Đào Xuân Quy và cộng sự).
  - Khung giấy phép: Học thuật, phi thương mại (CC BY-NC-SA 4.0).
- **Cơ chế Copyright Gate tại STUDY_AI**:
  - Toàn bộ 16.679 câu hỏi nạp vào đều được gán:
    - `Status`: `"draft"` (Bản nháp — học sinh và giáo viên không thể nhìn thấy trong đề thi công khai).
    - `CopyrightStatus`: `"pending_verification"` (Chờ xác thực bản quyền).
    - `CopyrightProofRef`: `"CC-BY-NC-SA-4.0 (arXiv:2305.12199 - Server Controlled License)"`.
    - `SourceType`: `"vnhsge"`.
  - Cổng kiểm soát bản quyền **không bị vượt qua (bypassed)**: Chỉ có Content Specialist / Quản trị viên mới có thẩm quyền xem xét, thẩm định và phê duyệt từng đề/câu trước khi chuyển sang trạng thái `"published"`.

---

## 7. KẾ HOẠCH TRIỂN KHAI NẠP PRODUCTION VÀO `StudyAIDb` (SINGLE DATABASE)

Khi nhận được **lệnh phê duyệt ghi dữ liệu chính thức**, quy trình triển khai sẽ tuân thủ nghiêm ngặt 5 bước an toàn:

```
[Bước 1: Backup Snapshot]
  └── Backup StudyAIDb sang file D:\TN\backups\StudyAIDb_PreProduction_Import.bak (Checksum + Verify)

[Bước 2: Production Seeding 9 Môn học]
  └── Đảm bảo 9 môn học chuẩn THPT 12 tồn tại trên StudyAIDb (Idempotent Upsert)

[Bước 3: Nạp theo 69 Batch với Checkpoint bền vững]
  └── Batch size = 250 câu. Ghi nhận checkpoint sau mỗi batch.
  └── Tự động đối soát trùng lặp với 14 câu gốc.

[Bước 4: Đối soát 3 tầng (SQL -> API -> Frontend)]
  └── Tầng SQL: Đếm số lượng = 14 + 16.679 = 16.693 câu.
  └── Tầng API: Gọi GET /api/v1/content/questions kiểm tra phân trang & 9 môn học.
  └── Tầng Frontend: Kiểm tra giao diện Ngân hàng câu hỏi của Content Specialist.

[Bước 5: Kế hoạch Rollback (Nếu có sự cố bất khả kháng)]
  └── Chạy lệnh khôi phục từ bản backup snapshot ngay lập tức nếu có bất kỳ lỗi không đồng nhất nào.
```

