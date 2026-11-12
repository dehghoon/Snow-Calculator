# Snow Calculator

NBCC 2020 roof snow engineering application built around the validated Agent #2 Python engine.

## Architecture

```text
web/        React + TypeScript client
backend/    FastAPI service and report-preview orchestration
packages/   Validated Agent #2 engineering engine (unchanged)
docs/       Architecture, deployment and limitation notes
```

The frontend never reimplements engineering calculations. All engineering values come from the FastAPI adapter, which calls the validated Python package.

## Supported calculation modes

- `UNIFORM_ROOF`
- `LOWER_ADJACENT_ROOF`
- `ROOF_PROJECTION_OR_PARAPET`

## Local API

```bash
cd backend
python -m pip install -r requirements.txt
PYTHONPATH=app:../packages/nbcc2020_roof_snow_engine/src uvicorn app.main:app --reload
```

## Local web client

```bash
cd web
npm install
npm run dev
```

Configure `VITE_API_BASE_URL` using `web/.env.example`.

## Test commands

```bash
cd packages/nbcc2020_roof_snow_engine
python -m pytest -q

cd ../../backend
PYTHONPATH=app:../packages/nbcc2020_roof_snow_engine/src python -m pytest -q

cd ../web
npm run build
```

## Report access

Calculation results and report preview are available without subscription gating. The official PDF endpoint is server-side denied until the approved LinkoTech authentication and report-entitlement provider is connected. No duplicate identity system is included.

## Engineering boundary

The Agent #2 engine is preserved unchanged. This application formats, validates at the API boundary, visualizes and reports engine outputs, but does not change formulas, ratios, warnings, units or applicability rules.

## Structural Core compatibility target (Revision 6)

Canonical contract: [Linkoteq Structural Core](https://github.com/dehghoon/linkoteq-structural-core/blob/main/CORE_CONTRACT.md).

- Target Core package: `v0.6.0`; target model schema: `0.6`.
- Legacy model schema `0.5` remains supported at the Core contract boundary.
- This declaration is a migration target, not proof that this repository's runtime dependency, API, importer mapping, or deployment has migrated.
- Existing engineering calculation and application behavior is unchanged by this documentation update.
- The Core `v0.6.0` GitHub Release must be verified separately from the version on `main`.

# Linkoteq Design System Compliance

All global navigation, logo, product menu and design tokens MUST comply with the [Linkoteq Platform Design System Contract](https://github.com/dehghoon/Main-website/blob/design/skyciv-inspired-platform-refresh-20261111/contracts/platform-design-system-v1.md).

Canonical CSS: `https://linkoteq.com/design-system/linkoteq-shell-v1.css` (publish Main-website first).
Canonical logo: `https://linkoteq.com/linko-logo-final.svg`.
Canonical product registry: `Main-website/lib/engineering-tools.ts`.

Current status: temporary local navigation adapter; reusable shared header package not yet implemented. Verify 360/390/768/1440px, accessibility, build, calculation/editor regression and access gating before merge/deploy. New tools MUST NOT ship independent global headers.
