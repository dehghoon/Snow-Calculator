# GPT-4 Stage 5 Release Audit

Date: 2026-08-26
Repository: `dehghoon/Snow-Calculator`
Core source of truth: `dehghoon/linkoteq-structural-core`
Verified Core schema: `0.5`

## Verified completed
- Core v0.5 integration is wired and previously CI-verified.
- The authoritative GPT-2 engine in `packages/nbcc2020_roof_snow_engine` remains preserved.
- Production custom domain is observed as `https://snow.linkoteq.com`.
- A representative production calculation was observed through the deployed UI with status `OK` and the following displayed results:
  - ULS peak / governing snow load: `2.000 kPa`
  - SLS peak / governing snow load: `1.800 kPa`
  - Snow density: `3.060 kN/m^3`
  - Calculated `Cs`: `1.000`
  - Calculated `Cb`: `0.800`
- This satisfies the standalone production calculation smoke gate using the same acceptance standard previously applied to W-Section.

## Release blockers

### 1. Official PDF authorization is NOT deny-by-default in current code
`README.md` and `docs/ARCHITECTURE.md` state that official PDF requires approved LinkoTeqh auth/entitlement and should remain denied until that integration is configured.

However, current `backend/app/main.py` implements:
```text
POST /api/v1/reports/official
```
and directly builds/returns the PDF without an authentication or entitlement check.

Current `reporting.py` also reports `official_pdf_available=True` and `entitlement_required=False`, conflicting with the documented release policy.

Required GPT-3 fix:
- restore deny-by-default behavior for ``/api/v1/reports/official` until approved Linkoteq auth/entitlement is integrated;
- make report-preview metadata match the actual gating policy;
- add regression tests proving unauthorized official PDF access is denied;
- do not introduce a new identity system inside this repository.

### 2. Version metadata is stale after Core v0.5 migration
Current `/version` response in `backend/app/main.py` still reports:
```text
core_contract: 0.2
```

while the repository now has a wired Core v0.5 endpoint.

Required GPT-3 fix:
- update version/capability metadata to represent the current supported Core contracts accurately;
- prefer an explicit field such as `core_contract_current: "0.5"` and optionally `core_contract_legacy: ["0.2"]` if legacy v0.2 remains supported;
- do not remove the legacy endpoint without an explicit deprecation decision.

## Release gate result
Standalone production runtime: `VERIFIED@
Core v0.5 integration + CI: `VERIFIED@
Production calculation smoke: `VERFIED`
Official PDF release security: `BLOCKED`
Version/capability metadata consistency: `BLOCKED`

Stage 5 must remain `IN-PROGRESS` until the two blockers above are fixed and CI passes again.

## Ownership
- GPT-2: no action required;
- GPT-3: application/API/report gating/version metadata fixes and regression tests.
- GPT-4: re-audit CI, production behavior, Core compliance and release gate after the fix.
