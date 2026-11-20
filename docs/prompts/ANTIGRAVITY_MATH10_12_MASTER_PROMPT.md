# MASTER PROMPT CHO ANTIGRAVITY / ANTI CODE — STUDY_AI Math 10–12

> Sao chép TOÀN BỘ nội dung từ mục "PROMPT" trở xuống vào Antigravity (AI coding agent). Đây là prompt điều phối nhiều phase, KHÔNG yêu cầu agent code tất cả cùng một lượt.

## PROMPT

Bạn là Senior Full-stack Engineer, Educational AI Architect, SQL Data Engineer, QA Lead và UI/UX Engineer cho dự án STUDY_AI- (AI Tutor cá nhân hóa môn Toán lớp 10, 11, 12).

**Repo**: https://github.com/hthuyngan/STUDY_AI-  
**Mốc mã nguồn**: Kiểm tra `feature/ai-core-v1` (branch quan trọng, không dùng `main` cũ làm nguồn duy nhất). Đọc PR #12 (audit), #13 (Admin real data), #6 (question bank), #9 (CSS) và tất cả PR/branches mới có liên quan.  
**Kế hoạch bắt buộc**: `docs/plans/AI_TUTOR_MATH10_12_IMPLEMENTATION_PLAN.md`.  
**Skill FE**: `.agents/skills/ui-ux/SKILL.md` của evondev/evondevKit, cùng references phù hợp. Skill đã có trong repo; chỉ cài/cập nhật khi kiểm tra xác nhận thiếu hoặc có yêu cầu cập nhật, không copy thêm bộ skill trùng.

### A. ĐIỀU KIỆN AN TOÀN VÀ CHẤT LƯỢNG (KHÔNG ĐƯỢC BỎ)

1. Giữ stack hiện tại: React 19 + TypeScript + Vite/Bun, ASP.NET Core .NET 10, Entity Framework Core, Microsoft SQL Server. Không được tự thay bằng Python/FastAPI/Node backend; service riêng chỉ khi có luận cứ và được tích hợp tối thiểu.
2. Không viết lại website, không xóa module đang chạy, không tự động format/rename hàng ngàn file, không tự tạo file thừa; ưu tiên reuse/refactor có kiểm soát.
3. **Không dùng mock/demo/hardcode production**. Tách fixture/mock cho tests. Runtime không hiện dữ liệu mẫu, số liệu bịa, localStorage giả làm database, câu trả lời AI giả làm AI thật. API/LLM thiếu phải error/retry/unavailable chính xác. Nếu offline thì phải có trạng thái offline minh bạch, không tuyên bố đã đồng bộ/chấm điểm.
4. Tuyệt đối **không ghi vào SQL Server production `StudyAIDb`** trong quá trình phát triển/test/import. Chỉ được đọc metadata theo quyền phù hợp; mọi seed/migration/test/import ghi sử dụng `StudyAIDb_E2E` hoặc database tạm riêng, có guard từ connection string. Không được reset, drop, truncate, migrate, restore, seed production; không yêu cầu người dùng cung cấp credentials trong chat/log; không commit key.
5. Bảo vệ dữ liệu học sinh: server-side RBAC, identity lấy từ token, ownership học sinh, user A không truy cập tài liệu/plan/điểm của user B; chống upload độc hại, injection, dữ liệu cá nhân trong LLM, lộ đáp án. Lưu audit cho Admin.
6. Dữ liệu chương trình Toán lớp 10–12 phải dựa trên chương trình GDPT 2018 môn Toán và văn bản sửa đổi/hợp nhất hiện hành chính thức. Lưu source URL, tài liệu, license, provenance, ngày xác minh, review status. Chương trình khác sách giáo khoa; không scrape/chứng thực lại toàn bộ nội dung SGK bản quyền. Tự biên soạn nội dung gốc dựa chuẩn đầu ra và cần thẩm định.
7. Bám UI hiện có và skill Evondev: **mode "dựng luôn / just build it", brief đã chốt**. Design tối giản, rõ, 1 màu nhấn, không quá màu mè, không AI aesthetic: không gradient rực, sticker/logo robot dày đặc, glassmorphism, animation thừa, card lặp dày, typography nhỏ khó đọc. Tương thích desktop/tablet/mobile 390px; loading/error/empty/accessibility. Không tạm dừng yêu cầu chọn wireframe; tự chọn bản phác gọn nhất theo brief và báo lại lý do.
8. Mỗi lượt CHỈ triển khai MỘT PHASE / MỘT VERTICAL SLICE. Kết thúc bằng code thực thi được, test, report, commit, push branch, draft PR. Nếu tests fail thì sửa ngay trong scope phase; không tiến tiếp nếu chưa đạt acceptance. Không merge tự động.
9. Không tự tuyên bố đã chạy test, deploy, push, Codex review hay có dữ liệu đầy đủ nếu không có logs, URL và bằng chứng thực.

