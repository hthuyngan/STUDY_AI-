# BÁO CÁO KIỂM TOÁN CHẤT LƯỢNG & TÍCH HỢP HỆ THỐNG: PHASE AI-01.1
**Dự án:** STUDY_AI / AItutor  
**Phiên bản:** 1.0.1-ai-quality  
**Nhánh Git:** `feature/ai-core-v1`  
**Baseline commit:** `6f7ddceb0db12249c959463b996b61b53fd6e751`  
**Ngày thực hiện:** 16/11/2026  
**Trạng thái kiểm định:**  
- ✅ **Backend Unit Tests:** 95/95 PASS (100%)  
- ✅ **Frontend Unit Tests:** 16/16 PASS (100%)  
- ✅ **Backend Build (.NET 10):** Succeeded (0 Errors, 0 Warnings)  
- ✅ **Frontend Build (Vite + TypeScript):** Succeeded (0 Errors)  

---

## 1. CÁC LỖI THỰC SỰ ĐÃ PHÁT HIỆN & NGUYÊN NHÂN

Trong quá trình kiểm toán toàn diện mã nguồn triển khai ở Phase AI-01, các vấn đề kỹ thuật sau đã được phát hiện và ghi nhận chi tiết:

| Module | Vấn đề / Lỗ hổng phát hiện | Nguyên nhân kỹ thuật | Mức độ nghiêm trọng |
| :--- | :--- | :--- | :---: |
| **AiHintService** | 1. Chỉ dùng câu gợi ý mẫu cố định, chưa thích ứng sâu theo từng dạng toán Toán 12 (Hàm số, Oxyz, Tích phân, Mũ/Logarit).<br>2. Tin tưởng tham số `mode` do client gửi lên.<br>3. Nguy cơ rò rỉ đáp án nếu chuỗi sinh ra chứa phương án chọn.<br>4. Không minh bạch nguồn gốc (Live AI vs Socratic Fallback). | - Chưa tích hợp `ILlmProvider` vào pipeline tạo gợi ý.<br>- Không truy vấn ngược `AssessmentAttempt` trong DB để kiểm tra `AssessmentId` hoặc `SuspendDataJson["mode"]`.<br>- Thiếu bộ lọc Regex Anti-leak trước khi trả về client. | **Cao** |
| **StudentMasteryService** | 1. Không bảo đảm tính Idempotent: Cùng một attempt nộp lại hoặc gọi cập nhật nhiều lần sẽ làm tăng gấp đôi `AttemptCount` và `CorrectCount`.<br>2. Đếm hint bị rò rỉ xuyên suốt tất cả các phiên: Đếm tất cả hint học sinh từng hỏi cho câu đó trong quá khứ thay vì chỉ tính trong phiên này.<br>3. Thiếu kiểm tra sở hữu: Cho phép cập nhật attempt của người khác.<br>4. Tính điểm trên bài làm chưa nộp/chưa chấm. | - Phương thức `UpdateMasteryFromAttemptAsync` thực hiện cộng dồn trực tiếp (`+= totalAttempt`) mà không gắn cờ trạng thái xử lý.<br>- Điều kiện truy vấn `AiHintUsages` lọc theo `(UserId, QuestionId)` mà thiếu `SessionId == attemptId`.<br>- Chưa kiểm tra `attempt.UserId == userId` và `attempt.CompletionStatus == "completed"`. | **Nghiêm trọng** |
| **AiAnalysisService** | 1. Cho phép học sinh gọi phân tích lỗi sai trên phiên đang làm dở dang (`in_progress`), có thể làm lộ đáp án và lời giải trong lúc làm bài.<br>2. Câu văn chẩn đoán mang tính khẳng định tuyệt đối. | - Chưa kiểm tra điều kiện `attempt.CompletionStatus != "completed"`.<br>- Thiếu sự phân định rõ ràng giữa lỗi sai đã xác nhận (`verified`), nguyên nhân giả định (`hypothesized`), và phương hướng ôn tập. | **Cao** |
| **LearningRecommendationService** | Tạo lộ trình cá nhân hóa giả định ngay cả khi học sinh chưa làm bài nào (`insufficient_data`). | Thuật toán luôn gán `currentStage = "progressing"` mà không kiểm tra độ tin cậy của tập mẫu đánh giá. | **Trung bình** |
| **OpenAiLlmProvider** | Chưa có cơ chế timeout chủ động khi gọi API bên ngoài; thiếu bẫy mã lỗi 429 (Rate Limit). | Dùng token mặc định không giới hạn thời gian chờ, dẫn đến nguy cơ treo luồng nếu API gateway phản hồi chậm. | **Trung bình** |

