# BÁO CÁO KHẢO SÁT TOÀN DIỆN NGUỒN DỮ LIỆU VNHSGE (SOURCE AUDIT)

**Nhiệm vụ:** Hoàn thiện Question Bank & Import dữ liệu VNHSGE hợp lệ  
**Ngày thực hiện:** 2026-11-13T06:57:59.075Z  
**Kho dữ liệu nguồn:** [https://github.com/Xdao85/VNHSGE](https://github.com/Xdao85/VNHSGE) (Dataset: `Dataset/VNHSGE-V`)

---

## 1. TỔNG QUAN NGUỒN DỮ LIỆU THỰC TẾ

| Tiêu chí | Kết quả kiểm tra trực tiếp từ tệp JSON | Ghi chú kỹ thuật |
| :--- | :--- | :--- |
| **Tổng số tệp JSON khảo sát** | **406** tệp | Khảo sát 100% trong `Dataset/VNHSGE-V/JSON format/` |
| **Tổng số bản ghi nguồn thực tế** | **17054** câu hỏi | Đếm trực tiếp từ JSON, không suy đoán |
| **Số câu hỏi trắc nghiệm (MCQ)** | **16898** câu | Đã tách đủ các phương án A, B, C, D |
| **Số bài tự luận (Essay)** | **30** bài | Môn Ngữ văn (Đọc hiểu & Làm văn) |
| **Dạng khác (Cần xử lý đặc thù)** | **126** câu | Câu hỏi không tách được chuẩn phương án |
| **Tổng số môn học có dữ liệu** | **9** môn | Toán, Lý, Hóa, Sinh, Văn, Anh, Sử, Địa, GDCD |
| **Số bản ghi có đáp án chuẩn** | **17042** câu (99.93%) | Đáp án A/B/C/D hoặc barem bài văn |
| **Số bản ghi thiếu đáp án** | **12** câu | Các câu bị khuyết trường Choice/Đáp án |
| **Số bản ghi có lời giải chi tiết** | **15887** câu (93.16%) | Lời giải kèm biểu thức KaTeX |
| **Số câu có hình ảnh đính kèm** | **726** câu hỏi / **434** lời giải | Hình ảnh đồ thị, sơ đồ mạch điện, bảng |
| **Số câu hỏi trùng lặp nội dung** | **141** câu | Trùng lặp giữa các năm hoặc mã đề thi thử |
| **Số câu hỏi độc bản (Unique)** | **16913** câu | Tập câu hỏi phân biệt hoàn toàn |

---

## 2. THỐNG KÊ CHI TIẾT THEO MÔN HỌC (SUBJECTS)

| Môn học (Thư mục nguồn) | Mã môn STUDY_AI | Tổng số câu | Trắc nghiệm | Tự luận | Có lời giải | Có hình ảnh |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Biology** | `BIOL12` | **1990** | 1990 | 0 | Có | Đồ thị/sơ đồ |
| **Chemistry** | `CHEM12` | **1987** | 1987 | 0 | Có | Đồ thị/sơ đồ |
| **CivicEducation** | `CIVI12` | **1997** | 1997 | 0 | Có | Đồ thị/sơ đồ |
| **English** | `ENGL12` | **2500** | 2500 | 0 | Có | Đồ thị/sơ đồ |
| **Geography** | `GEOG12` | **2000** | 2000 | 0 | Có | Đồ thị/sơ đồ |
| **History** | `HIST12` | **2000** | 2000 | 0 | Có | Đồ thị/sơ đồ |
| **Literature** | `LITE12` | **30** | 0 | 30 | Có | Đồ thị/sơ đồ |
| **Mathematics** | `MATH12` | **2550** | 2550 | 0 | Có | Đồ thị/sơ đồ |
| **Physics** | `PHYS12` | **2000** | 2000 | 0 | Có | Đồ thị/sơ đồ |

---

## 3. THỐNG KÊ THEO TẬP DỮ LIỆU (SPLIT: EVAL / TEST / TRAIN)

| Phân vùng (Split) | Số bản ghi | Mục đích sử dụng trong STUDY_AI |
| :--- | :--- | :--- |
| **eval** | **1730** câu | Đề thi chính thức của Bộ Giáo dục & Đào tạo (2019–2023) |
| **test** | **1697** câu | Đề thi chuẩn hóa đối chiếu mô hình |
| **train** | **13627** câu | Đề thi thử các trường chuyên và nguồn bổ trợ |
| **Tổng cộng** | **17054** câu | Toàn bộ kho đề thi có sẵn |

---

## 4. PHÂN TÍCH BẢN QUYỀN VÀ GIẤY PHÉP SỬ DỤNG (LICENSING & ORIGIN)

1. **Bản quyền tác giả & Kho nghiên cứu**:
   - Tác giả: Xuan-Quy Dao et al.
   - Bài báo công bố: *Evaluating Large Language Models on Vietnamese High School Graduation Examination* (arXiv:2305.12199).
   - Giấy phép học thuật ArXiv: `CC BY-NC-SA 4.0` (Chia sẻ phi thương mại có ghi công).
   - Repository GitHub không chứa tệp `LICENSE` thương mại riêng biệt.
2. **Quy tắc phân định giấy phép**:
   - **Mã nguồn hệ thống**: Giấy phép phần mềm của dự án STUDY_AI độc lập hoàn toàn với dữ liệu.
   - **Dữ liệu đề thi**: Đề thi tốt nghiệp THPT do Bộ Giáo dục & Đào tạo Việt Nam ban hành mang tính chất tài liệu khảo thí công; các đề thi thử do trường học và nhà xuất bản biên soạn.
3. **Quy tắc ứng xử và bảo vệ hệ thống**:
   - Dữ liệu VNHSGE chỉ được phép nhập vào môi trường kiểm thử độc lập (`StudyAIDb_E2E`).
   - Dữ liệu nhập vào lưu ở trạng thái `status = "draft"` và `copyrightStatus = "pending_verification"`.
   - Cấm tự động xuất bản (`published`) câu hỏi VNHSGE cho học viên làm bài thi khi chưa có chứng thực pháp lý từ phía máy chủ (`Server-Side License Verification`).
