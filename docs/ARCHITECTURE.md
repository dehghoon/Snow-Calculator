# Architecture

## Layers

1. **Validated engineering engine** — `packages/nbcc2020_roof_snow_engine`
2. **FastAPI adapter** — request/response contracts, orchestration, structured errors, report preview
3. **React client** — input forms, result views, warnings, engineering review trace and generated load diagram
4. **Report authorization boundary** — official PDF route remains deny-by-default until approved LinkoTech auth/entitlement integration is configured

## Reuse

Shared engineering calculations stay in the Python package. The web client consumes the API contract only. The same contract can be reused by a future Expo/React Native client.

## Visualization

The current UI renders calculation-derived load distribution from the API payload. It does not recompute engineering values. Additional React Three Fiber geometry can be added once a complete high-level geometry interpretation payload is available from Agent #2.

## Hosting portability

The frontend and API are independently deployable and configured with environment variables. No production hostname is hard-coded.
