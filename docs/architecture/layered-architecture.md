# STUDY_AI — LAYERED ARCHITECTURE SPECIFICATION
## Presentation, Application, Domain & Infrastructure Architecture

Tài liệu này xác định chuẩn kiến trúc phân tầng 4 lớp (Layered Architecture) cho toàn bộ hệ thống STUDY_AI, áp dụng đồng bộ trên cả Frontend (React 19 + TypeScript) và Backend (FastAPI + SQLAlchemy + Alembic).

---

## 1. NGUYÊN TẮC PHÂN TẦNG CỐT LÕI

Kiến trúc STUDY_AI tuân thủ nghiêm ngặt nguyên lý **Dependency Inversion** và **Separation of Concerns**:
1. **Một chiều phụ thuộc (Unidirectional Dependency)**: Các tầng bên trên chỉ được phép phụ thuộc vào các tầng bên dưới. Tầng dưới tuyệt đối không import ngược từ tầng trên.
2. **Domain độc lập (Pure Domain Logic)**: Tầng Domain (logic nghiệp vụ, tính điểm, phân tích bằng chứng, thuật toán) là các pure functions hoặc pure models, không phụ thuộc vào UI (React), trình duyệt (`window`, `localStorage`), hoặc framework mạng (`fetch`, `FastAPI`).
3. **Trung thực về dữ liệu (Truthful Integration)**:
   - Tầng UI không bao giờ nhận thông báo thành công nếu tầng Infrastructure chưa hoàn tất lưu trữ.
   - Khi API backend trả về lỗi, hệ thống phải hiển thị trạng thái lỗi trung thực; tuyệt đối không tự ý giả mạo dữ liệu (fake mock) trong luồng production.

---

## 2. KIẾN TRÚC PHÂN TẦNG FRONTEND (REACT 19 + TYPESCRIPT)

```mermaid
flowchart TD
    subgraph Presentation_Layer ["1. Tầng Trình diễn (Presentation Layer)"]
        UI_Pages["Pages (LessonPage, PracticePage, AnalyticsPage, AdminWorkspace)"]
        UI_Components["Components (NotebookShell, StepQuestionView, FormulaBlock)"]
    end

    subgraph Application_Layer ["2. Tầng Ứng dụng (Application Layer)"]
        App_Hooks["Hooks (useAuth, usePracticeSession, useLearnerSync)"]
        App_Context["Context & State Providers (AuthContext, PracticeContext)"]
        App_Services["Application Services (personalizationService, aiTutorService)"]
    end

    subgraph Domain_Layer ["3. Tầng Nghiệp vụ (Domain Layer)"]
        Dom_Engines["Calculation Engines (evidenceAggregationEngine, skillPerformanceEngine)"]
        Dom_Scoring["Scoring Models (scoringEngine, knowledgeGapDetectionEngine)"]
        Dom_Types["Pure Domain Types (PracticeResult, SkillEvidence, LearnerState)"]
    end

    subgraph Infrastructure_Layer ["4. Tầng Hạ tầng (Infrastructure Layer)"]
        Infra_Repo["Repositories (practiceRepository, questionBankRepository, curriculumRepository)"]
        Infra_Api["API Client (apiClient with retry policy, HttpOnly cookies & error mapping)"]
        Infra_Storage["Storage Adapters (localStorageAdapter, indexedDBAdapter, authSession)"]
    end

    UI_Pages --> App_Hooks
    UI_Pages --> UI_Components
    App_Hooks --> App_Services
    App_Hooks --> App_Context
    App_Services --> Dom_Engines
    App_Services --> Dom_Scoring
    App_Services --> Infra_Repo
    Dom_Engines --> Dom_Types
    Dom_Scoring --> Dom_Types
    Infra_Repo --> Infra_Api
    Infra_Repo --> Infra_Storage
```

### Chi tiết trách nhiệm từng tầng Frontend:
1. **Presentation Layer (`src/pages`, `src/components`)**:
   - Chỉ chịu trách nhiệm render giao diện theo Navy Notebook design system (`#102A43`, `#F4B942`, `#FFF9EA`), nhận input từ người dùng và kích hoạt actions.
   - Không chứa logic nghiệp vụ tính điểm hoặc trực tiếp gọi `fetch` / `localStorage`.
2. **Application Layer (`src/hooks`, `src/context`, `src/services`)**:
   - Điều phối luồng làm việc (workflow orchestration): tải dữ liệu, quản lý trạng thái phiên làm việc (`PracticeSession`), đồng bộ background sync.
   - Chuyển tiếp kết quả từ Domain Layer sang Presentation Layer.
3. **Domain Layer (`src/services/*Engine.ts`, `src/types`)**:
   - Chứa logic cốt lõi của bài toán giáo dục: Chấm điểm 3 dạng câu hỏi (`scoringEngine.ts`), kiểm tra tính toàn vẹn kết quả (`validatePracticeResultIntegrity`), tổng hợp bằng chứng năng lực (`evidenceAggregationEngine.ts`), nhận diện lỗ hổng kiến thức (`knowledgeGapDetectionEngine.ts`).
   - Pure functions, 100% unit-tested, không side-effects.