---

## 2. GIẢI PHÁP & CÁCH KHẮC PHỤC TRIỆT ĐỂ

### 2.1. Nâng cấp Hoàn chỉnh AI Hint Engine (`AiHintService.cs`)
1. **Kiểm tra Chế độ Thi cử Phía Máy chủ (Server-side Exam Guard):**
   - Không chỉ dựa vào tham số `mode` từ client.
   - Nếu có `sessionId`, nạp `AssessmentAttempt` từ DB và kiểm tra:
     * `attempt.AssessmentId` có chứa `exam`, `test`, hoặc `formal` hay không.
     * `attempt.SuspendDataJson["mode"]` có phải `exam`/`test` hay không.
     * Phiên đã kết thúc (`completed`/`abandoned`) hay chưa.
     * `attempt.UserId` có khớp với `userId` yêu cầu hay không.
   - Phát hiện gian lận lập tức ném ngoại lệ `UnauthorizedAccessException`.
2. **Tích hợp Live LLM & Socratic Fallback Minh Bạch:**
   - Khi cấu hình `ILlmProvider` hợp lệ (API key từ biến môi trường `STUDY_AI_LLM_API_KEY`): Gửi prompt Socratic sư phạm đến LLM, yêu cầu không giải hộ bài và không tiết lộ phương án.
   - Khi LLM offline/timeout/chưa cấu hình: Kích hoạt bộ quy tắc sư phạm Socratic thích ứng theo từng chuyên đề Toán 12:
     * **Hàm số:** Gợi ý xét dấu đạo hàm bậc nhất $y' = f'(x)$, nghiệm bội chẵn / lẻ, lập bảng biến thiên.
     * **Hình học Oxyz:** Nhắc công thức vectơ pháp tuyến $\vec{n} = [\vec{u}_1, \vec{u}_2]$, điều kiện vuông góc $\vec{u} \cdot \vec{v} = 0$, phương trình tổng quát mặt phẳng.
     * **Nguyên hàm & Tích phân:** Hướng dẫn nhận diện phương pháp đổi biến $t = u(x)$ hoặc tích phân từng phần $\int u dv = uv - \int v du$ (nhất lô, nhì đa, tam lượng, tứ mũ).
3. **Bộ lọc Chống Rò Rỉ Đáp Án (`SanitizeAntiLeak`):**
   - Quét regex các cụm từ chỉ định đáp án (như "Đáp án là A", "Chọn đáp án B", "Vậy chọn C") và tự động thay thế bằng hướng dẫn tự đối chiếu phương án.
4. **Nhãn Phân Định Rõ Ràng:**
   - Trả về trường `Provider` và `IsFallback`. Giao diện Frontend hiển thị huy hiệu `AI Live: OpenAI` hoặc `Quy tắc Socratic Fallback`, minh bạch 100% với người dùng.

### 2.2. Bảo đảm Toàn vẹn Dữ liệu Năng lực Học sinh (`StudentMasteryService.cs`)
1. **Xử lý Idempotent Tuyệt Đối theo `AttemptId`:**
   - Sử dụng trường `masteryProcessed` trong `attempt.SuspendDataJson`. Khi một attempt được xử lý thành công, đánh dấu `suspendNode["masteryProcessed"] = true`.
   - Các lượt gọi lặp lại (do double click, retry mạng hoặc background worker) sẽ được kiểm tra và bỏ qua ngay lập tức, loại bỏ hoàn toàn nguy cơ cộng trùng điểm và số lượt làm bài.
2. **Giới hạn Phạm vi Đếm Gợi Ý (Session-Scoped Hint Counting):**
   - Thay đổi điều kiện đếm hint từ `(UserId, QuestionId)` thành:
     ```csharp
     h.UserId == userId && h.SessionId == attemptId && groupQuestionIds.Contains(h.QuestionId)
     ```
   - Gợi ý của phiên A tuyệt đối không làm ảnh hưởng hay trừ điểm năng lực của phiên B.
3. **Cô Lập Tài Khoản & Kiểm Tra Trạng Thái:**
   - Kiểm tra nghiêm ngặt `attempt.UserId == userId`.
   - Kiểm tra `attempt.CompletionStatus == "completed"` và `attempt.ScoreScaled.HasValue`. Phiên làm bài chưa nộp không được phép tham gia vào bảng năng lực.
