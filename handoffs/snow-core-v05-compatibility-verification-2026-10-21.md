# Snow Calculator — Core v0.5 compatibility verification record

Date: 2026-10-21
Repository: `dehghoon/Snow-Calculator`
Canonical Core: `dehghoon/linkoteq-structural-core`, schema `0.5`
Status: **Core compatibility verified in CI; live API verification pending**

## Approved scope

The Core compatibility gate from PR #11 was merged into `main` as
`5fccf64c4f8a21687d61c72dc6316002a58ded35`. It changes only governance
files, not snow formulas, engine, API handlers or UI. GitHub Actions for that
exact main commit both completed successfully:
- `Production Quality Gate`: PASS
- `Canonical Core compatibility`: PASS

The repository includes tests for Core v0.5 canonical writeback:
- uniform surface pressure and provenance;
- nonuniform distribution segments mapped to unique stable surface IDs;
- rejection of incomplete or lossy mappings with HTTP 422;
- parity with standalone snow calculation.

These checks provide **repository-level compatibility evidence**, not a
guarantee that every production API endpoint is externally reachable.

## Production evidence and limitation

Production URL: https://snow.linkoteq.com
- Vercel production deployment of `5fccf64c` reported READY.
- User explicitly reported that the website functions normally.
  This is user-observed UI functionality, **not** independent API smoke evidence.
- Prior Stage 5 standalone release evidence:
  `handoffs/gpt4-stage5-final-closeout.md`; it concerns an earlier release
  and must not be misrepresented as a fresh production API probe.
- PR #12 adds a read-only external API verification workflow and JSON artifacts.
- Initial run: https://github.com/dehghoon/Snow-Calculator/actions/runs/39678710597
  failed: `/api/health` HTTP 404.
- Diagnostic run: https://github.com/dehghoon/Snow-Calculator/actions/runs/39679854096
  failed: all six probes (`/api/health`, `/health`, `/api/version`,
  `/version`, `/api/openapi.json`, `/openapi.json`) returned HTTP 404.
  This does not establish that the UI or calculation engine is broken.
- Production API parity, route reachability and independent end-to-end
  verification: **NOT VERIFIED** by these runs.

## Decision and follow-up

- **PASS:** Core v0.5 repository compatibility and existing quality gate.
- **USER-OBSERVED PASS:** Production UI functionality.
- **PENDING:** Independent live API smoke / standalone-to-Core parity.
- **NO CHANGE:** No formulas, backend routes, Vercel settings or production
  configuration were modified to obtain this sign-off.
- Keep PR #12 **draft and unmerged** until its live checks can pass or a
  separately reviewed verification method is agreed upon.
- Required-status-check branch protection is not claimed to be enabled.

This record intentionally distinguishes verified engineering compatibility
from incomplete operational API verification.
