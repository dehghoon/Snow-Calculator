from ..models.inputs import CommonSnowInputs
from ..models.results import CommonParameters
from ..models.enums import RoofSurfaceType
from ..validation.rules import validate_common_inputs
from ..validation.errors import InvalidInputError


def calculate_gamma(ss: float) -> float:
    """Calculate snow density parameter gamma.

    Formula ID: NBCC20-GAMMA-001
    Equation: gamma = min(0.43*Ss + 2.2, 4.0)
    Units: Ss in kPa; gamma in kN/m^3.
    """
    if ss <= 0:
        raise InvalidInputError("ss must be greater than zero (ERR_SS_NONPOSITIVE).")
    return min(0.43 * ss + 2.2, 4.0)


def calculate_cs(alpha_degrees: float, surface_type: RoofSurfaceType) -> float:
    """Calculate piecewise roof slope factor Cs.

    Formula ID: NBCC20-CS-001 (handoff identifier).
    Approved specification logic:
      - normal: 1 through 30 deg, linear to 0 at 70 deg;
      - smooth/slippery: 1 through 15 deg, linear to 0 at 60 deg.
    """
    if alpha_degrees < 0 or alpha_degrees > 90:
        raise InvalidInputError("alpha_degrees must be between 0 and 90 degrees.")

    if surface_type is RoofSurfaceType.NORMAL:
        if alpha_degrees <= 30:
            return 1.0
        if alpha_degrees >= 70:
            return 0.0
        return (70.0 - alpha_degrees) / 40.0

    if surface_type is RoofSurfaceType.SMOOTH_SLIPPERY:
        if alpha_degrees <= 15:
            return 1.0
        if alpha_degrees >= 60:
            return 0.0
        return (60.0 - alpha_degrees) / 45.0

    raise InvalidInputError(f"Unsupported roof_surface_type: {surface_type!r}.")


def calculate_common_parameters(inputs: CommonSnowInputs) -> CommonParameters:
    """Validate common inputs and derive gamma and Cs."""
    validate_common_inputs(inputs)
    return CommonParameters(
        gamma=calculate_gamma(inputs.ss),
        cs=calculate_cs(inputs.roof_slope_alpha, inputs.roof_surface_type),
    )


def calculate_sr_applicable(
    *,
    ss: float,
    sr_climatic: float,
    cb: float,
    cw: float,
    cs: float,
    ca: float,
) -> float:
    """Apply rain-load limit.

    Formula ID: NBCC20-SR-001
    Equation: min(Sr_climatic, Ss*(Cb*Cw*Cs*Ca))
    """
    if ss <= 0 or cb <= 0 or cw <= 0 or cs < 0 or ca < 0 or sr_climatic < 0:
        raise InvalidInputError("Invalid input domain for NBCC20-SR-001.")
    return min(sr_climatic, ss * (cb * cw * cs * ca))


def calculate_specified_snow_load(
    *,
    is_factor: float,
    ss: float,
    cb: float,
    cw: float,
    cs: float,
    ca: float,
    sr_applicable: float,
) -> float:
    """Calculate specified roof snow load S.

    Formula ID: NBCC20-SNOW-001
    Equation: S = Is*[Ss*(Cb*Cw*Cs*Ca) + Sr_applicable]
    Output unit: kPa.
    """
    values = (is_factor, ss, cb, cw)
    if any(v <= 0 for v in values) or cs < 0 or ca < 0 or sr_applicable < 0:
        raise InvalidInputError("Invalid input domain for NBCC20-SNOW-001.")
    return is_factor * (ss * (cb * cw * cs * ca) + sr_applicable)
