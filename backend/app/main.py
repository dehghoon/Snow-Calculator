from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

ENGINE_SRC = Path(__file__).resolve().parents[2] / "packages" / "nbcc2020_roof_snow_engine" / "src"
if ENGINE_SRC.exists() and str(ENGINE_SRC) not in sys.path:
    sys.path.insert(0, str(ENGINE_SRC))

from nbcc2020_roof_snow.validation.errors import InvalidInputError, InvalidRadicandError

from .climatic_data import get_location_data, list_locations, list_provinces
from .core_contract import CoreSnowRequest, CoreSnowWriteback, build_core_writeback
from .engine_adapter import calculate
from .reporting import build_pdf_bytes, build_report_preview
from .schemas import CalculationRequest, CalculationResponse, ErrorResponse, ReportPreviewResponse


app = FastAPI(
    title="NBCC 2020 Roof Snow Calculator API",
    version="0.2.0",
    description="FastAPI adapter around the validated Agent #2 NBCC 2020 roof snow engine.",
)

allowed_origins = [item.strip() for item in os.getenv("API_ALLOWED_ORIGINS", "http://localhost:5173").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/version")
def version() -> dict[str, str]:
    return {
        "api_version": "0.2.0",
        "engine_package": "nbcc2020-roof-snow",
        "engine_version": "0.1.0",
        "code_edition": "NBCC 2020",
        "core_contract": "0.2",
    }


@app.get("/api/v1/climatic/provinces")
def climatic_provinces() -> dict[str, list[str]]:
    return {"provinces": list_provinces()}


@app.get("/api/v1/climatic/locations")
def climatic_locations(province: str) -> dict[str, object]:
    locations = list_locations(province)
    if not locations:
        raise HTTPException(status_code=404, detail={"code": "ERR_PROVINCE_NOT_FOUND", "detail": f"No climatic locations found for {province}."})
    return {"province": province, "locations": locations}


@app.get("/api/v1/climatic/location")
def climatic_location(province: str, location: str) -> dict[str, object]:
    record = get_location_data(province, location)
    if record is None:
        raise HTTPException(status_code=404, detail={"code": "ERR_LOCATION_NOT_FOUND", "detail": f"No climatic data found for {location}, {province}."})
    return record


@app.post(
    "/api/v1/calculations/roof-snow",
    response_model=CalculationResponse,
    responses={422: {"model": ErrorResponse}},
)
def calculate_roof_snow(payload: CalculationRequest) -> CalculationResponse:
    try:
        return calculate(payload)
    except InvalidRadicandError as exc:
        raise HTTPException(status_code=422, detail={"code": "ERR_INVALID_RADICAND", "detail": str(exc)}) from exc
    except InvalidInputError as exc:
        message = str(exc)
        code = "ERR_SS_NONPOSITIVE" if "ERR_SS_NONPOSITIVE" in message else "ERR_INVALID_GEOMETRY"
        raise HTTPException(status_code=422, detail={"code": code, "detail": message}) from exc


@app.post(
    "/api/v1/core/roof-snow",
    response_model=CoreSnowWriteback,
    summary="Calculate roof snow and return Structural Core v0.2 load objects",
)
def calculate_roof_snow_for_core(payload: CoreSnowRequest) -> CoreSnowWriteback:
    """Integrated mode used by the Linkoteq structural model.

    The existing standalone UI continues to use `/api/v1/calculations/roof-snow`.
    This endpoint runs the exact same validated calculation engine, then writes the result
    in the canonical Core `LoadSource` + `LoadCase` + `Load` shape for the selected slab.
    """
    calculation = calculate_roof_snow(payload.calculation)
    try:
        return build_core_writeback(payload, calculation)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"code": "ERR_CORE_WRITEBACK", "detail": str(exc)}) from exc


@app.post("/api/v1/reports/preview", response_model=ReportPreviewResponse)
def report_preview(payload: CalculationRequest) -> ReportPreviewResponse:
    calculation = calculate_roof_snow(payload)
    return build_report_preview(calculation)


@app.post("/api/v1/reports/official")
def official_report(payload: CalculationRequest) -> Response:
    calculation = calculate_roof_snow(payload)
    pdf = build_pdf_bytes(payload, calculation)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="NBCC-2020-Roof-Snow-Report.pdf"'},
    )
