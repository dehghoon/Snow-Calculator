from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field

from .schemas import CalculationRequest, CalculationResponse

CORE_SCHEMA_VERSION = "0.5"
CALCULATOR_ID = "snow"
CALCULATOR_VERSION = "0.1.0"

class UnitValue(BaseModel):
    value: float
    unit: str

class CoreSnowInputs(BaseModel):
    calculation: CalculationRequest
    segmentSurfaceIds: list[str] | None = None

class CoreSnowV05Request(BaseModel):
    modelSchemaVersion: Literal["0.5"] = CORE_SCHEMA_VERSION
    projectId: str
    runId: str
    calculator: Literal["snow"] = CALCULATOR_ID
    calculatorVersion: str = CALCULATOR_VERSION
    targetIds: list[str]
    inputs: CoreSnowInputs

class CoreLoadSource(BaseModel):
    id: str
    category: Literal["snow"] = "snow"
    name: str = "NBCC roof snow"
    calculator: Literal["snow"] = CALCULATOR_ID
    calculatorVersion: str = CALCULATOR_VERSION
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

class CoreLoadProvenance(BaseModel):
    sourceId: str
    calculatorRunId: str
    formulaRef: str = "NBCC 2020 roof snow calculation"
    note: str | None = None

class CoreSurfacePressureLoad(BaseModel):
    id: str
    type: Literal["surface-pressure"] = "surface-pressure"
    loadCaseId: str
    surfaceId: str
    pressure: UnitValue
    convention: Literal["surface-normal"] = "surface-normal"
    provenance: CoreLoadProvenance

class CoreSnowV05Writeback(BaseModel):
    runId: str
    modelSchemaVersion: Literal["0.5"] = CORE_SCHEMA_VERSION
    loadSources: list[CoreLoadSource] = Field(default_factory=list)
    loadCases: list[CoreLoadCase] = Field(default_factory=list)
    loads: list[CoreSurfacePressureLoad] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    trace: list[dict[str, Any]] = Field(default_factory=list)

def _final_pressure(calculation: CalculationResponse) -> float:
    final = calculation.final_results
    pressure = final.get("governing_snow_load_kpa")
    if pressure is None:
        pressure = final.get("peak_snow_load_kpa")
    if pressure is None:
        raise ValueError("Snow calculation did not produce a governing or peak snow load.")
    return float(pressure)

def _source(payload: CoreSnowV05Request, calculation: CalculationResponse, status: Literal["generated", "error"]) -> CoreLoadSource:
    return CoreLoadSource(
        id=f"LS_SNOW_{payload.runId}",
        jurisdiction=calculation.jurisdiction,
        status=status,
        inputs=calculation.inputs,
        summary={
            "calculation_status": calculation.calculation_status,
            "final_results": calculation.final_results,
            "governing_case": calculation.governing_case,
        },
        generatedAt=datetime.now(timezone.utc).isoformat(),
    )

def build_core_v05_writeback(payload: CoreSnowV05Request, calculation: CalculationResponse) -> CoreSnowV05Writeback:
    source_id = f"LS_SNOW_{payload.runId}"
    case_id = f"LC_SNOW_{payload.runId}"
    source = _source(payload, calculation, "generated")
    load_case = CoreLoadCase(id=case_id, sourceId=source_id)

    warnings = list(calculation.warnings)
    errors = list(calculation.errors)
    loads: list[CoreSurfacePressureLoad] = []
    trace: list[dict[str, Any]] = [
        {"stage": "core_contract", "status": "PASS", "schemaVersion": CORE_SCHEMA_VERSION},
        {"stage": "snow_calculation", "status": calculation.calculation_status, "engineeringEnginePreserved": True},
    ]

    segments = calculation.distribution_segments or []
    if segments:
        segment_surface_ids = payload.inputs.segmentSurfaceIds or []
        if len(segment_surface_ids) != len(segments):
            errors.append(
                "CORE_V05_SURFACE_SEGMENT_MAPPING_REQUIRED: non-uniform snow distribution requires one stable Core surface ID per distribution segment."
            )
            trace.append({
                "stage": "surface_pressure_mapping",
                "status": "ERROR",
                "segmentCount": len(segments),
                "surfaceIdCount": len(segment_surface_ids),
                "reason": "lossy mapping refused",
            })
        else:
            for index, (segment, surface_id) in enumerate(zip(segments, segment_surface_ids, strict=True)):
                if "snow_load_kpa" not in segment:
                    errors.append(
                        f"CORE_V05_SEGMENT_PRESSURE_MISSING: distribution segment {index} has no snow_load_kpa."
                    )
                    continue
                loads.append(
                    CoreSurfacePressureLoad(
                        id=f"LOAD_SNOW_{payload.runId}_{index + 1}",
                        loadCaseId=case_id,
                        surfaceId=surface_id,
                        pressure=UnitValue(value=float(segment["snow_load_kpa"]), unit="kPa"),
                        provenance=CoreLoadProvenance(
                            sourceId=source_id,
                            calculatorRunId=payload.runId,
                            note=f"Snow distribution segment {index + 1}",
                        ),
                    )
                )
            trace.append({
                "stage": "surface_pressure_mapping",
                "status": "PASS" if not errors else "WARNING",
                "segmentCount": len(segments),
                "mappedLoadCount": len(loads),
            })
    else:
        if len(payload.targetIds) != 1:
            errors.append(
                "CORE_V05_UNIFORM_TARGET_REQUIRED: uniform roof snow requires exactly one target surface ID."
            )
        else:
            loads.append(
                CoreSurfacePressureLoad(
                    id=f"LOAD_SNOW_{payload.runId}",
                    loadCaseId=case_id,
                    surfaceId=payload.targetIds[0],
                    pressure=UnitValue(value=_final_pressure(calculation), unit="kPa"),
                    provenance=CoreLoadProvenance(
                        sourceId=source_id,
                        calculatorRunId=payload.runId,
                    ),
                )
            )
            trace.append({"stage": "surface_pressure_mapping", "status": "PASS", "mappedLoadCount": 1})

    if errors:
        source.status = "error"

    return CoreSnowV05Writeback(
        runId=payload.runId,
        loadSources=[source],
        loadCases=[load_case],
        loads=loads,
        warnings=warnings,
        errors=errors,
        trace=trace,
    )
