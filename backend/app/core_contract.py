from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field

from .schemas import CalculationRequest, CalculationResponse


class CoreSnowRequest(BaseModel):
    """Direct Linkoteq Structural Core integration request.

    The standalone snow calculator request remains unchanged. This envelope is used by the
    integrated 3D workflow and intentionally follows the Structural Core v0.2 boundary.
    """

    model_schema_version: Literal["0.2"] = "0.2"
    project_id: str
    run_id: str
    calculator: Literal["snow"] = "snow"
    target_surface_id: str
    calculation: CalculationRequest


class CoreLoadSource(BaseModel):
    id: str
    category: Literal["snow"] = "snow"
    name: str = "NBCC roof snow"
    calculator: Literal["snow"] = "snow"
    calculatorVersion: str = "0.1.0"
    codeEdition: str = "NBCC 2020"
    jurisdiction: str | None = None
    status: Literal["generated", "error"] = "generated"
    inputs: dict[str, Any] = Field(default_factory=dict)
    summary: dict[str, Any] = Field(default_factory=dict)
    generatedAt: str


class CoreLoadCase(BaseModel):
    id: str
    name: str = "Snow"
    category: Literal["snow"] = "snow"
    sourceId: str
    analysisType: Literal["static"] = "static"


class CoreLoad(BaseModel):
    id: str
    type: Literal["area"] = "area"
    targetId: str
    targetType: Literal["surface"] = "surface"
    loadCaseId: str
    direction: dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0, "z": -1.0})
    magnitude: float
    unit: Literal["kPa"] = "kPa"
    distribution: list[dict[str, float]] | None = None
    provenance: dict[str, str]


class CoreSnowWriteback(BaseModel):
    runId: str
    modelSchemaVersion: Literal["0.2"] = "0.2"
    loadSources: list[CoreLoadSource]
    loadCases: list[CoreLoadCase]
    loads: list[CoreLoad]
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    trace: list[dict[str, Any]] = Field(default_factory=list)


def build_core_writeback(payload: CoreSnowRequest, calculation: CalculationResponse) -> CoreSnowWriteback:
    source_id = f"LS_SNOW_{payload.run_id}"
    case_id = f"LC_SNOW_{payload.run_id}"
    load_id = f"LOAD_SNOW_{payload.run_id}"

    final = calculation.final_results
    magnitude = final.get("governing_snow_load_kpa")
    if magnitude is None:
        magnitude = final.get("peak_snow_load_kpa")
    if magnitude is None:
        raise ValueError("Snow calculation did not produce a governing or peak snow load.")

    distribution = None
    if calculation.distribution_segments:
        distribution = [
            {"position": float(item.get("x_m", 0.0)), "magnitude": float(item["snow_load_kpa"])}
            for item in calculation.distribution_segments
            if "snow_load_kpa" in item
        ]

    now = datetime.now(timezone.utc).isoformat()
    source = CoreLoadSource(
        id=source_id,
        jurisdiction=calculation.jurisdiction,
        inputs=calculation.inputs,
        summary={
            "calculation_status": calculation.calculation_status,
            "final_results": calculation.final_results,
            "governing_case": calculation.governing_case,
        },
        generatedAt=now,
    )
    load_case = CoreLoadCase(id=case_id, sourceId=source_id)
    load = CoreLoad(
        id=load_id,
        targetId=payload.target_surface_id,
        loadCaseId=case_id,
        magnitude=float(magnitude),
        distribution=distribution,
        provenance={
            "sourceId": source_id,
            "calculatorRunId": payload.run_id,
            "formulaRef": "NBCC 2020 roof snow calculation",
        },
    )
    return CoreSnowWriteback(
        runId=payload.run_id,
        loadSources=[source],
        loadCases=[load_case],
        loads=[load],
        warnings=calculation.warnings,
        errors=calculation.errors,
        trace=calculation.validation_trace,
    )
