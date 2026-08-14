import math
from ..models.inputs import CommonSnowInputs, LowerRoofCaseInput, ProjectionInput
from ..models.enums import ApplicabilityStatus
from .errors import InvalidInputError, InsufficientGeometryError


def _require_finite(name: str, value: float) -> None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise InvalidInputError(f"{name} must be a real numeric value.")
    if not math.isfinite(float(value)):
        raise InvalidInputError(f"{name} must be finite.")


def _require_positive(name: str, value: float) -> None:
    _require_finite(name, value)
    if value <= 0:
        raise InvalidInputError(f"{name} must be greater than zero.")


def _require_nonnegative(name: str, value: float) -> None:
    _require_finite(name, value)
    if value < 0:
        raise InvalidInputError(f"{name} must be greater than or equal to zero.")


def validate_common_inputs(inputs: CommonSnowInputs) -> None:
    _require_positive("ss", inputs.ss)
    _require_nonnegative("sr_climatic", inputs.sr_climatic)
    _require_nonnegative("roof_slope_alpha", inputs.roof_slope_alpha)
    if inputs.roof_slope_alpha > 90:
        raise InvalidInputError("roof_slope_alpha must not exceed 90 degrees.")
    _require_positive("is_factor", inputs.is_factor)
    _require_positive("cw", inputs.cw)
    _require_positive("cb", inputs.cb)
    if inputs.h_prime is not None:
        _require_nonnegative("h_prime", inputs.h_prime)
    if inputs.adjacent_surface_drift_applicable and not math.isclose(inputs.cw, 1.0, rel_tol=0.0, abs_tol=1e-12):
        raise InvalidInputError(
            "cw must equal 1.0 when adjacent_surface_drift_applicable is True "
            "(NBCC20-CW-001)."
        )


def validate_lower_roof_case(case: LowerRoofCaseInput) -> None:
    if case.applicability_status is ApplicabilityStatus.INSUFFICIENT_GEOMETRY:
        raise InsufficientGeometryError(
            "Lower-roof case geometry is insufficient. Engineering review is required; "
            "missing dimensions must not be inferred from figures."
        )
    if case.applicability_status is ApplicabilityStatus.NOT_APPLICABLE:
        raise InvalidInputError("A NOT_APPLICABLE lower-roof case must not be calculated.")
    _require_positive("ls", case.ls)
    _require_positive("ws", case.ws)
    if case.ws > case.ls:
        raise InvalidInputError("ws must not exceed ls for lcs = 2*ws - ws^2/ls.")
    _require_nonnegative("step_height", case.step_height)
    _require_nonnegative("parapet_height", case.parapet_height)
    if case.available_drift_length is not None:
        _require_nonnegative("available_drift_length", case.available_drift_length)


def validate_projection(inputs: ProjectionInput) -> None:
    _require_nonnegative("projection_height", inputs.projection_height)
    _require_positive("projection_longest_dimension", inputs.projection_longest_dimension)
    if inputs.available_drift_length is not None:
        _require_nonnegative("available_drift_length", inputs.available_drift_length)
