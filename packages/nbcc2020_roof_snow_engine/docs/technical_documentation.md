# NBCC 2020 Roof Snow Calculation Engine

## Purpose

This package implements the calculation logic explicitly defined in the user-approved
`NBCC2020_Roof_Snow_Engineering_Calculation_Specification_APPROVED` document.

It is a standalone Python library and has no dependency on UI frameworks, FastAPI,
databases, Supabase, or frontend code.

## Governing Standard

National Building Code of Canada 2020, Division B, Part 4, primarily Subsection 4.1.6,
as mapped by the approved specification.

## Supported Production Logic

- `NBCC20-GAMMA-001`
- `NBCC20-CS-001` (piecewise logic stated in the approved specification and identifier
  required by the handoff)
- `NBCC20-LCS-001`
- `NBCC20-HPPRIME-001`
- `NBCC20-F-001`
- `NBCC20-CA0-CASE-001`
- `NCC20-XD-001`
- `NBCC20-CA-X-001`
- `NBCC20-PAR-CA0-001`
- `NBCC20-PAR-XD-001`
- `NBCC20-SR-001`
- `NBCC20-SNOW-001`

## User-Selected Engineering Parameters

The clarified implementation treats the following as direct user inputs:

- `Is`
- `Cw`
- `Cb`
- `h_prime`

The calculation engine does not derive these four values. Application layers may read
`models.guidance.USER_INPUT_GUIDANCE` to display code-selection guidance beside input
controls without coupling the engineering library to any UI.

Explicit enforceable rule retained from the approved specification:
adjacent-surface drift requires `Cw = 1.0`.

## Units

SI units are used. Snow loads are in kPa; dimensions are in metres; angles are degrees.
No silent unit conversion is performed.

## Validation and Error Handling

The library fails early for nonpositive `Ss`, invalid formula domains, incomplete/invalid
geometry, negative dimensions, invalid slope ranges, invalid square-root radicands, and
the explicit adjacent-drift `Cw` condition.

Negative physical drift length is not returned; it becomes a documented `NO_DRIFT` state.

## Projection Boundary

A projection with `l0 < 3.0 m` exempt according to the approved specification.
``0 = 3.0 m` is not exempt.

## Figure Interpretation Limitation

Source/code figures are interpretation aids only. Dimensions must not be inferred by
scaling or measuring figures. Ambiguous geometry requires engineering review.

## Benchmarks

The approved specification supplies rounded expected values for Commentary Samples 1
and 2 but does not include a complete reproducible input dataset in the approved
specification itself. Therefore this package does not fabricate benchmark inputs.
Formula-level and boundary tests are included. Official benchmark tests should be added
when the controlled benchmark input dataset is supplied.

## Excluded / Not Invented

The package intentionally does not implement:

- internal derivation of `Is`, `Cw`, `Cb`, or `h_prime`;
- the unspecified large-roof exponential `Cb` branch;
- the unspecified low-height `Cb` criterion;
- Article 4.1.6.8 corner drift;
- workbook `xf()` reconstruction;
- legacy formulas not explicitly supplied as an implementation specification.

## Traceability

Every implemented engineering function includes its Formula ID in its docstring.
Tests are named by calculation behavior and exercise each important implemented formula.

## Professional Release

User approval of the specification is not represented as professional engineering
approval. Professional release remains subject to review by the responsible licensed
engineer and applicable jurisdiction.
