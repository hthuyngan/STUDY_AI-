# Multi-Agent Token & Usage Measurement Report

## 1. Measured Codex CLI Usage (Isolated Fixture Benchmark, 2026-11-26)

Source: `%TEMP%\studyai-agent-usage\usage.jsonl` captured from `codex exec --json` (`turn.completed.usage`) during `scripts/agents/Test-SafeAgentBridge.ps1` (`15/15 PASS`):

| Call | Model | Reasoning | Cache Hit | Duration | Input Tokens | Cached Input | Output Tokens | Reasoning Tokens |
|---|---|---|---|---:|---:|---:|---:|---:|
| `codex-plan.ps1` | `gpt-5.6-sol` | `medium` | `false` | 57,942 ms | 111,520 | 82,304 | 2,073 | 881 |
| `codex-review.ps1` (initial) | `gpt-5.6-sol` | `medium` | `false` | 38,398 ms | 56,344 | 27,904 | 1,311 | 598 |
| `codex-review.ps1` (same SHA/scope) | `gpt-5.6-sol` | `medium` | `true` | 152 ms (total) | 0 | 0 | 0 | 0 |

### Observed Impact

- **Review Cache**: Eliminated 100% of Codex tokens (56,344 input + 1,311 output -> 0) and reduced review latency from `38,398 ms` to `152 ms` when `base_sha`, `head_sha`, `review_mode`, `scope`, and `policy_hash` are unchanged.
- **Deterministic Log Filter (`summarize-logs.ps1`)**: Reduced raw test/build logs to a compact JSON summary (`status`, counts, and up to 25 error lines), keeping full logs external in `%TEMP%`.

## 2. Measurement Boundaries (Honest Reporting)

- **Measured directly**: Codex CLI `input_tokens`, `cached_input_tokens`, `output_tokens`, `reasoning_output_tokens`, `duration_ms`, and `cache_hit`.
- **Not exposed by platform**: Antigravity IDE/Agent Manager does not expose per-turn input/output/reasoning token counters to local scripts or tools, so Antigravity-side token consumption is **not** claimed as measured here.
