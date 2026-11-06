# STUDY_AI — Phase 10: Learning Content & Interactive Learning Experience

## 1. Mục tiêu & Bối cảnh

- **Workspace**: `D:\TN`
- **Frontend Stack**: React 19, TypeScript, Vite, Bun, KaTeX, Lucide Icons
- **Thiết kế**: Navy Notebook (`#102A43`, `#F4B942`, `#FFF9EA`, `#F0F4F8`)
- **Chương trình**: GDPT 2018, Toán 12 (Tập 1, Sách Kết nối tri thức với cuộc sống), Chương 1: "Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số".
- **Phạm vi hoàn thiện**:
  1. Chuẩn hóa & công nghệ hiển thị Toán học: KaTeX display & inline typography.
  2. Bảng biến thiên sư phạm tương tác (`VariationTable`) với mũi tên biến thiên trực quan, vạch kép gián đoạn, và điểm nối trợ lý AI Tutor.
  3. Đồ thị toán học chính xác toán học (`FunctionGraph`) vẽ vector SVG (hệ trục $Oxy$, lưới mờ tọa độ, đường cong hàm số, cực trị, tâm đối xứng, tiệm cận đứng & tiệm cận ngang).
  4. Trải nghiệm học tập trên `LessonPage`: Mục lục bài học, thanh tiến độ học tập, lưu/khôi phục vị trí học gần nhất, liên kết bài thu hoạch (Assessment).
  5. Mục Bẫy đề thi & Lỗi sai thường gặp (`CommonMistakesBlock`) cho học sinh luyện thi tốt nghiệp THPT.
  6. AI Tutor theo ngữ cảnh: Nút "Hỏi AI" tại từng khối (công thức, ví dụ mẫu, bảng biến thiên, đồ thị, bẫy đề thi) snapshot chính xác `lessonId`, `sectionId`, `excerpt` mà **tuyệt đối không làm thay đổi tiến độ học tập** khi chỉ mở trao đổi với AI.

---

## 2. Các thành phần & Dữ liệu cốt lõi đã triển khai

### A. Công nghệ hiển thị Toán học
- **`MathView.tsx` & `MathView.css`**:
  - Hỗ trợ KaTeX `displayMode: true` cho công thức dòng riêng và `inline: true` cho công thức inline.
  - Hỗ trợ cuộn ngang mượt mà trên mobile khi công thức dài, chống tràn layout.
  - Tích hợp phông chữ toán học chuẩn KaTeX đi kèm build production.

### B. Bảng biến thiên sư phạm (`VariationTable.tsx`)
- Chuẩn mực 3 hàng kinh điển: $x$, $y'$, $y$.
- Cột mốc phân bổ chính xác $-\infty$, các điểm nghiệm $x_1, x_2$, và $+\infty$.
- Ký hiệu dấu $y'$ ($+$, $-$, $0$, vạch kép gián đoạn $\|$).
- Dòng biến thiên $y$ hiển thị các mũi tên tăng/giảm ($\nearrow$, $\searrow$) tương ứng với cực đại, cực tiểu.
- Tích hợp nút hành động: "Phân tích BBT với AI Tutor".

### C. Đồ thị Toán học SVG (`FunctionGraph.tsx`)
- Không dùng hình ảnh giả lập AI mờ nhạt hay tải chậm từ CDN: Thuật toán nội suy đường cong SVG trực tiếp từ hàm toán học thực tế ($x \in [x_{\min}, x_{\max}]$).
- Hệ trục tọa độ $Oxy$ có mũi tên, vạch chia số nguyên và gốc $O(0, 0)$.
- Hiển thị tiệm cận đứng ($x = -1$) và tiệm cận ngang ($y = 2$) bằng nét đứt nét `stroke-dasharray` nổi bật.
- Đánh dấu các điểm cực trị (Cực đại, Cực tiểu) và tâm đối xứng bằng vòng tròn SVG có nhãn KaTeX toạ độ rõ ràng.
- Nút tương tác: "Phân tích đồ thị với AI".

