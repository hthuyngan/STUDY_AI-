# L02 — SINGLE IMPLEMENTATION LEDGER (Anti updates this file)
**Repo:** `hthuyngan/STUDY_AI-` | **Issue:** #17 | **Draft PR:** #18  
**Base:** `feature/math10-12-p00-foundation@f287800`. **Updated:** 2026-11-20.

> **STATE: NOT STARTED.** This file is the unified progress ledger, NOT proof any L02 feature is complete. Before claiming PASS, fill real endpoints, SQL-backed evidence, test logs, CI links and commit SHAs. Read [execution prompt](../prompts/ANTIGRAVITY_L02_BIG_PHASE_EXECUTION_PROMPT.md), [phase plan](../plans/PHASE-L02-MATH10_12-INTEGRATED-DELIVERY.md) and [source audit](../audit/2026-11-20_L02_SOURCE_REVIEW.md).

## One phase, eight workstreams — update, do not duplicate this document
| WS | Complete integrated deliverable | Current | Commit / test proof | Blocker |
|---|---|---|---|---|
| WS0 | Latest HEAD Assessment resume E2E + no fake authenticated data + Codex ledger | NOT STARTED | HEAD `f287800` E2E FAILED [run #44718306868](https://github.com/hthuyngan/STUDY_AI-/actions/runs/44718306868) | Must fix root cause |
| WS1 | Math10/11/12 official-source curriculum + Content CRUD + validated import | NOT STARTED | — | License/source audit |
| WS2 | Practice basic + AI-targeted; secure server grading/resume | NOT STARTED | — | Reuse PracticeController |
| WS3 | Diagnostic mastery + Dashboard daily weak lessons | NOT STARTED | — | Need trusted skill evidence |
| WS4 | Mistake remediation + secure Socratic AI Tutor | NOT STARTED | — | Model configuration and maths validation |
| WS5 | SQL personalized roadmap + scoped document tutor | NOT STARTED | — | Secure upload/retrieval dependencies |
| WS6 | Real Admin/Teacher/Content operations + Support ticket if officially in scope | NOT STARTED | — | Current `/support/*` redirect |
| WS7 | All routes/buttons audited, UI Evondev polish, security + E2E + release documentation | NOT STARTED | — | Await WS0–6 |

## Trace matrix — Anti extends EVERY action
| Role / Menu / UI page | Action | FE service/hook | API (method/path) | SQL entity | Auth/ownership | Happy test | Failure test | E2E / refresh | Status |
|---|---|---|---|---|---|---|---|---|---|
| Learner / Dashboard | View recommendation of weak skills today | Inspect `dashboard.service` and adaptive components | Investigate `GET /api/v1/ai/recommendations` | Actual practice/skill evidence | learner owns data | TODO | TODO | TODO | INVESTIGATE |
| Learner / Practice | Start and submit basic practice | `practice.service` | `POST /api/v1/practice/sessions`, `POST /sessions/{id}/submit` | Practice sessions/attempts | learner owns session | TODO | TODO | TODO | INVESTIGATE |
| Learner / Roadmap | View/update personalized plan | `learningPath.service` | Existing `GET /api/v1/ai/learning-path` for adaptive recommendation; inspect write contract | to verify | own identity | TODO | TODO | TODO | CONFIRMED_MOCK_PATH |
| Admin / Teachers | Create teacher | `education.service` | `POST /api/v1/admin/teachers` | Users/TeacherProfiles | admin | TODO | HTTP 500/network | TODO | CONFIRMED_FALSE_SUCCESS_PATH |
| Admin / Users | Filter users | `admin.service` | `GET /api/v1/admin/users` | Users | admin | TODO | HTTP 500 must error | TODO | CONFIRMED_MOCK_FALLBACK |
| Content / Content CRUD | Create+review+publish lesson | `education.service` / content services | `/api/v1/content/*` | ContentSubjects/Chapters/Lessons/Questions | content reviewer | TODO | unauthorized publish | TODO | INVESTIGATE |
| Teacher / Class | Transfer learner | `classroom.service` | `POST /api/v1/classrooms/{id}/transfer-student` | ClassroomStudents | source+target ownership | existing E2E | cross-owner 403 | TODO | REVIEW_THREAD_OPEN |
| Support / Reports | Send/read ticket | no active `/support` route currently | NONE VERIFIED | none verified | required if included | TODO | TODO | TODO | SCOPE_CHECK |

**Status enum:** `LIVE_PASS`, `FIXED_NOT_VERIFIED`, `CONFIRMED_MOCK_PATH`, `CONFIRMED_FALSE_SUCCESS_PATH`, `MISSING`, `BLOCKED_EXTERNAL_DEPENDENCY`, `OUT_OF_SCOPE`, `INVESTIGATE`. A UI screenshot alone never means LIVE_PASS.

## Verification by current commit
| Git SHA | FE lint/type/test/build | BE unit/integration | Real browser / SQL E2E | Source/coverage | Security & roles |
|---|---|---|---|---|---|
| `f287800` (upstream P01) | Standard CI success (not L02) | Standard CI success (not L02) | **FAIL**: Assessment reload resume | Not audited fully | 26 threads unresolved |
| `L02 work HEAD` | NOT RUN | NOT RUN | NOT RUN | NOT VERIFIED | NOT VERIFIED |

## Codex thread closure matrix
26 historical unresolved PR #15 threads. For each thread record URL/id, original finding, exact latest-code behavior, regression test SHA, resolution decision. GitHub metadata: 24 outdated, 2 current; do NOT bulk resolve or request review while quota unavailable. Previous thread about classroom transfer and teacher filter remain current in GitHub metadata.

## Data safety
Only `StudyAIDb_E2E` or disposable isolated SQL. Before **any** mutation, verify running backend connection using `DatabaseSafetyGuard`, actual DbContext and environment. **Never** mutate production `StudyAIDb`. Do not commit credentials or student PII.

## Final acceptance requirements
All required WS0–WS7 rows `LIVE_PASS` or accurately documented scoped `BLOCKED` with reviewer approval; complete trace matrix; backend/FE/API contracts, robust SQL-based E2E security tests, responsive evidence, legitimate Math10/11/12 coverage, final PR HEAD CI green, human approval pending. No premature merge.
