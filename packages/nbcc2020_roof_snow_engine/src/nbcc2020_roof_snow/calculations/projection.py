from ..models.inputs import ProjectionInput
from ..models.results import ProjectionResult
from ..models.enums import CalculationStatus
from ..validation.rules import validate_projection
from ..validation.errors import InvalidInputError


def calculate_projection_ca0_terms(
    *, gamma: float, h: float, cb: float, ss: float, l0: float
) -> tuple[float, float, float, str]:
    """Formula ID NBCC20-PAR-CA0-001 and its two reported competing terms."""
    if gamma <= 0 or h < 0 or cb <= 0 or ss <= 0 or l0 <= 0:
        raise InvalidInputError("Invalid input domain for NBCC20-PAR-CA0-001.")
    height = 0.67 * gamma * h / (cb * ss)
    length = gamma * l0 / (7.5 * cb * ss) + 1.0
    if height <= length:
        return height, length, height, "height"
    return height, length, length, "length"


def calculate_projection_xd_terms(*, h: float, l0: float) -> tuple[float, float, float, str]:
    """Formula ID NBCC20-PAR-XD-001 and its two reported competing terms."""
    if h < 0 or l0 <= 0:
        raise InvalidInputError("Invalid input domain for NBCC20-PAR-XD-001.")
    height = 3.35 * h
    length = 2.0 * l0 / 3.0
    if height <= length:
        return height, length, height, "height"
    return height, length, length, "length"


def calculate_projection_drift(
    inputs: ProjectionInput,
    *,
    gamma: float,
    cb: float,
    ss: float,
) -> ProjectionResult:
    """Calculate Article 4.1.6.7 projection/parapet drift per approved specification."""
    validate_projection(inputs)
    if gamma <= 0 or cb <= 0 or ss <= 0:
        raise InvalidInputError("gamma, cb and ss must be greater than zero.")

    l0 = inputs.projection_longest_dimension
    if l0 < 3.0:
        return ProjectionResult(
            exempt=True,
            ca0_height=None,
            ca0_length=None,
            ca0=1.0,
            ca0_governing_term=None,
            xd_height=None,
            xd_length=None,
            xd_code=0.0,
            xd_used=0.0,
            xd_governing_term=None,
            drift_truncated=False,
            status=CalculationStatus.EXEMPT,
        )

    ca_h, ca_l, ca0, ca_gov = calculate_projection_ca0_terms(
        gamma=gamma, h=inputs.projection_height, cb=cb, ss=ss, l0=l0
    )
    xd_h, xd_l, xd_code, xd_gov = calculate_projection_xd_terms(
        h=inputs.projection_height, l0=l0
    )

    # A non-positive accumulation factor must not create a negative physical drift.
    if ca0 <= 1.0:
        xd_code = 0.0

    xd_used = xd_code
    truncated = False
    warnings: list[str] = []
    if inputs.available_drift_length is not None and xd_used > inputs.available_drift_length:
        xd_used = inputs.available_drift_length
        truncated = True
        warnings.append("WARN_DRIFT_TRUNCATED")

    status = CalculationStatus.NO_DRIFT if xd_code == 0.0 else CalculationStatus.OK
    return ProjectionResult(
        exempt=False,
        ca0_height=ca_h,
        ca0_length=ca_l,
        ca0=ca0,
        ca0_governing_term=ca_gov,
        xd_height=xd_h,
        xd_length=xd_l,
        xd_code=xd_code,
        xd_used=xd_used,
        xd_governing_term=xd_gov,
        drift_truncated=truncated,
        status=status,
        warnings=tuple(warnings),
    )