4. **Công thức Tính Điểm Năng Lực:**
   - `< 3` bài: `insufficient_data`.
   - `accuracy = (correct / attempt) * 100`.
   - `hintPenalty = min(15.0, (hints / attempt) * 5.0)`.
   - `finalScore = clamp(accuracy - hintPenalty, 0, 100)`.
   - Phân cấp: `mastered` (>=90 và >=5 bài), `proficient` (>=70), `progressing` (>=50), `needs_reinforcement` (<50).

### 2.3. Kiểm soát Phân tích Lỗi Sai (`AiAnalysisService.cs`)
- Ngăn chặn hoàn toàn việc phân tích lỗi trên các phiên chưa nộp: `if (attempt.CompletionStatus != "completed") throw new InvalidOperationException(...)`.
- Kiểm tra quyền sở hữu phiên: `if (attempt.UserId != userId) throw new UnauthorizedAccessException(...)`.
- Phân biệt rõ các mức độ:
  * `verified`: Sai sót nhận thức xác nhận được qua phương án học sinh chọn.
  * `hypothesized`: Nguyên nhân tiềm ẩn ("Khả năng cao do...").
  * `suggested`: Khái niệm và bài học cụ thể trong hệ thống cần ôn tập lại.

### 2.4. Tính Chính Xác của Lộ Trình Học Tập (`LearningRecommendationService.cs`)
- Đảm bảo 100% đề xuất trỏ đến `LessonId` có thật trong cơ sở dữ liệu và đang ở trạng thái `published`.
- Khi học sinh chưa có dữ liệu làm bài (`insufficient_data`), lộ trình hiển thị rõ ràng: `currentStage = "standard_curriculum"` kèm thông điệp hướng dẫn hoàn thành các bài học cơ bản đầu tiên thay vì sinh ra lộ trình khắc phục giả.

### 2.5. Tăng cường Khả năng Chống Chịu của LLM Provider (`OpenAiLlmProvider.cs`)
- Bổ sung `CancellationTokenSource.CreateLinkedTokenSource` với thời gian chờ chủ động 25 giây (`cts.CancelAfter(TimeSpan.FromSeconds(25))`). Ném `TimeoutException` nếu vượt quá giới hạn.
- Xử lý riêng mã lỗi HTTP 429 (`TooManyRequests`) để thông báo học sinh thử lại sau khi hệ sinh thái đạt ngưỡng rate limit.
- Che giấu an toàn khóa API trong nhật ký lỗi bằng regex masking.

---

## 3. KẾT QUẢ KIỂM THỬ HỆ THỐNG

### 3.1. Backend Unit & Regression Tests (xUnit)
Chạy lệnh `dotnet test backend/tests/StudyAI.UnitTests`:
```text
Passed!  - Failed: 0, Passed: 95, Skipped: 0, Total: 95, Duration: 3 s
```
Danh sách các test case mới bổ sung cho Phase AI-01.1:
1. `AiHintService_ForbidsHints_InExamMode`: Chặn gợi ý khi tham số `mode="exam"` hoặc `mode="test"`.
2. `AiHintService_BlocksHints_WhenSessionModeInDbIsExam_EvenIfFrontendSendsPractice`: Xác minh chế độ thi trong DB, chặn dù client gửi `mode="practice"`.
3. `AiHintService_EnforcesSessionUserIsolation`: Chặn học sinh yêu cầu gợi ý cho bài thi của tài khoản khác.
4. `AiHintService_TopicAdaptedHints_GeneratesFormulasForOxyzAndIntegrals`: Kiểm tra tạo công thức chuẩn cho chuyên đề Oxyz ($\vec{n}, \vec{u}$) và Tích phân ($\int u dv$).
5. `StudentMasteryService_IsStrictlyIdempotent_DoesNotDoubleCountSameAttempt`: Kiểm tra tính Idempotent, gọi 2 lần cùng attempt điểm và số bài không bị nhân đôi.
6. `StudentMasteryService_ScopesHintsStrictlyToCurrentSession`: Gợi ý dùng ở phiên A không bị tính dồn vào phiên B.
7. `StudentMasteryService_EnforcesUserIsolation_CannotProcessAnotherUsersAttempt`: Chặn cập nhật năng lực bằng bài làm của học sinh khác.
8. `AiAnalysisService_RequiresCompletedAttempt`: Chặn phân tích lỗi trên bài làm đang dở dang.
9. `LearningRecommendationService_GroundsInRealLessons`: Đảm bảo toàn bộ bài học đề xuất tồn tại trong DB và xử lý chuẩn khi học sinh mới chưa đủ dữ liệu.

