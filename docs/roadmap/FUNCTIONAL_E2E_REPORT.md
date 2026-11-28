# FUNCTIONAL PLAYWRIGHT E2E REPORT — ROUND 07

> Executed: 2026-11-28 (Asia/Bangkok)  
> Stack: Real Vite Dev Server (`http://127.0.0.1:5179`) + Real ASP.NET Core .NET 10 API (`http://127.0.0.1:5199`, `ASPNETCORE_ENVIRONMENT=Testing`) + Isolated SQL Server `StudyAIDb_Clean_379619d986b3445b94a3c2d5311db8a4` (dropped in `finally`).

---

## Verified Functional & Security Flows (`LIVE_E2E_R07_FUNCTIONAL_PASS`)

1. **E2E-03 Document Upload, Auth & Lifecycle**: Content uploaded real multipart `.txt` (`SHA-256` + `HasExtractedText == true`); Learner got `403` before publish and `200` download after `published`.
2. **E2E-04 Teacher Classroom & Material Download (`TW-001`)**: Teacher created classroom (`POST /api/v1/classrooms`), Learner joined via code, Teacher uploaded classroom material; enrolled Learner downloaded (`200`), outsider Learner got `403`, Teacher revoked -> enrolled Learner got `403`.
3. **E2E-05 Support Ticket**: Learner created support ticket (`201 Created`).
4. **E2E-06 Multi-Role UI & 4-Viewport Responsive**: Content (`/content/materials`), Teacher (`/teacher/materials`), Learner (`/dashboard` + reload), Admin (`/admin`) verified across `1440x900`, `1280x800`, `768x1024`, `390x844` with `0` horizontal overflow, `0` page errors, and `0` HTTP `5xx`.
5. **Migration Up/Down/Up (`StudyAIDb_Clean_d94ab629da0e42c1abf2a513be58468a`)**: `MIGRATION_UP_DOWN_UP_PASS` (`20261127192818` -> `20261128012615` -> `20261127192818` -> `20261128012615`).