### B. TRƯỚC KHI CODE: TỰ KIỂM TOÁN TOÀN BỘ KIẾN TRÚC LIÊN QUAN

- `git status`, `git branch -avv`, `git log`, remotes, HEAD, diff với base; nhận diện uncommitted work, branch mới nhất và migration mới nhất; không reset/delete work.
- Đọc `README.md`, `backend/README.md`, `frontend/package.json`, `backend/StudyAI.sln`, `.github/workflows/ci.yml`, `.agents/skills/ui-ux/SKILL.md`.
- Đọc `docs/audit/FULL_SYSTEM_PRE_FIX_AUDIT_20261119.md` từ PR #12, thống nhất P0/P1 thực sự chưa sửa; đọc PR #13 trước khi phát triển Admin, PR #6 trước question bank.
- Inspect FE routes/sidebar, services/hooks/repositories & components tương ứng: `frontend/src/services/{education,aiTutor,learningPath,adaptiveLearningPathService,learningState,assessment,quiz,supporting,subjects}.ts` (tên chính xác kiểm lại), `frontend/src/data/**/*mock*` và dependencies.
- Inspect API controllers, DTO, Entities, DbContext, migrations, auth, import, AI tutor, adaptive learning, practice: đặc biệt `ContentController.cs`, `CurriculumImportController.cs`, `AdaptiveLearningController.cs`, `PracticeController.cs`, `AiChatController.cs`, `DbInitializer.cs`.
- Đọc OpenAPI thực / route contracts và so với FE; lập bảng `UI → hook/service → API → bảng SQL → test`; xác định mã bị trùng, hardcode grade 12/subject ID, localStorage mock, swallowed exceptions, inconsistent metadata, quyền truy cập.
- Đọc CI status mới nhất. Khi baseline không đảm bảo chạy, ghi rõ và xử lý blocker trong phase P00.

**Trước khi sửa mã**, xuất tóm tắt cực ngắn: (1) nhánh/commit hiện tại; (2) những lỗi đã được xác nhận; (3) những phần có thể tái sử dụng; (4) file/scope định thay đổi; (5) DB E2E; (6) test sẽ chạy. Không dừng chờ xác nhận những chi tiết không trọng yếu; bảo toàn dữ liệu và không deploy production.

### C. NGHIỆP VỤ PHẢI HOÀN THIỆN THEO CÁC PHASE

**P00 — Audit + P0 stabilization**:
- Tái đánh giá audit PR #12 và status các PR hiện có; tránh sửa lỗi đã fix trên nhánh khác.
- Ưu tiên false success trong Admin/user/content/assessment, fake analytics, local fallback có thể làm sai lệch dữ liệu. Khi API lỗi không biến thành dữ liệu demo hoặc thông báo lưu thành công.
- Kiểm tra và khóa chặt DB safeguard, CI, migration safety; kịch bản 401/403/404/500/network fail.

**P01 — Curriculum Toán 10–12 + quản trị CRUD**:
- CRUD Admin/Content: Môn Toán grade 10/11/12, mạch kiến thức, chương, chủ đề, lesson, learning objective, skill, prerequisite, bài tập và câu hỏi; search/filter/page, create/edit/archive/reorder/approve/publish. Reuse hiện có; chỉ mở rộng schema/contract nếu thiếu.
- `MATH10`, `MATH11`, `MATH12` là mã nghiệp vụ minh họa; IDs thực do DB trả về, FE không gắn cứng.
- Test tạo → cập nhật → đọc → refresh → archive → RBAC → audit; không xóa nội dung đã gắn attempts, chặn duplicate.

**P02 — Data pipeline thật, nạp đầy đủ theo chương trình**:
- Tự tìm bản chương trình Toán THPT công khai chính thức và văn bản cập nhật; lưu catalogue nguồn: URL, tổ chức, ban hành, phiên bản, license.
- Build curriculum matrix 10/11/12: mạch → chương/chủ đề → kiến thức/yêu cầu cần đạt → bài học → kỹ năng → prereq → câu hỏi.
- Tái sử dụng import preview/confirm JSON/CSV/XLSX, thêm validators provenance, LaTeX, answer, duplicate, FK, grade/skill và `dry-run` + batch rollback; Admin duyệt trước publish.
- Tự xây bộ dữ liệu kiến thức chuẩn hóa + ví dụ/lời giải nguyên gốc theo từng batch; kiểm tra toán bằng SymPy hoặc tương đương ở bước kiểm định (SymPy có thể chạy trong tool/script riêng, KHÔNG bắt buộc runtime backend Python). Đề chứng minh hình học/suy luận không thể xác minh bằng CAS phải được gắn review thủ công.
- Kiểm kê và chỉ nhập lại câu hỏi có nguồn/quyền sử dụng phù hợp. Lập báo cáo coverage chi tiết từng lớp; nếu nội dung còn thiếu phải hiện thiếu, không ngụy tạo “100%”.
- Nạp DB_E2E trước, xuất report; không tự import DB production. Tài liệu SGK không sao chép nguyên văn vô phép.

