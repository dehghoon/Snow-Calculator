# GPT-4 Stage 5 Production Verification

Date: 2026-08-26
Repository: `dehghoon/Snow-Calculator`
Core source of truth: `dehtghoon/linkoteq-structural-core`
Verified Core schema: `0.5`

## Verified repository deployment architecture
- Production homepage metadata in GitHub points to `https://snow-calculator-beta.vercel.app`.
- `vercel.json` configures the Vite frontend and rewrites `/api/(.*)` into `/api/index.py`, so the FastAPI backend is deployed same-origin with the frontend.
- `api/index.py` exposes `backend.app.main_app` as the Vercel serverless entry point.
- `backend/app/mai.py` exposes `/api/health`, `/api/version`, standalone roof-snow calculation, climatic data, legacy Core v0.2 and the Core v0.5 router.
- The Core v0.5 router is registered in the running FastAPI app.

## Expected production probes
Because of the Vercel same-origin rewrite, the production probes are:
- `GET https://snow-calculator-beta.vercel.app/api/health`
- `GET https://snow-calculator-beta.vercel.app/api/version`
- `GET https://snow-calculator-beta.vercel.app/api/v1/climatic/provinces`
- `POST https://snow-calculator-beta.vercel.app/api/v1/calculations/roof-snow`
- POST https://snow-calculator-beta.vercel.app/api/v1/core/roof-snow/v0.5`

## Status
- Core v0.5 implementation and CI: verified prior to Stage 5.
- Production deployment architecture: verified from repository configuration.
- Production HTTP health/version/calculation smoke evidence: pending external probe.
- Production Verification: not complete.

Reason: the current orchestrator connector can inspect GitHub artifacts but cannot issue arbitrary HTTP GET/POST requests to the deployed Vercel url. Do not mark Stage 5 complete until the production probes above are observed.
