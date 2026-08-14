from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class CalculationMode(str, Enum):
    UNIFORM_ROOF = "UNIFORM_ROOF"
    LOWER_ADJACENT_ROOF = "LOWER_ADJACENT_ROOF"
    ROOF_PROJECTION_OR_PARAPET = "ROOF_PROJECTION_OR_PARAPET"


class RoofSurfaceType(str, Enum):
    NORMAL = "normal"
    SMOOTH_SLIPPERY = "smooth_slippery"


class ApplicabilityStatus(str, Enum):
    APPLICABLE = "APPLICABLE"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    INSUFFICIENT_GEOMETRY = "INSUFFICIENT_GEOMETRY"


class CommonInputs(BaseModel):
    ss: float = Field(gt=0, description="Ground snow load, kPa")
    sr_climatic: float = Field(ge=0, description="Associated rain load, kPa")
    roof_slope_alpha: float = Field(ge=0, le=90, description="Roof slope, degrees")
    roof_surface_type: RoofSurfaceType = RoofSurfaceType.NORMAL
    is_factor: float = Field(gt=0, alias="is")
    cw: float = Field(gt=0)
    cb: float = Field(gt=0)
    h_prime: float | None = Field(default=None, ge=0)
    adjacent_surface_drift_applicable: bool = False
    is_override_reason: str | None = None
    cw_override_reason: str | None = None

    model_config = {"populate_by_name": True}


class LowerRoofCaseGeometry(BaseModel):
    case_id: Literal["I", "II", "III"]
    source_surface: str
    receiving_surface: str
    drift_direction: str
    ls: float = Field(gt=0)
    ws: float = Field(gt=0)
    step_height: float = Field(ge=0)
    parapet_height: float = Field(ge=0, default=0)
    available_drift_length: float | None = Field(default=None, gt=0)
    roof_step_reference: str | None = None
    parapet_reference: str | None = None
    figure_reference: str | None = None
    applicability_status: ApplicabilityStatus = ApplicabilityStatus.APPLICABLE
    interpretation_note: str = ""

    @model_validator(mode="after")
    def validate_source_area(self):
        if self.applicability_status == ApplicabilityStatus.APPLICABLE and self.ws > self.ls:
            raise ValueError("For applicable cases, ws must not exceed ls.")
        return self


class ProjectionGeometry(BaseModel):
    projection_height: float = Field(ge=0)
    projection_longest_dimension: float = Field(gt=0)
    available_drift_length: float | None = Field(default=None, gt=0)


class CalculationRequest(BaseModel):
    mode: CalculationMode
    jurisdiction: str = "Model code calculation; jurisdiction-specific amendments not verified"
    common: CommonInputs
    lower_roof_cases: list[LowerRoofCaseGeometry] = Field(default_factory=list)
    projection: ProjectionGeometry | None = None
    distribution_points: int = Field(default=8, ge=2, le=50)

    @model_validator(mode="after")
    def validate_mode_payload(self):
        if self.mode == CalculationMode.LOWER_ADJACENT_ROOF and not self.lower_roof_cases:
            raise ValueError("lower_roof_cases is required for LOWER_ADJACENT_ROOF.")
        if self.mode == CalculationMode.ROOF_PROJECTION_OR_PARAPET and self.projection is None:
            raise ValueError("projection is required for ROOF_PROJECTION_OR_PARAPET.")
        return self


class CalculationResponse(BaseModel):
    calculation_status: str
    calculation_basis: str = "NBCC 2020 production calculation"
    code_edition: str = "NBCC 2020"
    jurisdiction: str
    inputs: dict[str, Any]
    interpreted_geometry: dict[str, Any]
    case_geometry: list[dict[str, Any]]
    derived_parameters: dict[str, Any]
    case_results: list[dict[str, Any]]
    governing_case: dict[str, Any] | None
    projection_result: dict[str, Any] | None
    distribution_segments: list[dict[str, Any]]
    final_results: dict[str, Any]
    warnings: list[str]
    errors: list[str]
    references: list[dict[str, str]]
    validation_trace: list[dict[str, str]]
    figure_metadata: list[dict[str, Any]]
    report_data: dict[str, Any]


class ErrorResponse(BaseModel):
    error: str
    code: str
    detail: str


class ReportPreviewResponse(BaseModel):
    report_revision: str
    title: str
    sections: list[dict[str, Any]]
    figures: list[dict[str, Any]]
    official_pdf_available: bool
    entitlement_required: bool = True