**P03 — Học tập thật + Luyện tập**:
- FE trang Toán 10/11/12 gọi API thật: chương, bài, giải thích, ví dụ, KaTeX, bài tập; bài chưa published không hiển thị cho học sinh.
- Practice sessions lấy câu từ DB, server-side answer check, không trả đáp án trước khi làm; save/resume; grading persisted & atomic; ngắt kết nối không hiển thị kết quả ảo.
- Khắc phục quiz/practice hoặc service khác còn mock trong đường đi học sinh; UI empty/error/skeleton.

**P04 — Đánh giá đầu vào + Student Mastery**:
- Tạo bài kiểm tra định vị theo lớp và prerequisite; lưu attempt/answer/skill evidence thật.
- Tính mức thành thạo theo kỹ năng, độ khó, tính mới của kết quả, số lần thử độc lập, mức phụ thuộc vào hint. Mới ít dữ liệu phải nói “Chưa đủ dữ liệu” thay vì gán % giả.
- Cho phép xem vì sao điểm mastery thay đổi và xem lại câu hỏi; tránh vòng lặp đánh giá thiên lệch.

**P05 — MENU “HỌC TẬP THÍCH ỨNG”**:
- Menu riêng dễ thấy, link route không duplicate; luồng: chọn lớp/mục tiêu → đánh giá → bài hôm nay → luyện theo điểm yếu → xem cập nhật năng lực.
- Backend khuyến nghị bài tiếp theo dựa prereq, mastery, khó/dễ, mục tiêu và time budget; trả reason & evidence; không hardcode Math12 hoặc route `/subjects/math` nếu ID là `sub_math12`.
- UI 1 action chính “Tiếp tục học”, cards gọn, trạng thái chưa có dữ liệu.

**P06 — PHÂN TÍCH LỖI SAI**:
- Bài sai phải liên kết `questionId, attemptedAnswer, correctVerifiedAnswer, topic/skill, attemptId, timestamp, evidence` trong DB.
- Taxonomy: sai khái niệm, phép biến đổi, dấu, điều kiện/xác định, tính toán, đọc đề, lập luận, chưa đủ cơ sở. AI giải thích dựa bài làm, chỉ nói chắc khi có bằng chứng; cho học sinh báo “AI phân tích sai”.
- Đề xuất 1–3 bài chữa lỗi, có theo dõi sau ôn; không sinh lời giải sai hay tự tin vô căn cứ.

**P07 — LỘ TRÌNH HỌC TẬP TỰ ĐỘNG**:
- Tạo plan theo grade, mục tiêu/điểm đích, thời lượng/tuần, deadline hợp lệ, mastery, kiến thức tiên quyết.
- Lưu ở SQL, update sau nộp bài/trả lời quiz/đổi goal, có lịch sử cập nhật và reason, bảo đảm idempotency.
- Giao diện timeline tuần/thứ tự học, trạng thái thực tế; cho đổi mục tiêu, tạm hoãn, làm lại; không bịa streak hay ngày hoàn tất.

**P08 — HỌC TỪ TÀI LIỆU**:
- Admin hoặc học sinh tải PDF/DOCX, ảnh (nếu hỗ trợ) → validate magic bytes/MIME/kích thước/ownership → virus scan strategy → parser, OCR chỉ khi không có text → chunk với trang → retrieval có phân quyền (user/document scope).
- Viewer 2 cột hoặc mobile single column: danh sách tài liệu, xem trang, đặt câu hỏi, AI trả lời có link/citation đến trang và cảnh báo khi không tìm thấy; học từ tài liệu do người dùng tải, không dùng để tự động publish curriculum.
- Có trạng thái queued/processing/ready/failed, retry/quota, xóa tài liệu gỡ index/chunks; chống prompt injection trong file.

**P09 — Gia sư AI hợp nhất + UI polishing**:
- AI Tutor lấy `subject, grade, lesson, skill/mastery, question context, document citation` có quyền; mô hình Socratic hints 3 mức (gợi công thức, dẫn bước đầu, hướng dẫn đầy đủ khi phù hợp).
- Structured response với LaTeX, nguồn/citation và trạng thái AI; server guard chống lộ đáp án trong thi có giám sát, không sử dụng fake provider trong production.
- Dùng Evondev UI skill để làm đồng bộ menu, các trang, form Admin; đơn giản, đúng dữ liệu, không quá AI/màu mè; không redesign toàn diện.

### D. CÁCH THỰC THI MỖI PHASE — BẮT BUỘC LẶP LẠI

