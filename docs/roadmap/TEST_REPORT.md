# TEST REPORT — ROUND 06 (AI TUTOR MATH 12)

> Date: 2026-11-28 (Asia/Bangkok)  
> Branch: `feature/math12-integrated-release` (Draft PR `#38`, Issue `#39`)

| Gate | Command | Scope / Target | Result |
|---|---|---|---|
| Guardrail Bridge | `powershell -File scripts\agents\Test-SafeAgentBridge.ps1` | Dual-agent safety guardrails | **10/10 PASS** |
| Guardrail Adversarial | `powershell -File scripts\agents\Test-SafeAgentAdversarial.ps1` | DB/SHA/lock/injection guardrails | **45/45 PASS** |
| Backend Build | `dotnet build StudyAI.sln` | `StudyAI.Api`, `UnitTests`, `IntegrationTests` | **PASS** (0 errors) |
| Backend UnitTests | `dotnet test StudyAI.sln` | `StudyAI.UnitTests` (incl. 349 routes) | **351/351 PASS** |
| Backend IntegrationTests | `dotnet test StudyAI.sln` | `StudyAI.IntegrationTests` on `StudyAIDb_Clean_{GUID}` | **281/281 PASS** |
| Frontend Lint | `bun run lint` (`oxlint --deny-warnings`) | 535 files | **0 warnings, 0 errors** |
| Frontend Unit/Component | `bun run test` (`vitest run`) | 92 test files | **599/599 PASS** |
| Frontend Build | `bun run build` (`tsc -b && vite build`) | Production bundle | **PASS** |
| Live 4-Role Playwright E2E | `run_r06_live_e2e.ps1` -> `e2e_r06_4role.ts` | Content, Teacher, Learner, Admin + 390px mobile + RBAC on `StudyAIDb_Clean_{GUID}` | **PASS** (`LIVE_E2E_R06_4ROLE_PASS`) |
| P05 Preservation (`D:\TN`) | SHA-256 baseline comparison | 26 dirty P05 files in `D:\TN` | **26/26 PASS** (`0` mismatches) |
