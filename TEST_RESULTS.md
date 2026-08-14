# Test Results

Date: 2026-08-13

## Environment

- Python: runtime-provided Python 3
- Agent #2 package: `nbcc2020-roof-snow 0.1.0`
- API: FastAPI test client
- Web: React + TypeScript source prepared; package installation was unavailable in the execution environment

## Inherited engineering tests

Command:

```bash
cd packages/nbcc2020_roof_snow_engine
python -m pytest -q
```

Result:

```text
25 passed
```

## FastAPI adapter and contract tests

Command:

```bash
cd backend
PYTHONPATH=app:../packages/nbcc2020_roof_snow_engine/src python -m pytest -q
```

Result:

```text
9 passed
```

Coverage includes health/version, uniform calculation, projection 3.0 m boundary, projection exemption under 3.0 m, lower-roof case calculation, adjacent-drift Cw enforcement, official-report authorization denial and OpenAPI generation.

## Frontend production build

Status: **Not executed successfully in this environment.**

Reason: npm dependency installation could not complete because package installation/network access was unavailable. The React/TypeScript source and build configuration are included for execution in CI or a normal development environment.

## Known risks

- High-level lower-roof geometry interpretation is not present in the supplied Agent #2 engine package; the application does not invent it.
- Approved LinkoTech authentication/entitlement provider is not connected, so official PDF generation remains server-side denied.
