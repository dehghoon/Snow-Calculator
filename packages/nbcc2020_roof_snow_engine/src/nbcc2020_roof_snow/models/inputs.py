from dataclasses import dataclass
from .enums import RoofSurfaceType, CaseId, ApplicabilityStatus


@dataclass(frozen=True)
class CommonSnowInputs:
    """Common calculation inputs.

    Units:
        ss: kPa
        sr_climatic: kPa
        roof_slope_alpha: degrees
        is_factor: dimensionless, user-selected
        cw: dimensionless, user-selected
        cb: dimensionless, user-selected
        h_prime: m, user-entered where required by drift geometry
    """
    ss: float
    sr_climatic: float
    roof_slope_alpha: float
    roof_surface_type: RoofSurfaceType
    is_factor: float
    cw: float
    cb: float
    h_prime: float | None = None
    adjacent_surface_drift_applicable: bool = False


@dataclass(frozen=True)
class LowerRoofCaseInput:
    """Lower adjacent roof case input geometry."""
    case_id: CaseId
    ls: float
    ws: float
    step_height: float
    parapet_height: float
    applicability_status: ApplicabilityStatus = ApplicabilityStatus.APPLICABLE
    available_drift_length: float | None = None


@dataclass(frozen=True)
class ProjectionInput:
    """Projection/parapet input geometry."""
    projection_height: float
    projection_longest_dimension: float
    available_drift_length: float | None = None
