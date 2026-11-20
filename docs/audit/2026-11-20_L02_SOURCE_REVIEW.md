# REVIEW EVIDENCE LEDGER — L02 integrated phase
**Ngày:** 2026-11-20; **code examined at:** `feature/math10-12-p00-foundation@f28780053dbbd03fd2060b041d0382e4a54b9b13`.  
**Review basis:** GitHub Git tree and selected full-source inspections, controller/route inventories, PR #15's 26 inline threads, original Math10–12 plan and CI logs. This is a **risk-driven static audit**, not proof that all repository lines are bug-free or broken. Agent operating locally must finish dependency-level audit and test coverage before declaring COMPLETE.

## Architecture inventory
- 3,952 tracked source/assets/docs blobs from Git tree; about 564 frontend/src blobs, 1,359 backend/src blobs; 19 ASP.NET API controllers, 40 frontend service TypeScript files, 19 EF migration C# files, 12 `frontend/src/data/**/*mock*` files. These are file inventory figures, **not a count of verified functional features**.
- Stack: React 19, TypeScript, Vite/Bun frontend; .NET 10/EF Core/SQL Server backend. API architecture already supplies subjects, chapters, topics, lessons, questions, grading, practice, AI chat, AI recommendations, learner analytics, teacher classroom.
- `supportRoutes.tsx` does not exist in this tree; `App.tsx` has explicit `/support/*` redirect.

## Concrete findings at inspected lines
| ID | Priority | Source | Demonstrated evidence | Workstream / test |
|---|---|---|---|---|
| L02-F01 | P1 BLOCKER | `scripts/e2e_p01_live_browser_playwright.ts:309`, Actions #44718306868 | At latest HEAD, Assessment network-failure/reload test timed out waiting for “Tiếp tục bài tập”; previous HEAD passed. **Possible hydration/race/attempt persistence, not yet root-caused.** | WS0 root-cause and deterministic repeated browser test |
| L02-F02 | P1 | `frontend/src/services/dashboard.service.ts:57-65,69-92,115-134` | Dashboard is built from `mockDashboardData` and overlays partial state; API failure becomes client-derived state, potentially leaving static demo fields visible to authenticated users. | WS0/WS2 real stats + no fallback to fabricated metrics |
| L02-F03 | P1 | `frontend/src/services/learningPath.service.ts:24-35,171-203,223-230` | `getLearningPath` returns `mockLearningPath`; subject map from `subjects.mock`, `math` and default `sub_math12`; API errors swallowed. | WS4 SQL-backed roadmap & real grade-aware subject IDs |
| L02-F04 | P1 | `frontend/src/services/admin.service.ts:243-269` | Authenticated GET `/api/v1/admin/users` catches *every* error then falls through to mockUsers. | WS0/WS5 propagate HTTP/network errors; no phantom accounts |
| L02-F05 | P1 | `frontend/src/services/education.service.ts:1087-1169` | Authenticated GET teachers errors fall into storage; POST teacher errors can yield a fabricated local teacher with fake studentCount/phone/rating. | WS0/WS5 fail-closed and SQL-backed CRUD; negative tests |
| L02-F06 | P1 | `frontend/src/services/supporting.service.ts:16-90` | Exercises, library, achievements, profile, settings are returned from `supporting.mock` or saved only via localStorage. | WS0/WS4 real endpoints or explicit unavailable, per-module acceptance |
| L02-F07 | P1 | `frontend/src/pages/Library/LibraryPage.tsx:16,24-29,145-153` | “Lưu lại” only toggles component `savedOverrides`; no backend mutation and not retained on hard refresh. | WS4 saved library state SQL + readback |
| L02-F08 | P2 | `frontend/src/pages/Practice/PracticeHubPage.tsx:110-122`, `frontend/src/pages/Dashboard/DashboardPage.tsx:97-100` | UI says Toán 12 independent of grade; Dashboard uses `math` fallback ID. | WS2/WS6 dynamic grade/subject route valid IDs |
| L02-F09 | P2/P1 | `frontend/src/services/admin.service.ts:185-195,749-763` | Some displayed API latency/env/db state are hardcoded; guest health path reports SQL connected with synthetic latency. | WS5 health real contract and guest state separation |
| L02-F10 | P1 gap | `frontend/src/App.tsx:61-64` | `/support/*` redirected to Dashboard, no live Support workstream. | WS5 implement real ticket lifecycle only if official in-scope |
| L02-F11 | P1 governance | `frontend/src/services/aiTutor.service.ts:518-540` | Guest AI answers generated as mock; authenticated branch calls backend and propagates errors (do not conflate). Ensure demo is explicit and not represented as live tutor. | WS3 strict mode source label/provider status |
| L02-F12 | P1 data | `DbInitializer.cs:39-199` | Seeded examples are Math 12; existence of some seed data does NOT certify Math10/11/12 coverage or licensing. | WS1 official source registry, review matrix, validated import |
| L02-F13 | P2 contracts | `frontend/src/services/operations.service.ts:375-415` | Authenticated audit logs retrieval exists; pagination/exports require cross-page verification. | WS5 server pagination, historical export, filters |

## PR review threads (do not auto-close)
26 unresolved comments on [PR #15](https://github.com/hthuyngan/STUDY_AI-/pull/15) as of audit. GitHub marks **24 outdated** and **2 not outdated**:
1. `frontend/src/services/classroom.service.ts:755`: originally transfer persisted only localStorage. Latest browser transfer path has E2E success, but the inline review thread remains unresolved. Verify current code handles every source-enrollment scenario, not only smoke fixture.
2. `backend/src/StudyAI.Api/Controllers/AdminController.cs:1010`: teacher status mapping for `inactive/pending`; check current mapping implementation + integration filter tests, then respond with SHA/evidence.
Other 24 are stale inline positions; may have been corrected, but need `FIXED_VERIFIED` ledger and targeted regression evidence; never assume “outdated” automatically means safe.

## CI truth table
| SHA | CI Standard | Live Browser | Interpretation |
|---|---|---|---|
| `11bfa8589fe97073ba87831389ee08ef5a95ad1a` | SUCCESS, run #44717669662 | SUCCESS, run #44717669638 | 4/4 tested at old application HEAD only |
| `f28780053dbbd03fd2060b041d0382e4a54b9b13` | SUCCESS, run #44718306877 | **FAIL**, run #44718306868 | Cannot claim overall latest HEAD accepted; 3 scenarios passed and Assessment resume timed out |

Links: https://github.com/hthuyngan/STUDY_AI-/actions/runs/44718306877 and https://github.com/hthuyngan/STUDY_AI-/actions/runs/44718306868 .

## Next step
Antigravity reads `docs/prompts/ANTIGRAVITY_L02_BIG_PHASE_EXECUTION_PROMPT.md`, executes `docs/plans/PHASE-L02-MATH10_12-INTEGRATED-DELIVERY.md` as **ONE integrated phase**, first fixes F01 and the authenticated false-data paths, then works fullstack through curriculum → basic/adaptive practice → weak-topic dashboard/mastery → AI tutor/mistakes → roadmap/documents → Admin/Teacher/Content/Support scope. Do not count a placeholder or half-wired UI as done.

No changes to `StudyAIDb` production. Database writes only `StudyAIDb_E2E`/disposable DB with actual connection guard and test evidence.
