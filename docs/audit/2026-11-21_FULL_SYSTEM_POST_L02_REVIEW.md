# STUDY_AI — Full-system post-L02 source review

Ngày review: 21/11/2026  
Nhánh review: `codex/full-system-review-20261121`  
Điểm bắt đầu: PR #18, commit `da454a15c03de1a4c08ac23622608ae4dcb3da2c`  
Phạm vi: Backend ASP.NET Core/.NET 10, Frontend React 19/Vite, route đang hoạt động, service/repository runtime, unit test và production build.

## 1. Kết luận điều hành

PR #18 build được và phần lõi practice/AI/content đã có nhiều API thật, nhưng chưa đạt tiêu chí “zero mock trên route authenticated”. Các vấn đề nghiêm trọng nhất không phải lỗi biên dịch mà là dữ liệu giả vẫn được trình bày như dữ liệu vận hành thật:

1. Quy trình duyệt, xuất bản và rollback nội dung trong `operations.service.ts` vẫn chạy bằng mảng khởi tạo + `localStorage`, kể cả trên route Content/Admin.
2. Editor bài học trong `content.service.ts` vẫn nạp nội dung mẫu, lưu body trong bộ nhớ và hard-code coverage 86%.
3. Cảnh báo học tập, hoạt động lớp và hồ sơ học sinh chi tiết trong `classroom.service.ts` vẫn được dựng giả.
4. `/question-bank` đọc 22 câu hỏi tĩnh từ repository trình duyệt. Quiz cũ cũng hoàn toàn mock.
5. Dashboard, learning path, profile, achievements và settings còn nhiều giá trị suy diễn/hard-code khi người dùng đã đăng nhập.
6. Nhiều service/DTO vẫn mặc định `sub_math12` hoặc “Toán 12”, làm sai dữ liệu của học sinh lớp 10/11 hoặc dữ liệu thiếu grade.
7. Support workspace không tồn tại; toàn bộ `/support/*` chỉ redirect về dashboard/admin.

Do đó trạng thái đúng là: **build/test lõi đạt, nhưng chưa đủ điều kiện nghiệm thu dữ liệu thật end-to-end**.

## 2. Bằng chứng kiểm thử

### Đã đạt sau bản vá review

- Frontend lint: đạt, `oxlint --deny-warnings`.
- Frontend unit/component: 75 file, 509/509 test đạt.
- Frontend production build: đạt.
- Backend Release build: đạt, 0 warning, 0 error.
- Backend unit test: 169/169 đạt.
- Admin regression tập trung: 23/23 đạt.

### Chưa thể xác nhận trong môi trường hiện tại

- Không chạy integration test có ghi database vì môi trường không được cấp SQL Server disposable/`StudyAIDb_E2E`.
- Không được phép và không thử ghi vào `StudyAIDb`.
- Live browser probe của `/admin/system` không hoàn tất: Chromium headless bị treo trong runtime cô lập khi app gọi `/api/v1/auth/refresh` và `/api/v1/ai/status` nhưng backend không chạy. Unit DOM test của trang đã đạt; đây không thay thế browser E2E.
- Production bundle chính vẫn lớn: khoảng 2.33 MB minified, 594 KB gzip. Vite cảnh báo chunk >500 KB và dynamic import của `apiClient.ts` không tạo chunk riêng.

## 3. Lỗi đã sửa trong nhánh review

### BE-01 — Hai Gemini test hỏng trên Linux

Nguyên nhân: môi trường có cả `HTTPS_PROXY` và `https_proxy`; `ConfigurationBuilder` coi key không phân biệt hoa/thường nhưng dictionary đầu vào lại phân biệt.

Sửa: dùng `StringComparer.OrdinalIgnoreCase`. Kết quả: test không còn hỏng trước khi vào nghiệp vụ.

### BE-02 — Mastery gán nhầm dữ liệu thiếu subject thành Toán 12

Nguyên nhân: khi attempt/question/user grade không xác định, code mặc định `sub_math12`; đồng thời phát sinh CS8601.

Sửa:

- ưu tiên subject thật từ attempt;
- sau đó subject của question;
- sau đó tra `ContentSubjects` theo grade thật;
- nếu vẫn không xác định thì log warning và không ghi mastery;
- thêm regression test bảo đảm unknown subject không bị ghi thành Math 12.