4. **Infrastructure Layer (`src/repositories`, `src/lib/apiClient.ts`, `src/auth/authSession.ts`)**:
   - Giao tiếp với thế giới bên ngoài: REST API backend, browser storage (`localStorage`), bộ nhớ in-memory token.
   - Xử lý các lỗi mạng, token refresh rotation, mã hóa HTTP status code thành `ApiErrorCode`.

---

## 3. KIẾN TRÚC PHÂN TẦNG BACKEND (FASTAPI + SQLALCHEMY)

```mermaid
flowchart TD
    subgraph Backend_Presentation ["1. API / Presentation Layer"]
        Routers["FastAPI Routers (auth, me, progress, attempts, sync, admin, content)"]
        Schemas["Pydantic Schemas (Request validation & Response serialization)"]
        HealthProbes["Health Probes (/health liveness, /health/db readiness)"]
    end

    subgraph Backend_Application ["2. Application / Service Layer"]
        AuthGuards["Auth & Security Guards (get_current_user, require_role, token_rotation)"]
        StaffServices["Staff & Learner Services (sync_service, audit_logging)"]
    end

    subgraph Backend_Domain ["3. Domain / Model Layer"]
        ORM_Models["SQLAlchemy Declarative Models (User, LessonProgress, AssessmentAttempt)"]
        Content_Models["Content Models (ContentSubject, ContentChapter, ContentLesson)"]
    end

    subgraph Backend_Infrastructure ["4. Infrastructure Layer"]
        DB_Engine["Database Engine & Session Management (get_db with auto-rollback)"]
        Alembic["Database Migrations (Alembic 001 -> 004_staff_operations)"]
        External["Database Connection Pool (PostgreSQL Production, SQLite Local/Test)"]
    end

    Routers --> AuthGuards
    Routers --> Schemas
    Routers --> StaffServices
    StaffServices --> ORM_Models
    StaffServices --> Content_Models
    StaffServices --> DB_Engine
    AuthGuards --> DB_Engine
    HealthProbes --> DB_Engine
    DB_Engine --> External
    Alembic --> External
```

### Chi tiết trách nhiệm từng tầng Backend:
1. **API / Presentation Layer (`app/api`, `app/schemas`)**:
   - Tiếp nhận HTTP requests, kiểm tra định dạng dữ liệu đầu vào qua Pydantic (`ValidationError` $\to$ HTTP 422), serialize dữ liệu đầu ra.
   - Cung cấp liveness probe (`/health`) và readiness probe (`/health/db`) kiểm tra kết nối database bằng `SELECT 1` và trả về HTTP 503 khi database gặp sự cố.
2. **Application / Service Layer (`app/api/deps.py`, `app/services`)**:
   - Quản lý xác thực JWT Bearer, luân chuyển HttpOnly refresh token (Refresh Token Rotation), phân quyền RBAC (`student`, `teacher`, `content`, `support`, `admin`).
   - Bảo vệ tài khoản quản trị cuối cùng (`last active admin protection`), ghi vết kiểm toán (`StaffAuditLog`).
3. **Domain / Model Layer (`app/models`)**:
   - Định nghĩa các thực thể dữ liệu nghiệp vụ quan hệ bằng SQLAlchemy ORM: Khóa chính, khóa ngoại, ràng buộc duy nhất (`unique constraints`), chỉ mục tìm kiếm (`indexes`), mối quan hệ phân tầng (`relationship` và `cascade delete`).
4. **Infrastructure Layer (`app/database.py`, `alembic`)**:
   - Quản lý vòng đời kết nối cơ sở dữ liệu (`SessionLocal`). Hàm dependency `get_db()` cam kết rollback tự động khi xuất hiện exception để ngăn chặn dangling transactions.
   - Quản lý lịch sử tiến hóa schema qua migration scripts (hiện tại `004_staff_operations`).

---

## 4. LUỒNG DỮ LIỆU END-TO-END (END-TO-END DATA FLOW)

Ví dụ: Luồng nộp bài và phân tích kết quả học tập thích ứng (`Adaptive Practice Flow`):

```mermaid
sequenceDiagram
    autonumber
    actor Learner as Học sinh (Browser)
    participant Page as PracticePage (Presentation)
    participant Engine as Scoring & Evidence Engine (Domain)
    participant Repo as PracticeRepository (Infrastructure)
    participant Client as apiClient (Infrastructure)
    participant Backend as FastAPI /api/v1 (Backend API)
    participant DB as Database (PostgreSQL / SQLite)

    Learner->>Page: Nhấn "Nộp bài và xem kết quả"
    Page->>Engine: calculatePracticeScore(session.answers, questions)
    Engine-->>Page: PracticeResult (điểm thật, tỷ lệ, skill breakdown)
    Page->>Engine: validatePracticeResultIntegrity(result, approvedQuestionMap)
    Engine-->>Page: { isValid: true }
    Page->>Repo: saveResult(result)
    Repo->>Repo: Lưu offline-first vào localStorage
    Repo->>Client: post('/api/v1/attempts', payload)
    Client->>Backend: HTTP POST with Bearer Token + HttpOnly Cookie
    Backend->>Backend: require_role('student') & validate schema
    Backend->>DB: INSERT into assessment_attempts
    DB-->>Backend: COMMIT success
    Backend-->>Client: HTTP 201 Created
    Client-->>Repo: Sync status: synced
    Repo-->>Page: Hoàn tất lưu trữ hai chiều
    Page->>Learner: Hiển thị giao diện kết quả Navy Notebook
```