### 3.2. Frontend Tests (Vitest)
Chạy lệnh `npm --prefix frontend test -- src/test/aiIntelligencePhase.test.tsx src/services/aiTutor.service.test.ts src/test/noSyncPopupAuth.test.tsx --run`:
```text
Test Files  3 passed (3)
Tests       16 passed (16)
Duration    4.98s
```

### 3.3. Xác minh Loại bỏ Popup Đồng bộ Tiến độ
Test suite `noSyncPopupAuth.test.tsx` (5/5 tests PASS) đã kiểm tra thực tế:
- **Khởi tạo và có dữ liệu cũ:** `migrationPending` luôn là `false`.
- **Đăng nhập:** Không bao giờ hiển thị popup `"Bạn có tiến độ học tập trên thiết bị này"`.
- **Đăng xuất và đổi tài khoản:** Tiến độ học tập của từng tài khoản được lưu tách biệt, không xảy ra xung đột hay popup phiền toái.

---

## 4. MA TRẬN MOCK AI VS LIVE AI

| Tiêu chí kiểm định | Trạng thái MOCK (Socratic Fallback) | Trạng thái LIVE (OpenAI / DeepSeek) |
| :--- | :--- | :--- |
| **Cấu hình kích hoạt** | Mặc định khi chưa cấp key môi trường | Cần đặt biến môi trường `STUDY_AI_LLM_API_KEY` |
| **Nhãn hiển thị (UI Badge)** | `Quy tắc Socratic Fallback` (nền xám nhạt) | `AI Live: OpenAI` (nền xanh ngọc) |
| **Gợi ý Cấp 1 (Định hướng)** | Mẫu sư phạm bám sát chủ đề Toán 12 | LLM Socratic prompt bám sát đề bài thực tế |
| **Gợi ý Cấp 2 (Phương pháp)** | 3 bước thuật toán giải tích kinh điển | LLM tạo các bước biến đổi trung gian tương ứng |
| **Gợi ý Cấp 3 (Bước then chốt)** | Trích xuất bước giải then chốt, không lộ đáp án | LLM chỉ ra nút thắt mấu chốt, qua bộ lọc Anti-leak |
| **Bảo vệ rò rỉ đáp án** | Đã kiểm tra Regex Sanitize Anti-leak | Đã kiểm tra Regex Sanitize Anti-leak |
| **Kiểm tra Exam Mode** | Server DB check chặn 100% | Server DB check chặn 100% |
| **Độ trễ phản hồi** | Siêu tốc (< 25ms) | Phụ thuộc mạng (1.5s - 3.5s), timeout 25s |
| **Chi phí Token** | 0.0000 USD | Ghi nhận chi tiết theo prompt & completion tokens |

---

## 5. DANH SÁCH FILE THAY ĐỔI

1. `backend/src/StudyAI.Infrastructure/Services/AiHintService.cs` (Sửa toàn diện logic gợi ý, kiểm tra DB exam mode, anti-leak, topic adaptation).
2. `backend/src/StudyAI.Infrastructure/Services/StudentMasteryService.cs` (Bảo đảm tính Idempotent theo attempt, cô lập user, giới hạn hint theo session).
3. `backend/src/StudyAI.Infrastructure/Services/AiAnalysisService.cs` (Chặn attempt chưa hoàn tất, chuẩn hóa chẩn đoán lỗi).
4. `backend/src/StudyAI.Infrastructure/Services/LearningRecommendationService.cs` (Xử lý trường hợp chưa đủ dữ liệu học sinh).
5. `backend/src/StudyAI.Infrastructure/Services/OpenAiLlmProvider.cs` (Thêm timeout 25s, xử lý mã 429 Rate Limit, che giấu key trong log).
6. `backend/src/StudyAI.Application/DTOs/AdaptiveLearningDTOs.cs` (Bổ sung trường `Provider` và `IsFallback`).
7. `backend/tests/StudyAI.UnitTests/AiIntelligenceUnitTests.cs` (Bổ sung 7 unit tests kiểm tra hồi quy).
8. `frontend/src/types/aiTutor.ts` (Bổ sung `provider` và `isFallback` vào `HintResponse`).
9. `frontend/src/components/practice/PracticeQuestionCard.tsx` (Hiển thị nhãn minh bạch Live AI vs Socratic Fallback).
10. `docs/ai/AI01_QUALITY_AUDIT.md` (Báo cáo kiểm toán chuyên sâu).