### BE-03 — Cảnh báo nullable trong test

Đã thêm assertion rõ ràng cho AI lesson context và audit payload, đồng thời bỏ package reference thừa gây NU1510.

### FE-01 — Khóa/mở khóa user API không hoạt động

Nguyên nhân: `toggleUserStatus()` chỉ tìm user trong `mockUsers`; user lấy từ SQL Server không nằm trong mảng này.

Sửa: lấy current state bằng endpoint `/api/v1/admin/users/{id}`, sau đó gọi status API thật. Có regression test cho user không tồn tại trong mock state.

### FE-02 — Xóa user ở BE thành công nhưng FE báo thất bại

Nguyên nhân: sau lệnh DELETE thật, hàm chỉ trả `true` nếu tìm thấy user trong `mockUsers`.

Sửa: DELETE authenticated thành công trả `true` ngay và refresh danh sách từ API. Có regression test.

### FE-03 — Admin health hiển thị dữ liệu giả

Đã bỏ trạng thái “Frontend Prototype”, “chưa nối backend”, latency/version giả và nút reset demo khỏi `/admin/system`. Trang dùng `/api/v1/admin/system/health`, hiển thị lỗi thật và fail-closed khi không có admin session.

### FE-04 — Route quiz legacy còn chạy mock engine

`/quiz/:quizId` và `/quiz/:quizId/result` nay redirect sang `/practice`, là workflow có persistence/API. Hai màn hình mock không còn reachable từ router.

### QA-01 — Test FE tự gọi localhost

Đã thêm default fetch stub 503 trong Vitest setup. Test riêng có thể override stub; toàn suite không được phép gọi localhost/CI network ngoài ý muốn.

## 4. Ma trận chức năng hiện tại

| Khu vực | Trạng thái | Bằng chứng/chênh lệch |
|---|---|---|
| Auth/RBAC | Phần lớn thật | JWT/refresh và RoleGuard có thật; preview mode phải luôn tắt ở deploy thật. |
| Admin users | Thật sau bản vá | List/create/edit/role/status/delete/revoke/reset gọi API; lỗi toggle/delete đã sửa. |
| Admin dashboard | Hỗn hợp | Metrics/API thật nhưng trước bản vá có health/version/latency giả; cần audit tiếp mọi derived KPI. |
| Admin roles | Chưa triển khai thật | Tab sandbox lưu `localStorage`, không thay đổi policy BE. Chỉ ma trận code tĩnh là nguồn policy hiện tại. |
| Admin system | API thật sau bản vá | Không còn health mock; cần browser E2E với backend + admin session. |
| Admin announcements/audit/settings | Phần lớn API thật | Announcement và audit gọi BE; settings có API nhưng vẫn cache/fallback local trong service. |
| Content subjects/chapters/lessons/assessments | Phần lớn API thật khi authenticated | `education.service` có API branch; guest branch vẫn dùng mock. Một số mapping vẫn mặc định grade 12. |
| Content lesson editor | Mock nghiêm trọng | Body lesson lấy từ `INITIAL_MOCK_LESSON_CONTENT` hoặc dựng đoạn văn mẫu; chỉ title/status được gửi qua education service. |
| Content review/publication | Mock nghiêm trọng | Approval/publication/rollback dùng `INITIAL_*` + `localStorage`, dù BE đã có một số endpoint submit/approve/publish/request-changes cho lesson/question. |
| Teacher class/student/assignment | Hỗn hợp | CRUD chính có API branch; alerts, class activities, grade bridge và academic detail vẫn dựng/localStorage. |
| Learner curriculum/lesson | Hỗn hợp | Có API/repository sync, nhưng lesson progress vẫn chạm dataset mock để cập nhật UI. |
| Learner practice/session/result | API thật | Đây là workflow nên dùng thay quiz cũ. Cần integration test với DB E2E. |
| Learner assignments | API thật khi authenticated | Guest fallback lấy classroom mock; authenticated fail-closed. |
| Learner quiz legacy | Đã vô hiệu hóa mock | Redirect sang `/practice`. |
| Learner question bank | Mock | Repository lấy `mockQuestions`, cache và ghi `localStorage`; UI tuyên bố 22 câu đã kiểm chứng nhưng không đọc CSDL. |
| Learner dashboard | Hỗn hợp | API stats thật nhưng còn subject fallback, avatar/grade mock, continue lesson dựng từ attempt và leaderboard rank 1 giả. |
| Learning path | Hỗn hợp | Adaptive path API có thật; subject path/continue-learning vẫn lấy `mockSubjectDetails`; default grade không xác định thành lớp 12. |
| Knowledge gaps/analytics/review | Hỗn hợp | Nhiều API thật nhưng selector/service còn phụ thuộc subject mock hoặc local evidence. |
| Library | API thật khi authenticated | Materials và bookmarks có endpoint; guest local là chế độ guest có nhãn rõ. |
| Profile | Chưa hoàn thiện | Stats lấy API nhưng school/goal/XP có giá trị dựng; nút edit chỉ đổi React state, reload mất dữ liệu. |
| Settings | Chưa có server persistence cho learner | Cài đặt lưu localStorage; mô tả notification nhưng không có scheduler/push delivery. |
| Achievements | Chưa có domain persistence | FE tự suy diễn achievement và `unlockedDate = now`, không có bảng/endpoint unlock idempotent. |
| AI Tutor | API thật khi authenticated, guest demo còn mock | Provider status/conversation API có thật; guest conversation/stream response vẫn dùng mock. |
| Support | Chưa triển khai | `/support/*` và ticket routes đều redirect, không có ticket workflow. |

