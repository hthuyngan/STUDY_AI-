# MATH12 QUESTION BANK REPORT (R09-07 & R09-08)

> **Dataset Version:** `2.0.0` (`backend/data/math12/questions/math12_questions.json`)
> **Validation Manifest:** [validation_manifest.json](file:///D:/TN-math12-content/backend/data/math12/validation_manifest.json) (`112/112 AUTO_CHECK_PASSED`, `0` dangling references, `0` KaTeX issues)
> **Lưu ý bản quyền:** `2.544` câu `vnhsge` trong `StudyAIDb` giữ nguyên trạng thái `draft` / `LICENSE_BLOCKED`, không tính vào ngân hàng câu hỏi chính thức.

## 1. Thống kê theo chương & định dạng (`112` câu hỏi nguyên bản đã kiểm chứng)

| Chương | `multiple-choice` | `true-false-group` (4 ý/câu) | `short-answer` | Tổng câu hợp lệ | Trạng thái kiểm chứng |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `chp_math12_c1` (Đạo hàm & Đồ thị) | 16 | 2 | 9 | **27** | `27/27 AUTO_CHECK_PASSED` (SymPy 1.14.0) |
| `chp_math12_c2` (Vectơ & Tọa độ) | 12 | 2 | 9 | **23** | `23/23 AUTO_CHECK_PASSED` (SymPy 1.14.0) |
| `chp_math12_c3` (Thống kê ghép nhóm) | 8 | 2 | 3 | **13** | `13/13 AUTO_CHECK_PASSED` (SymPy 1.14.0) |
| `chp_math12_c4` (Nguyên hàm & Tích phân) | 6 | 2 | 9 | **17** | `17/17 AUTO_CHECK_PASSED` (SymPy 1.14.0) |
| `chp_math12_c5` (Oxyz Mặt phẳng/Đường/Cầu) | 14 | 2 | 3 | **19** | `19/19 AUTO_CHECK_PASSED` (SymPy 1.14.0) |
| `chp_math12_c6` (Xác suất có điều kiện) | 4 | 2 | 7 | **13** | `13/13 AUTO_CHECK_PASSED` (SymPy 1.14.0) |
| **Tổng cộng (`SRC-STUDYAI-ORIG-2026`)** | **60** | **12** | **40** | **112** | **`112/112 AUTO_CHECK_PASSED`** |

## 2. Semantic Deduplication (`R09-08`) & Khoảng trống mục tiêu 1.200 câu
- Các câu hỏi mở rộng cùng dạng toán được gắn `familyId` (`fam_c1_cubic_extrema`, `fam_c1_minmax_interval`, `fam_c2_dot_product`, `fam_c2_norm_sq`, `fam_c3_grouped_mean`, `fam_c4_poly_integral`, `fam_c5_sphere_radius`, `fam_c6_cond_prob`) để tránh xếp trùng dạng vào cùng một đề kiểm tra.
- Đã xử lý `q_m12_c3_06` (tự chứa dữ kiện) và `q_m12_c2_10` (đổi vectơ `(2;-3;6)` để không trùng phép tính với `q_m12_c2_05`).
- **Khoảng trống còn lại so với mục tiêu định hướng `1.200` câu:** Còn thiếu **`1.088` câu** (`540` MC, `288` T/F-group, `260` short-answer) cần tiếp tục mở rộng ở các đợt biên soạn tiếp theo mà không hạ chuẩn kiểm chứng SymPy.
