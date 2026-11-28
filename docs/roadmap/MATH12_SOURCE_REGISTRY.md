# MATH12 SOURCE REGISTRY (DATA-03)

> **Cập nhật:** 2026-11-28 (Round 08 — V8.0 Autonomous Math 12 Data Engineering)
> **Mục tiêu:** Ghi nhận nguồn học liệu chính thống, giấy phép, phạm vi sử dụng và trạng thái kiểm định cho môn Toán lớp 12 (GDPT 2018 — Kết nối tri thức với cuộc sống).

## 1. Nguồn chương trình và chuẩn kiến thức (Curriculum Standards)

| Source ID | Tên nguồn | Loại nguồn | Phạm vi sử dụng | Giấy phép / Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `SRC-GDPT2018` | Chương trình Giáo dục phổ thông môn Toán 2018 (Bộ GD&ĐT) | Văn bản pháp quy / Chuẩn đầu ra | Cấu trúc 6 chương, mục tiêu năng lực, yêu cầu cần đạt Toán 12 | `PUBLIC_REGULATION` — Được phép tham chiếu cấu trúc & yêu cầu cần đạt |
| `SRC-KNTT-TOC` | Mục lục SGK Toán 12 Kết nối tri thức với cuộc sống (Tập 1 & Tập 2) | Đối chiếu tên bài & thứ tự 19 bài | Mapping `chp_math12_c1..c6` và 19 bài học (`Bài 1`..`Bài 19`) | `STRUCTURE_REFERENCE_ONLY` — Chỉ tham chiếu tên chương/bài, **không sao chép văn bản SGK** |
| `SRC-BGD-2025` | Đề minh họa & cấu trúc đề thi TN THPT môn Toán từ 2025 (Bộ GD&ĐT) | Cấu trúc định dạng 3 phần (12 TNKQ, 4 Đúng/Sai, 6 Trả lời ngắn) | Thiết kế ma trận đề thi & định dạng `multiple-choice`, `true-false-group`, `short-answer` | `PUBLIC_EXAM_FORMAT` — Tham chiếu ma trận & định dạng |

## 2. Nguồn nội dung biên soạn mới (Original Authored & Verified)

| Source ID | Tên nguồn | Tác giả / Kiểm định | Phạm vi sử dụng | Giấy phép / Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `SRC-STUDYAI-ORIG-2026` | Bộ học liệu Toán 12 nguyên bản STUDY_AI (`backend/data/math12/`) | Biên soạn mới hoàn toàn bởi Dual-Agent (Codex 6.1 High + Antigravity), kiểm chứng toán học bằng **SymPy 1.14.0** | 19 bài giảng (`lesson_content_blocks`), ngân hàng câu hỏi 3 định dạng, 6 đề kiểm tra chương + 2 đề tổng hợp, tài liệu ôn tập & AI Knowledge Base | `ORIGINAL_PROJECT_ASSET` (`MATH_VERIFIED`) — Được phép import & publish vào môi trường kiểm thử/học tập |

## 3. Nguồn dữ liệu cũ bị khóa bản quyền (Legacy Restricted)

| Source ID | Tên nguồn | Số lượng trong `StudyAIDb` | Trạng thái | Quyết định xử lý |
| :--- | :--- | :--- | :--- | :--- |
| `SRC-VNHSGE` | Bộ dữ liệu `vnhsge` (`scripts/vnhsge_prod_checkpoint.json`) | 2.544 câu Toán 12 (`draft`, `pending_verification`) | `LICENSE_BLOCKED` (`VNHSGE_COPYRIGHT_GATE_LOCKED`) | **GIỮ NGUYÊN `draft` / KHÔNG PUBLISH / KHÔNG XÓA**; không đưa vào luồng học viên chính thức hoặc RAG công khai |

## 4. Nguyên tắc liêm chính học liệu
1. Không sao chép nguyên văn đoạn văn, hình ảnh hoặc bài tập có bản quyền từ SGK/SBT thương mại.
2. Mọi biểu thức toán học, nghiệm, đạo hàm, tích phân, phương trình mặt phẳng/đường thẳng, xác suất có điều kiện trong `SRC-STUDYAI-ORIG-2026` đều có script kiểm chứng **SymPy 1.14.0** và kiểm định độc lập bởi Codex 6.1 High.
3. Mọi bản ghi trong `backend/data/math12/` đều gắn `sourceId` và `verificationStatus: "MATH_VERIFIED"`.