## 5. Tồn đọng kỹ thuật ưu tiên

### P0 — Tính đúng dữ liệu và nghiệp vụ

1. Thay approval/publication localStorage bằng query/mutation BE thật; không được “approve” chỉ trong trình duyệt.
2. Persist toàn bộ lesson editor fields và lịch sử version ở BE; bỏ nội dung mẫu và coverage 86%.
3. Thay teacher alerts, activities, grade/student detail giả bằng query thật hoặc honest empty state.
4. Chuyển learner question bank sang `ContentQuestions`/Practice API; không công bố số lượng/approved status từ fixture.
5. Loại mọi fallback authenticated sang mock. API lỗi phải hiển thị error + retry, không hiển thị demo data.

### P1 — Grade/subject awareness

1. Bỏ default `sub_math12` ở DTO/service/controller/FE khi có thể suy ra từ user, route hoặc dữ liệu.
2. Không suy ra “không phải lớp 10/11 thì lớp 12”. Unknown phải là unknown/validation error.
3. Tạo một resolver subject duy nhất, kiểm thử lớp 10/11/12 và dữ liệu thiếu grade.

### P1 — Chức năng có UI nhưng chưa có persistence

- Role management thật.
- Learner profile edit.
- Learner settings/notification preferences.
- Achievement ledger.
- Support ticket workspace.
- Versioned publication/rollback.

### P2 — Chất lượng và vận hành

- Code splitting theo workspace/route; loại ineffective dynamic import.
- Thay `alert()` bằng toast/dialog có accessibility.
- Thêm authenticated route smoke tests và API contract tests.
- Chạy browser E2E với backend và SQL Server disposable.

## 6. Database safety

Lỗi startup khi chạy local với database `StudyAIDb` là guard hoạt động đúng, không phải migration bug. Development/migration/seed phải dùng `StudyAIDb_E2E` hoặc database disposable được ủy quyền. Không tắt/bypass/đổi tên guard để chạy được.

## 7. Điều kiện nghiệm thu còn thiếu

Chỉ được tuyên bố hoàn tất khi:

- không còn import fixture/mock trong dependency graph của route authenticated;
- không còn mutation nghiệp vụ staff ghi localStorage;
- mỗi nút create/edit/delete/approve/publish/grade/submit được chứng minh bằng reload phiên mới và đọc lại từ DB E2E;
- test lớp 10/11/12 đều đạt;
- integration test chạy trên `StudyAIDb_E2E`, database guard test vẫn đạt;
- browser E2E đạt cho admin, content, teacher, learner;
- GitHub branch/PR chứa SHA, log test và checklist route, không push thẳng `main`.
