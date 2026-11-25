# Antigravity Prompt — Integrate PR #24 → #25 → #26

## PROMPT

Bạn là Implementation Agent thực hiện tích hợp có kiểm soát cho repository `hthuyngan/STUDY_AI-`.

Mục tiêu duy nhất: tích hợp ba Draft PR theo thứ tự **#24 → #25 → #26** vào `feature/backend-redesign-modular-monolith`, bảo toàn lịch sử commit và xác minh CI sau từng lớp. Không merge vào `main`, không sửa application code để ép merge, không thao tác database.

### Bằng chứng đã review

- PR #24 head: `bc969b56ca75bff7acc3b1777cadc69543c21a89`.
- PR #25 head: `1baa9de8b26fab37b203e696204e26b5cd77c8a6`.
- PR #26 accepted head: `be856ebaa7ed302cf0cc40e078bafb7b53f1e3a3`.
- Target observed before execution: `feature/backend-redesign-modular-monolith` at `49407bb2`.
- PR #26/ENV-01 and disposable database lifecycle are already accepted. Do not re-review or rewrite them unless new diff directly affects their safety boundary.

### Mandatory preflight

1. Read `AGENTS.md`, `docs/curriculum-refactor/NEXT-IMPLEMENTATION-PLAN.md`, the three PR descriptions, and their latest checks.
2. Run `git status`, record branch/upstream/HEAD, then `git fetch --all --prune`.
3. Do not reset, stash, clean, overwrite, or delete any local work. Stop if the worktree is dirty or a recorded head changed.
4. Confirm each PR is open, Draft, mergeable, and has the expected head/base. Confirm the target has not unexpectedly advanced. If it advanced, inspect the new diff and stop for review when overlap exists.
5. Confirm the owner has recorded the P01 compatibility-mapping decision (`21` legacy subjects; `0` mapped, `13` unmapped, `8` conflicts in the rehearsed snapshot). Do not infer or perform backfill.

### Integration procedure

For every PR, use GitHub's **merge commit** method. Do not squash or rebase.

#### Step 1 — PR #24

1. Verify PR #24 targets `feature/backend-redesign-modular-monolith` and its diff is P00 only.
2. Require all checks successful at its exact head.
3. Merge PR #24 with a merge commit into the target.
4. Record the resulting target SHA and wait for target/merge CI. Stop on failure.

#### Step 2 — PR #25

1. Retarget PR #25 from `feature/multi-subject-curriculum-refactor` to `feature/backend-redesign-modular-monolith` only after PR #24 is merged.
2. Inspect the retargeted diff. It must contain P01 catalog changes only; P00 must disappear from the PR diff.
3. Require fresh successful CI on the retargeted base.
4. Merge PR #25 with a merge commit, record the target SHA, and require target/merge CI success.
5. Do not migrate or seed any database.

#### Step 3 — PR #26

1. Retarget PR #26 from `feature/multi-subject-catalog-p01` to `feature/backend-redesign-modular-monolith` only after PR #25 is merged.
2. Inspect the retargeted diff. It must contain ENV-01/ENV-02 only; P00/P01 must disappear from the PR diff.
3. Require fresh CI on the retargeted base, including frontend and two independent disposable backend runs.
4. Merge PR #26 with a merge commit and require final target CI success at the resulting SHA.

### Stop conditions

Stop without merging the current PR if any of these occur:

- head/base SHA mismatch, unexpected commits, merge conflict, or non-mergeable state;
- CI failure, skipped required job, or CI application SHA mismatch;
- conflict resolution would alter application behavior or migration ordering;
- any test/runtime connection points to `StudyAIDb` or static `StudyAIDb_E2E`;
- migration, seeding, cleanup, restore, or drop is requested as part of integration;
- P01 compatibility/backfill decision is not approved;
- PR diff contains files from a previously merged layer or unrelated modules.

Never resolve conflicts by accepting all “ours” or all “theirs”. Do not force push, rewrite reviewed heads, or merge `main`.

### Final verification and report

1. Record the final merge commit as the immutable **integration release SHA**.
2. Show `git log --graph` proving the three merge commits and preserved reviewed heads.
3. Show final PR bases, merged states, CI run URLs, job conclusions, and exact application SHA.
4. Run `git diff --check` on the integration result. Do not run the full suite locally when final GitHub CI is complete and trustworthy.
5. Confirm no database command was executed and no application file was changed outside the PR merges.
6. Do not merge to `main`, deploy, migrate `StudyAIDb`, retire a database, or begin P02.

Return a concise integration report with: target before/after SHAs, each PR merge SHA, CI URLs, stop-condition audit, and the final release SHA.