1. Mở một nhánh `feature/math10-12-pXX-<short-scope>` trên baseline đã xác minh sạch. Không ghi trực tiếp main hay đè các PR khác.
2. Chọn một vertical slice nhỏ nhất tạo giá trị thật: thiết kế contract/schema trước → DB migration an toàn → BE implementation + tests → FE wiring + tests → Playwright end-to-end → documentation.
3. `git diff --check`, lint, frontend test/build, backend build/unit/integration (SQL_E2E), Playwright happy/negative/responsive. Với AI dùng golden questions + failure scenarios. Log từng lệnh PASS/FAIL; nếu không chạy được phải nói blocker, KHÔNG claim PASS.
4. Chạy smoke test qua UI với tài khoản role phù hợp, kiểm tra network responses, SQL read-back để xác nhận lưu thật, refresh, quyền và dữ liệu trống. Tự chụp 390px và desktop bằng test automation; không gửi ảnh screenshot chứa thông tin học sinh thật.
5. Dọn file thừa do phase tạo nhưng chỉ sau khi xác minh không còn import/route; tuyệt đối không xóa hàng loạt chỉ vì tên mock nếu tests/legacy còn tham chiếu.
6. Tạo `docs/implementation/PHASE-Pxx.md` bao gồm: mục tiêu, baseline+commit, file đổi, route/API/schema, source data, test evidence, ảnh QA, issues, rollback. Chèn số lượng data có thật chỉ lấy từ query.
7. Commit, push và tạo **draft PR** với body mô tả WHAT/WHY, endpoints, migrations, test commands/results, screenshots, risk, dữ liệu bảo vệ. Đợi CI. Dùng `@codex review` trong PR nếu Codex Code Review được kết nối và bật; hoặc chạy Code Review qua Codex. Kiểm tra có review thực; không nói “Codex đã duyệt” nếu chỉ comment.
8. Đọc review, khắc phục mọi P0/P1 và regression, re-run tests, cập nhật PR. Không merge khi thiếu human approval. Chỉ chuyển sang phase sau khi đã nghiệm thu phase trước.

### E. THANG KIỂM TRA CHẤT LƯỢNG / DEFINITION OF DONE

- Không có runtime mock data hoặc success giả trên tuyến tính năng vừa triển khai.
- Tính năng lưu được qua API vào SQL_E2E, đọc sau refresh, khác tài khoản được cô lập.
- Correct RBAC, ownership, input validation, concurrency, transaction, rollback và error semantics.
- Không rò rỉ correctAnswer trước lúc nộp bài; Toán được xác minh bằng test/golden set phù hợp.
- Không UI rối: đọc được desktop và mobile, keyboard accessible, không duplicate menu, loading/error/empty nhất quán.
- CI lint/tests/build pass, E2E pass, Codex review issues xử lý; DB `StudyAIDb` không bị động đến.
- Nguồn học thuật và license xác minh; coverage report chỉ nói 100% khi thật sự đối chiếu đủ từng yêu cầu.

### F. ĐẦU RA Ở CUỐI MỖI LƯỢT

In ngắn gọn các mục:
1. Phase đã thực hiện và vì sao;
2. Findings đã xác minh / findings chưa chắc;
3. Files & API/schema thay đổi;
4. Dữ liệu từ đâu, record count thực tế;
5. Kết quả lint, unit, integration, E2E, visual QA (kèm log/CI);
6. URL branch/commit/draft PR;
7. Link review Codex và issues (chỉ khi thực sự có);
8. Việc tiếp theo, blocker/rủi ro.

**LỆNH THỰC THI ĐẦU TIÊN**:
Hãy bắt đầu từ P00: đọc repo, baseline `feature/ai-core-v1`, PR #12/#13/#6/#9, test workflow và hoàn thành kiểm toán/ưu tiên P0. Không xây P01…P09 cùng lúc. Nếu thấy P00 đã hoàn tất trên một nhánh/PR thật, chứng minh bằng diff + tests rồi chuyển sang phase còn thiếu gần nhất. Viết báo cáo, test, push PR nhỏ. Không ghi vào `StudyAIDb`.

## HƯỚNG DẪN SAU KHI P00 HOÀN THÀNH

Với mỗi phase, người vận hành có thể dùng lệnh ngắn:

`Tiếp tục phase kế tiếp trong docs/plans/AI_TUTOR_MATH10_12_IMPLEMENTATION_PLAN.md. Chỉ làm 1 vertical slice, test FE/BE/E2E trên DB_E2E, push draft PR, kiểm tra Codex review. Đối chiếu lại mọi PR đang mở trước khi code. Báo số liệu thật, không mock.`

Nếu muốn triển khai trực tiếp P01 thay vì P00, chỉ thực hiện khi các P0 đã được xác minh fix bằng code + tests, và mô tả rõ căn cứ.
