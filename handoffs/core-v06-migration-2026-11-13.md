# Core v0.6.0 migration handoff — Snow-Calculator (2026-11-13)

**Status: audit / engineering and implementation NOT VERIFIED.** No release, merge, or deployment approved.

## Observed baseline
project-status.json reports Core v0.5; current production roof-snow endpoint and verified calculations must remain operational.

## Scope and acceptance gates
1. GPT-1: verify units, engineering semantics, supported Core 0.6 mappings and any code/standard assumptions. No fabricated engineering defaults.
2. GPT-2: preserve the validated calculation/parser engine; test representative real fixtures, numerical parity and unsupported-case rejection. Publish machine-readable mapping/fidelity results where applicable.
3. GPT-3: implement an additive Core 0.6 boundary/adapter with backward-compatible v0.5 behavior where required. Preserve existing endpoint(s), data, auth and UI. Add explicit v0.6 contract and negative tests, typecheck/build where applicable.
4. GPT-5: independently assess auth, uploads, parser safety, dependencies, secrets, privacy and retention; record and retest high/critical findings.
5. GPT-4: verify exact Core v0.6.0 pin, branch/test evidence, regression parity, security verdict and owner approval before any merge/deploy.

## Next action
Owners should inspect current code and prepare a minimal implementation PR on a separate branch; this handoff PR is documentation only. Report test command, counts, SHA, CI URL and outstanding risks. Preserve current production until a separately authorized rollout.

Canonical cross-repository matrix: dehghoon/linkoteq-structural-core PR #7.
