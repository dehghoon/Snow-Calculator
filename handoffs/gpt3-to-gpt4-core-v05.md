# GPT-3 → GPT-4 Handoff — Snow Calculator Core v0.5

Date: 2026-08-26
Repository: `dehghoon/Snow-Calculator`
Branch: `main`
Core source of truth: `dehghoon/linkoteq-structural-core`
Core schema: `0.5`

## Implementation

Core v0.5 integration implementation commit:

`3c051290d90ee65115e085fae74832ddc4ad6c40`

The FastAPI application now exposes:

`POST /api/v1/core/roof-snow/v0.5`

The existing endpoints remain available:

- `POST /api/v1/calculations/roof-snow`
- `POST /api/v1/core/roof-snow`

The v0.5 integration preserves stable `projectId`, `runId`, and `targetIds`, emits canonical snow `LoadSource` and `LoadCase` records, and writes explicit `surface-pressure` loads with `kPa` units and source/run provenance.

Uniform roof snow maps to exactly one target surface. Non-uniform snow distributions are not flattened: each distribution segment requires one unique stable surface ID and produces one canonical surface-pressure load. Incomplete, duplicate, or mismatched surface mappings are rejected with HTTP 422.

## Engineering boundary

The authoritative GPT-2 package remains:

`packages/nbcc2020_roof_snow_engine`

GPT-3 did not modify the GPT-2 engineering engine, snow formulas, coefficients, applicability rules, warnings, units, or calculation logic.

Snow Calculator remains a load calculator. It does not call PyNite directly. Structural analysis remains outside this repository boundary and must occur through the Core Analysis Adapter after canonical snow loads are produced.

## CI evidence

Workflow:

`.github/workflows/quality-gate.yml`

GitHub Actions run:

- Run: `#94`
- URL: `https://github.com/dehghoon/Snow-Calculator/actions/runs/33030736707`
- Overall result: `SUCCESS`
- Agent job: `SUCCESS`
- Web tests + production build job: `SUCCESS`

Verification results:

- GPT-2 engine pytest: `24 passed`
- Backend pytest: `16 passed`
- Frontend tests: `passed`
- Frontend production build: `passed`
- OpenAPI verification: `passed` through the backend test suite
- Core v0.5 endpoint test: `passed`
- Standalone regression benchmark: `passed`

The workflow executes the full GPT-2 engine test directory and the full backend test directory, so `backend/tests/test_core_v05.py` is included automatically.

## Remaining blockers

Production Verification is **not complete**.

Remaining work for GPT-4 / deployment verification:

- independently verify Core v0.5 contract compliance;
- verify deployment health;
- run production smoke tests;
- verify a representative production calculation;
- verify any deployment-specific report/auth/entitlement requirements that apply.

Do not mark Production Verification complete until those checks pass.
