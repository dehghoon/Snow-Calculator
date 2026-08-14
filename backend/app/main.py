from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

ENGINE_SRC = Path(__file__).resolve().parents[2] / "packages" / "nbcc2020_roof_snow_engine" / "src"
if ENGINE_SRC.exists() and str(ENGINE_SRC) not in sys.path:
    sys.path.insert(0, str(ENGINE_SRC))

from nbcc2020_roof_snow.validation.errors import InvalidInputError, InvalidRadicandError

from .engine_adapter import calculate
from .reporting import build_report_preview
from .schemas import CalculationRequest, CalculationResponse, ErrorResponse, ReportPreviewResponse


app = FastAPI(
    title="NBCC 2020 Roof Snow Calculator API",
    version="0.1.0",
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
        "api_version": "0.1.0",
        "engine_package": "nbcc2020-roof-snow",
        "engine_version": "0.1.0",
        "code_edition": "NBCC 2020",
    }


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


@app.post("/api/v1/reports/preview", response_model=ReportPreviewResponse)
def report_preview(payload: CalculationRequest) -> ReportPreviewResponse:
    calculation = calculate_roof_snow(payload)
    return build_report_preview(calculation)


@app.post("/api/v1/reports/official")
def official_report() -> None:
    raise HTTPException(
        status_code=403,
        detail={
            "code": "ERR_REPORT_ENTITLEMENT_REQUIRED",
            "detail": "Official PDF generation requires the approved LinkoTech authentication and active report entitlement integration.",
        },
    )
