from enum import Enum


class RoofSurfaceType(str, Enum):
    NORMAL = "normal"
    SMOOTH_SLIPPERY = "smooth_slippery"


class CaseId(str, Enum):
    CASE_I = "I"
    CASE_II = "II"
    CASE_III = "III"


class ApplicabilityStatus(str, Enum):
    APPLICABLE = "APPLICABLE"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    INSUFFICIENT_GEOMETRY = "INSUFFICIENT_GEOMETRY"


class CalculationStatus(str, Enum):
    OK = "OK"
    NO_DRIFT = "NO_DRIFT"
    EXEMPT = "EXEMPT"
    REQUIRES_ENGINEERING_REVIEW = "REQUIRES_ENGINEERING_REVIEW"
