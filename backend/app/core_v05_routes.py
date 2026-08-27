from fastapi import APIRouter, HTTPException

from .core_contract_v05 import (
    CoreSnowV05Request,
    CoreSnowV05Writeback,
    build_core_v05_writeback,
)
from .engine_adapter import calculate
from nbcc2020_roof_snow.validation.errors import InvalidInputError, InvalidRadicandError

router = APIRouter()


@router.post(
    "/api/v1/core/roof-snow/v0.5",
    response_model=CoreSnowV05Writeback,
    summary="Calculate roof snow and return Structural Core v0.5 canonical loads",
)
def calculate_roof_snow_for_core_v05(payload: CoreSnowV05Request) -> CoreSnowV05Writeback:
    try:
        calculation = calculate(payload.inputs.calculation)
    except InvalidRadicandError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "ERR_INVALID_RADICAND", "detail": str(exc)},
        ) from exc
    except InvalidInputError as exc:
        message = str(exc)
        code = "ERR_SS_NONPOSITIVE" if "ERR_SS_NONPOSITIVE" in message else "ERR_INVALID_GEOMETRY"
        raise HTTPException(
            status_code=422,
            detail={"code": code, "detail": message},
        ) from exc

    writeback = build_core_v05_writeback(payload, calculation)
    if writeback.errors:
        raise HTTPException(
            status_code=422,
            detail={"code": "ERR_CORE_V05_WRITEBACK", "errors": writeback.errors},
        )
    return writeback
