from dataclasses import dataclass, field
from .enums import CaseId, CalculationStatus


@dataclass(frozen=True)
class CommonParameters:
    gamma: float
    cs: float


@dataclass(frozen=True)
class LowerRoofCaseResult:
    case_id: CaseId
    beta: float
    lcs: float
    hp_prime: float
    snow_source_factor_f: float
    ca0_height_term: float
    ca0_source_term: float
    ca0: float
    xd_code: float
    xd_used: float
    drift_truncated: bool
    status: CalculationStatus
    warnings: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class ProjectionResult:
    exempt: bool
    ca0_height: float | None
    ca0_length: float | None
    ca0: float
    ca0_governing_term: str | None
    xd_height: float | None
    xd_length: float | None
    xd_code: float
    xd_used: float
    xd_governing_term: str | None
    drift_truncated: bool
    status: CalculationStatus
    warnings: tuple[str, ...] = field(default_factory=tuple)
