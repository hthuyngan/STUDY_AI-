# STUDY_AI — BỘ BẰNG CHỨNG KIỂM CHỨNG THỊ GIÁC UI/UX (VISUAL QA EVIDENCE)

> **Dành cho ChatGPT & Đội ngũ Phát triển**: Tài liệu này lưu trữ đầy đủ bằng chứng kiểm chứng giao diện thực tế của toàn bộ hệ thống quản trị STUDY_AI từ môi trường Production thực tế. ChatGPT có thể truy cập trực tiếp các ảnh PNG thông qua GitHub mà không cần người dùng chụp ảnh hay gửi file thủ công.

---

## 1. THÔNG TIN HỆ THỐNG & PHIÊN BẢN

* **Môi trường thẩm định**: [GitHub Pages Production Live](https://hthuyngan.github.io/STUDY_AI-/)
* **Repository GitHub**: [https://github.com/hthuyngan/STUDY_AI-](https://github.com/hthuyngan/STUDY_AI-)
* **Mã commit giao diện (`sourceCommit`)**: [`7efb868`](https://github.com/hthuyngan/STUDY_AI-/commit/7efb868)
* **Thời gian chụp bằng chứng**: 30/10/2026
* **Hệ thống thiết kế**: Navy Notebook (`#102A43`, `#F4B942`, `#FFF9EA`) kết hợp chuẩn quản trị ZhongWenHub & evondevKit.
* **Báo cáo thẩm định chi tiết**: [Xem Báo cáo UI/UX Audit đầy đủ](reports/UI_UX_VISUAL_AUDIT.md)
* **Chỉ mục dữ liệu JSON**: [manifest.json](manifest.json) (Chứa thông số kỹ thuật 119 bản ghi ảnh)

---

## 2. ẢNH TỔNG HỢP (CONTACT SHEETS / OVERVIEWS)

Dưới đây là các tấm ảnh tổng hợp độ phân giải cao, hiển thị trực quan toàn bộ các màn hình theo từng nhóm vai trò và kích thước thiết bị:

### 2.1. Admin Workspace

#### Desktop Viewport (1440 × 900 px)
![Admin Desktop](overviews/ADMIN_DESKTOP.png)

#### Mobile Viewport (390 × 844 px)
![Admin Mobile](overviews/ADMIN_MOBILE.png)

---

### 2.2. Teacher Workspace

#### Desktop Viewport (1440 × 900 px)
![Teacher Desktop](overviews/TEACHER_DESKTOP.png)

#### Mobile Viewport (390 × 844 px)
![Teacher Mobile](overviews/TEACHER_MOBILE.png)

---

### 2.3. Content Workspace

#### Desktop Viewport (1440 × 900 px)
![Content Desktop](overviews/CONTENT_DESKTOP.png)

#### Mobile Viewport (390 × 844 px)
![Content Mobile](overviews/CONTENT_MOBILE.png)

---

### 2.4. Support Workspace

#### Desktop Viewport (1440 × 900 px)
![Support Desktop](overviews/SUPPORT_DESKTOP.png)

#### Mobile Viewport (390 × 844 px)
![Support Mobile](overviews/SUPPORT_MOBILE.png)

---

### 2.5. Trạng thái Tương tác Động (Interactions)
![Interactions](overviews/INTERACTIONS.png)

---

### 2.6. So sánh với Hình mẫu Kiến trúc ZhongWenHub
![ZhongWenHub Comparison](overviews/ZHONGWENHUB_COMPARISON.png)

---

### 2.7. Nghiệm thu Modal "Thêm giáo viên mới" (Create Teacher Modal QA)

So sánh trước và sau khi tái cấu trúc bố cục CSS Grid, chuẩn hóa label, input, select và textarea:

#### Trước khi sửa (Modal vỡ bố cục, label dính input, lệch cột)
![Before Fix](interactions/admin_add_teacher_before.png)

#### Sau khi sửa — Desktop Viewport (1440 × 900 px)
![After Desktop](interactions/admin_add_teacher_after_desktop.png)

#### Sau khi sửa — Tablet Viewport (768 × 1024 px)
![After Tablet](interactions/admin_add_teacher_after_tablet.png)

#### Sau khi sửa — Mobile Viewport (390 × 844 px)
![After Mobile](interactions/admin_add_teacher_after_mobile.png)

#### Trạng thái Báo lỗi Form Validation
![Validation Error](interactions/admin_add_teacher_validation.png)

---

### 2.8. Nghiệm thu Phase 5: Personalized Learning Path & Study Notes

Bằng chứng kiểm chứng thực tế cho 5 năng lực học tập cốt lõi của Phase 5:

#### Dashboard với Thẻ Tiếp tục học & Vị trí Section đang dở
![Dashboard Phase 5](screenshots/learner_dashboard_phase5_desktop.png)

#### Lộ trình học tập tuần tự theo môn & Khuyến nghị bài nên học tiếp
![Learning Path Phase 5](screenshots/learner_learning_path_phase5_desktop.png)

#### Bảng Ghi chú và Đoạn lưu bài học (Lesson Notes Panel) trên Desktop
![Lesson Notes Panel](interactions/learner_lesson_notes_panel_desktop.png)

#### Khôi phục vị trí Section Anchor và Hiệu ứng Flash Highlight
![Section Anchoring](interactions/learner_lesson_section_anchoring_desktop.png)

#### Sổ tay ghi chú trung tâm (My Study Notebook - /my-notes)
![My Notes Desktop](screenshots/learner_my_notes_page_desktop.png)

#### Tab Đoạn kiến thức đã lưu trong Sổ tay
![My Notes Bookmarks](interactions/learner_my_notes_bookmarks_desktop.png)

#### Giao diện Sổ tay trên Mobile Viewport (390 × 844 px)
![My Notes Mobile](screenshots/learner_my_notes_mobile_390.png)

---

### 2.9. Nghiệm thu Phase 6: Smart Review & Knowledge Gaps

Bằng chứng kiểm chứng thực tế cho hệ thống Ôn tập ngắt quãng Spaced Repetition và Sổ tay kiến thức cần củng cố của Phase 6:

#### Sổ tay kiến thức cần củng cố (/knowledge-gaps) trên Desktop (1440 × 900 px)
![Knowledge Gaps Desktop](screenshots/learner_knowledge_gaps_desktop.png)

#### Sổ tay kiến thức cần củng cố trên Mobile (390 × 844 px)
![Knowledge Gaps Mobile](screenshots/learner_knowledge_gaps_mobile_390.png)

#### Trung tâm Ôn tập thông minh ngắt quãng (/review) trên Desktop
![Smart Review Home](screenshots/learner_smart_review_home_desktop.png)

#### Thẻ Flashcard ôn tập chủ động (Active Session Card)
![Smart Review Session](interactions/learner_smart_review_session_desktop.png)

#### Thẻ sau khi lật hiển thị lời giải và 3 nút tự đánh giá Spaced Repetition
![Smart Review Revealed](interactions/learner_smart_review_revealed_desktop.png)

#### Màn hình chúc mừng hoàn thành phiên ôn tập với thống kê XP và chu kỳ
![Smart Review Completed](interactions/learner_smart_review_completed_desktop.png)

#### Widget "Cần ôn hôm nay" tích hợp trên Dashboard học viên (/dashboard)
![Dashboard Review Widget](screenshots/learner_dashboard_review_widget_desktop.png)

#### Điều hướng từ Sổ tay kiến thức yếu quay lại đúng Section trong bài giảng
![Gap to Lesson Anchor](interactions/learner_gap_to_lesson_anchor_desktop.png)

#### Bằng chứng kiểm chứng trực tiếp trên Live Production (Commit 35cbdb5):
- **Kết quả bài thu hoạch kích hoạt Knowledge Gaps**: ![Prod Assessment](interactions/prod_phase6_assessment_gap_created.png)
- **Sổ tay kiến thức cần củng cố thực tế trên Production (Desktop 1440px)**: ![Prod Knowledge Gaps](screenshots/prod_phase6_knowledge_gaps_desktop.png)
- **Sổ tay kiến thức trên Production (Mobile 390px)**: ![Prod Knowledge Gaps Mobile](screenshots/prod_phase6_knowledge_gaps_mobile.png)
- **Trung tâm Ôn tập Spaced Repetition trên Production**: ![Prod Smart Review](screenshots/prod_phase6_smart_review_desktop.png)
- **Thẻ ôn tập thực tế trên Production**: ![Prod Review Session](interactions/prod_phase6_smart_review_session.png)
- **Màn hình chúc mừng hoàn thành phiên ôn tập trên Production**: ![Prod Completed](interactions/prod_phase6_smart_review_completed.png)
- **Dashboard Widget "Cần ôn hôm nay" trên Production**: ![Prod Dashboard](screenshots/prod_phase6_dashboard_desktop.png)

---

### 2.10. Nghiệm thu Phase 7: Learning Analytics & Student Competency Profile

Bằng chứng kiểm chứng thực tế cho hệ thống Phân tích học tập & Hồ sơ năng lực học sinh của Phase 7:

#### 1. Tổng quan Phân tích học tập (/learning-analytics) trên Desktop (1440 × 900 px)
Hiển thị 5 chỉ số KPI đo lường thực tế, biểu đồ hoạt động học tập 7 ngày, danh sách bài thu hoạch gần nhất và khối gợi ý hành động sư phạm:
![Learner Analytics Overview](screenshots/learner_analytics_overview_desktop.png)

#### 2. Hồ sơ năng lực học sinh (Competency Profile) trên Desktop (1440 × 900 px)
Phân loại năng lực theo 4 mức độ (`mastered`, `reinforcing`, `needs-review`, `insufficient-data`) kèm banner sư phạm minh bạch (hoàn thành bài học không tương đương với làm chủ kiến thức):
![Learner Analytics Competency](screenshots/learner_analytics_competency_desktop.png)

#### 3. Phân tích theo 4 bộ môn Toán, Lý, Hóa, Tiếng Anh trên Desktop (1440 × 900 px)
Theo dõi tiến độ chuẩn hóa 80/100%, điểm trung bình thu hoạch, số lỗ hổng kiến thức còn tồn đọng và định hướng ôn tập:
![Learner Analytics Subjects](screenshots/learner_analytics_subjects_desktop.png)

#### 4. Dòng thời gian lịch sử học tập (Learning History Timeline) trên Desktop (1440 × 900 px)
Tổng hợp các mốc sự kiện học tập thực chất (làm bài thu hoạch, phiên ôn tập Spaced Repetition, phát hiện lỗ hổng, hoàn thành nội dung):
![Learner Analytics History](screenshots/learner_analytics_history_desktop.png)

#### 5. Giao diện Phân tích học tập trên Mobile Viewport (390 × 844 px)
Tối ưu phản hồi cho thiết bị di động với tab vuốt ngang, thẻ KPI 2 cột và biểu đồ co giãn mượt mà:
![Learner Analytics Mobile](screenshots/learner_analytics_mobile_390.png)

#### 6. Phân tích học sinh tích hợp trong Teacher Workspace (/teacher/students/:id)
Tab "Phân tích học tập" hiển thị chỉ số chuyên sâu cho giáo viên với nhãn minh bạch `[Dữ liệu mẫu]` trước khi có API backend:
![Teacher Student Analytics](screenshots/teacher_student_analytics_desktop.png)

#### 7. Nút truy cập nhanh từ Header của Learner Dashboard (/dashboard)
Entry point "Phân tích học tập" được đặt nổi bật, đồng bộ với phong cách Navy Notebook:
![Learner Dashboard Analytics Entry](interactions/learner_dashboard_analytics_entry_desktop.png)

#### 8. Bằng chứng kiểm chứng trực tiếp trên Live Production (Commit 1b13995):
- **Phân tích học tập trực tiếp trên Production (Desktop 1440px)**: ![Prod Analytics Overview](screenshots/prod_phase7_overview_desktop.png)
- **Hồ sơ năng lực thực tế trên Production (Desktop 1440px)**: ![Prod Competency](screenshots/prod_phase7_competency_desktop.png)
- **Phân tích 4 bộ môn thực tế trên Production (Desktop 1440px)**: ![Prod Subjects](screenshots/prod_phase7_subjects_desktop.png)
- **Dòng thời gian lịch sử học tập trên Production (Desktop 1440px)**: ![Prod History](screenshots/prod_phase7_history_desktop.png)
- **Phân tích học tập trên Production (Mobile 390px)**: ![Prod Mobile](screenshots/prod_phase7_mobile_390.png)
- **Phân tích học sinh trong Teacher Workspace trên Production**: ![Prod Teacher Analytics](screenshots/prod_phase7_teacher_analytics_desktop.png)

---

### 2.11. Nghiệm thu Phase 8: Contextual AI Tutor & Learning Assistance

Bằng chứng kiểm chứng thực tế cho hệ thống AI Tutor hỗ trợ học tập có ngữ cảnh của Phase 8:

#### 1. Điều hướng có ngữ cảnh từ Bài giảng sang AI Tutor (Desktop 1440 × 900 px)
Nút "Hỏi AI về mục này" tích hợp cạnh từng mục bài giảng, mở AI Tutor kèm ngữ cảnh nguồn chính xác và trích đoạn tối đa 250 ký tự:
![Lesson to AI Tutor Desktop](interactions/learner_lesson_to_ai_tutor_desktop.png)

#### 2. AI Tutor tiếp nhận ngữ cảnh với Contextual Header Badge (Desktop 1440 × 900 px)
Badge nổi bật màu Navy/Vàng cát hiển thị nguồn, đường dẫn bài học, trích đoạn bài học và 2 nút "Quay lại vị trí học" cùng "Bỏ ngữ cảnh":
![AI Tutor Lesson Context](screenshots/learner_ai_tutor_lesson_context_desktop.png)

#### 3. AI Tutor phản hồi hiển thị KaTeX LaTeX & Bảng Markdown (Desktop 1440 × 900 px)
Render công thức toán học chuẩn xác với KaTeX ($$...$$ và $...$), bảng markdown, code block và nhãn mô phỏng minh bạch `[Bản mô phỏng AI Tutor · Trải nghiệm học tập có ngữ cảnh]`:
![AI Tutor KaTeX Response](screenshots/learner_ai_tutor_latex_response_desktop.png)

#### 4. Chế độ Hỗ trợ Sư phạm: Gợi ý tư duy (Hint Mode)
AI Tutor đóng vai trò người gợi mở, đặt câu hỏi định hướng thay vì giải bài hộ:
![AI Tutor Hint Mode](screenshots/learner_ai_tutor_hint_mode_desktop.png)

#### 5. Chế độ Hỗ trợ Sư phạm: Từng bước giải (Step-by-Step Mode)
Phân rã vấn đề theo từng bước logic chặt chẽ kèm công thức toán KaTeX:
![AI Tutor Step by Step Mode](screenshots/learner_ai_tutor_step_by_step_desktop.png)

#### 6. Quản lý Lịch sử Hội thoại & Phân loại Phiên (Desktop 1440 × 900 px)
Hỗ trợ lưu trữ scoped localStorage, hiển thị nhãn môn học, ngữ cảnh đã lưu và snapshot ngữ cảnh bất biến theo tin nhắn:
![AI Tutor Conversation History](screenshots/learner_ai_tutor_conversation_history_desktop.png)

#### 7. Chuyển đổi linh hoạt sang Hỏi chung / Chat tự do (Desktop 1440 × 900 px)
Khi bỏ ngữ cảnh hoặc mở cuộc trò chuyện mới, AI Tutor chuyển sang chế độ trò chuyện chung với các gợi ý học tập hữu ích:
![AI Tutor General Chat](screenshots/learner_ai_tutor_general_chat_desktop.png)

#### 8. AI Tutor trên Mobile Viewport (390 × 844 px)
Giao diện co giãn chuẩn xác, composer và badge hiển thị gọn gàng trên thiết bị di động:
![AI Tutor Mobile](screenshots/learner_ai_tutor_mobile_390.png)

#### 9. Kiểm thử Cuộn ngang Khối công thức KaTeX trên Mobile (390 × 844 px)
Công thức toán dài cuộn ngang độc lập mượt mà (`overflow-x: auto`), không làm tràn màn hình hay vỡ layout viewport:
![AI Tutor Long Equation Mobile](screenshots/learner_ai_tutor_long_equation_mobile_390.png)

#### 10. Điều hướng có ngữ cảnh từ Sổ tay lỗ hổng kiến thức sang AI Tutor
Nút "Nhờ AI giải thích" từ Knowledge Gap mở AI Tutor kèm ngữ cảnh lỗ hổng kiến thức và câu hỏi liên quan:
![Gap to AI Tutor](interactions/learner_gap_to_ai_tutor_desktop.png)

#### 11. Điều hướng có ngữ cảnh từ Ghi chú bài học sang AI Tutor
Nút "Hỏi AI" từ Ghi chú cá nhân mở AI Tutor để thảo luận sâu hơn về nội dung đã ghi chú:
![Note to AI Tutor](interactions/learner_note_to_ai_tutor_desktop.png)

#### 12. Bằng chứng kiểm chứng trực tiếp trên Live Production (Commit 7472649):
- **Nút Hỏi AI trong bài giảng trên Production (Desktop 1440px)**: ![Prod Lesson Ask AI](screenshots/prod_phase8_lesson_ask_ai_desktop.png)
- **AI Tutor tiếp nhận ngữ cảnh bài giảng trên Production**: ![Prod Context](screenshots/prod_phase8_ai_tutor_context_desktop.png)
- **Công thức KaTeX LaTeX & Bảng Markdown trên Production**: ![Prod KaTeX](screenshots/prod_phase8_ai_tutor_katex_desktop.png)
- **Bộ chọn 5 chế độ hỗ trợ sư phạm trên Production**: ![Prod Modes](screenshots/prod_phase8_ai_tutor_modes_desktop.png)
- **AI Tutor trên thiết bị di động (Mobile 390px) trên Production**: ![Prod Mobile](screenshots/prod_phase8_ai_tutor_mobile_390.png)
- **Hỏi AI từ Ghi chú cá nhân trên Production**: ![Prod Notes Ask AI](interactions/prod_phase8_notes_ask_ai_desktop.png)

---

## 3. CẤU TRÚC THƯ MỤC VÀ LIÊN KẾT ẢNH GỐC

```text
docs/visual-qa/
├── README.md                              # Tài liệu mục lục & hiển thị ảnh inline (file này)
├── manifest.json                          # Metadata kỹ thuật cho 119 ảnh (route, viewport, status, timestamp)
├── reports/
│   └── UI_UX_VISUAL_AUDIT.md              # Báo cáo đánh giá chi tiết 12 tiêu chí UI/UX bằng tiếng Việt
├── overviews/                             # 10 tấm ảnh tổng hợp contact sheets
│   ├── ADMIN_DESKTOP.png
│   ├── ADMIN_MOBILE.png
│   ├── TEACHER_DESKTOP.png
│   ├── TEACHER_MOBILE.png
│   ├── CONTENT_DESKTOP.png
│   ├── CONTENT_MOBILE.png
│   ├── SUPPORT_DESKTOP.png
│   ├── SUPPORT_MOBILE.png
│   ├── INTERACTIONS.png
│   └── ZHONGWENHUB_COMPARISON.png
├── interactions/                          # Ảnh chụp các trạng thái động (Drawer, Modal, Filter)
│   ├── admin_teachers_drawer_open.png
│   ├── admin_teachers_create_modal.png
│   ├── admin_users_filter_active.png
│   ├── content_assessment_preview_modal.png
│   └── support_tickets_filter_active.png
└── screenshots/                           # 104 ảnh chụp fullpage các route đơn lẻ
    ├── admin/                             # 32 ảnh Admin routes (Desktop, Mobile, Laptop, Tablet)
    ├── teacher/                           # 28 ảnh Teacher routes
    ├── content/                           # 26 ảnh Content routes
    ├── support/                           # 16 ảnh Support routes
    └── reference/                         # 2 ảnh tham khảo gốc từ ZhongWenHub
```

---

## 4. HƯỚNG DẪN KIỂM CHỨNG DÀNH CHO CHATGPT

Khi thẩm định chất lượng UI/UX của STUDY_AI, ChatGPT có thể kiểm tra trực tiếp qua các bước sau:

1. **Xem tổng quan từng Workspace**: Bấm vào các ảnh trong mục **2. ẢNH TỔNG HỢP** bên trên để đánh giá bố cục chung, khoảng cách lề (spacing), dải KPI `SummaryStrip` và cách chuyển đổi sang thẻ Mobile Cards.
2. **Xem chi tiết trang đơn lẻ**: Duyệt vào thư mục [screenshots/](screenshots/) để mở ảnh fullpage của từng route cụ thể.
3. **Kiểm tra trạng thái Modal/Drawer**: Duyệt vào thư mục [interactions/](interactions/) để xác nhận rằng các modal (ví dụ: Assessment Preview Modal) được mở dạng dialog độc lập có backdrop, không bị rơi xuống dưới bảng.
4. **Kiểm tra đối chiếu chuẩn thiết kế**: Mở file [overviews/ZHONGWENHUB_COMPARISON.png](overviews/ZHONGWENHUB_COMPARISON.png) để so sánh trực quan với hình mẫu quản trị của ZhongWenHub.
5. **Đọc báo cáo kỹ thuật**: Mở file [reports/UI_UX_VISUAL_AUDIT.md](reports/UI_UX_VISUAL_AUDIT.md) để xem phân tích chi tiết theo 12 tiêu chí của evondevKit.
