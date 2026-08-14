import math
from collections.abc import Iterable
from ..models.inputs import LowerRoofCaseInput
from ..models.results import LowerRoofCaseResult
from ..models.enums import CaseId, CalculationStatus
from ..validation.rules import validate_lower_roof_case
from ..validation.errors import InvalidInputError, InvalidRadicandError


def calculate_lcs(ls: float, ws: float) -> float:
    """Formula ID NBCC20-LCS-001: lcs = 2*ws - ws^2/ls."""
    if ls <= 0 or ws <= 0 or ws > ls:
        raise InvalidInputError("Require ls > 0 and 0 < ws <= ls for NBCC20-LCS-001.")
    return 2.0 * ws - (ws * ws) / ls


def calculate_hp_prime(*, parapet_height: float, ss: float, gamma: float, lcs: float) -> float:
    """Formula ID NBCC20-HPPRIME-001.

    hp_prime = min(max(hp - 0.8*Ss/gamma, 0), lcs/5)
    """
    if parapet_height < 0 or ss <= 0 or gamma <= 0 or lcs <= 0:
        raise InvalidInputError("Invalid input domain for NBCC20-HPPRIME-001.")
    return min(max(parapet_height - 0.8 * ss / gamma, 0.0), lcs / 5.0)


def beta_for_case(case_id: CaseId) -> float:
    """Return approved case factor: 1.0 for Case I; 0.67 for Cases II/III."""
    return 1.0 if case_id is CaseId.CASE_I else 0.67


def calculate_snow_source_factor(
    *,
    beta: float,
    gamma: float,
    lcs: float,
    hp_prime: float,
    ss: float,
    cb: float,
) -> float:
    """Formula ID NBCC20-F-001."""
    if ss <= 0 or cb <= 0 or gamma <= 0 or beta <= 0:
        raise InvalidInputError("Invalid input domain for NBCC20-F-001.")
    radicand = gamma * (lcs - 5.0 * hp_prime) / ss
    if radicand < -1e-12:
        raise InvalidRadicandError(
            f"NBCC20-F-001 square-root radicand is negative ({radicand})."
        )
    return 0.35 * beta * math.sqrt(max(radicand, 0.0)) + cb


def calculate_case_ca0(
    *,
    beta: float,
    gamma: float,
    step_height: float,
    cb: float,
    ss: float,
    snow_source_factor_f: float,
) -> tuple[float, float, float]:
    """Formula ID NBCC20-CA0-CASE-001.

    Returns (height_term, source_term, governing_ca0).
    """
    if beta <= 0 or gamma <= 0 or step_height < 0 or cb <= 0 or ss <= 0:
        raise InvalidInputError("Invalid input domain for NBCC20-CA0-CASE-001.")
    height_term = beta * gamma * step_height / (cb * ss)
    source_term = snow_source_factor_f / cb
    return height_term, source_term, min(height_term, source_term)


def calculate_xd(*, cb: float, ss: float, gamma: float, ca0: float) -> float:
    """Formula ID NBCC20-XD-001.

    Negative physical drift lengths are returned as 0.0 (documented no-drift state).
    """
    if cb <= 0 or ss <= 0 or gamma <= 0 or ca0 < 0:
        raise InvalidInputError("Invalid input domain for NBCC20-XD-001.")
    return max(0.0, 5.0 * (cb * ss / gamma) * (ca0 - 1.0))


def calculate_ca_at_x(*, ca0: float, xd: float, x: float) -> float:
    """Formula ID NBCC20-CA-X-001.

    Ca(x)=Ca0-(Ca0-1)x/xd over drift; 1 beyond tail.
    """
    if ca0 < 0 or xd < 0 or x < 0:
        raise InvalidInputError("ca0, xd and x must be nonnegative.")
    if xd == 0.0 or x >= xd:
        return 1.0
    return ca0 - (ca0 - 1.0) * x / xd


def calculate_lower_roof_case(
    case: LowerRoofCaseInput,
    *,
    ss: float,
    gamma: float,
    cb: float,
) -> LowerRoofCaseResult:
    """Calculate one applicable lower-roof source-area case."""
    validate_lower_roof_case(case)
    if ss <= 0 or gamma <= 0 or cb <= 0:
        raise InvalidInputError("ss, gamma and cb must be greater than zero.")

    lcs = calculate_lcs(case.ls, case.ws)
    hp_prime = calculate_hp_prime(
        parapet_height=case.parapet_height, ss=ss, gamma=gamma, lcs=lcs
    )
    beta = beta_for_case(case.case_id)
    f = calculate_snow_source_factor(
        beta=beta, gamma=gamma, lcs=lcs, hp_prime=hp_prime, ss=ss, cb=cb
    )
    height_term, source_term, ca0 = calculate_case_ca0(
        beta=beta,
        gamma=gamma,
        step_height=case.step_height,
        cb=cb,
        ss=ss,
        snow_source_factor_f=f,
    )
    xd_code = calculate_xd(cb=cb, ss=ss, gamma=gamma, ca0=ca0)
    xd_used = xd_code
    truncated = False
    warnings: list[str] = []
    if case.available_drift_length is not None and xd_used > case.available_drift_length:
        xd_used = case.available_drift_length
        truncated = True
        warnings.append("WARN_DRIFT_TRUNCATED")

    status = CalculationStatus.NO_DRIFT if xd_code == 0.0 else CalculationStatus.OK
    return LowerRoofCaseResult(
        case_id=case.case_id,
        beta=beta,
        lcs=lcs,
        hp_prime=hp_prime,
        snow_source_factor_f=f,
        ca0_height_term=height_term,
        ca0_source_term=source_term,
        ca0=ca0,
        xd_code=xd_code,
        xd_used=xd_used,
        drift_truncated=truncated,
        status=status,
        warnings=tuple(warnings),
    )


def select_governing_lower_roof_case(
    results: Iterable[LowerRoofCaseResult],
    *,
    tolerance: float = 1e-12,
) -> tuple[LowerRoofCaseResult, tuple[str, ...]]:
    """Select the maximum Ca0 from all applicable evaluated cases."""
    items = tuple(results)
    if not items:
        raise InvalidInputError("At least one applicable lower-roof case is required.")
    governing = max(items, key=lambda item: item.ca0)
    ties = [item for item in items if math.isclose(item.ca0, governing.ca0, abs_tol=tolerance, rel_tol=0.0)]
    warnings = ("WARN_MULTIPLE_GOVERNING_CASES",) if len(ties) > 1 else ()
    return governing, warnings