### D. Nội dung Toán 12 Chương 1 (SGK Kết nối tri thức)
1. **Bài 1: Tính đơn điệu và cực trị của hàm số (`lesson-math-12-01`)**
   - 3 định nghĩa & định lý: Định lý mở rộng về tính đơn điệu, điều kiện cần và đủ của cực trị, quy tắc 1 & quy tắc 2.
   - 3 công thức trọng tâm: $f'(x) \ge 0$, dấu hiệu $f'(x_0) = 0$ đổi dấu, $f''(x_0)$.
   - Bảng biến thiên của hàm bậc ba $y = x^3 - 3x^2 + 2$.
   - 3 lỗi sai phổ biến kèm cách khắc phục (ví dụ: dùng ký hiệu $\cup$ cho khoảng đồng biến, ngộ nhận $f'(x_0) = 0$ là cực trị).
2. **Bài 2: Giá trị lớn nhất và giá trị nhỏ nhất của hàm số (`lesson-math-12-02`)**
   - Định lý Weierstrass trên đoạn $[a; b]$.
   - Thuật toán tìm max/min trên đoạn không cần lập bảng biến thiên.
   - Bảng biến thiên tìm max/min trên khoảng $(0; +\infty)$ của hàm $y = x + \frac{4}{x}$.
   - 3 bẫy đề thi về biên khoảng và nhầm lẫn giữa cực trị với GTLN/GTNN.
3. **Bài 3: Khảo sát sự biến thiên và vẽ đồ thị của hàm số (`lesson-math-12-03`)**
   - Sơ đồ 3 bước chuẩn SGK: 1. Tập xác định & đạo hàm; 2. Chiều biến thiên & tiệm cận; 3. Bảng biến thiên & Đồ thị.
   - Khảo sát & Đồ thị SVG hàm số bậc ba: $y = -x^3 + 3x - 1$.
   - Khảo sát & Đồ thị SVG hàm phân thức bậc nhất / bậc nhất: $y = \frac{2x - 1}{x + 1}$ với 2 đường tiệm cận $x = -1$ và $y = 2$.
   - Bẫy đề thi về tâm đối xứng và giao điểm trục tung/trục hoành.

---

## 3. Kiểm thử & Đảm bảo chất lượng

- **Linter (oxlint)**:
  - Lệnh: `bun run lint`
  - Kết quả: `Found 0 warnings and 0 errors` trên toàn bộ 352 files.
- **Unit & Integration Tests (Vitest)**:
  - Lệnh: `bun run test`
  - Kết quả: **40 test files passed (100%), 291 unit tests passed**.
  - Kiểm thử chuyên sâu `InteractiveLearning.test.tsx` (11 tests) xác nhận:
    * MathView render đầy đủ KaTeX inline và display.
    * VariationTable render 3 dòng $x, y', y$ chuẩn xác.
    * FunctionGraph render SVG paths, điểm cực trị và tiệm cận.
    * Cả 3 bài học đều sở hữu đầy đủ định nghĩa, công thức, ví dụ, BBT, đồ thị SVG, bẫy đề thi và skill codes chuẩn GDPT 2018.
    * Invariant bảo toàn tiến độ học tập: Hỏi AI không ghi đè tiến độ học tập.
- **Production Build**:
  - Lệnh: `bun run build` (`tsc -b && vite build`)
  - Kết quả: **Thành công trong 1.91s**, tạo gói tài nguyên production hoàn chỉnh có font KaTeX và bundle tối ưu.
- **Playwright Visual QA**:
  - Script: `scripts/capture_phase10_evidence.ts`
  - Bằng chứng đã ghi nhận tại `docs/visual-qa/phase-10/`:
    * `lesson1_monotony_desktop.png` (865 KB)
    * `lesson2_minmax_desktop.png` (706 KB)
    * `lesson3_graphs_desktop.png` (896 KB)
    * `variation_table_closeup.png` (31 KB)
    * `function_graph_closeup.png` (51 KB)
    * `lesson3_mobile_390px.png` (720 KB)
