from fastapi import APIRouter, HTTPException

from .core_contract_v05 import (
    CoreSnowV05Request,
    CoreSnowV05Writeback,
    build_core_v05_writeback,
)
from .engine_adapter import calculate
from nbcc2020_roof_snow.validation.errors import InvalidInputError, InvalidRadicandError

router = APIRouter()


class CoreSnowV05ApiWriteback(CoreSnowV05Writeback):
    projectId: str
    targetIds: list[str]


def _validate_surface_mapping(payload: CoreSnowV05Request, calculation) -> None:
    is_uniform = payload.inputs.calculation.mode.value == "UNIFORM_ROOF"
    segments = [] if is_uniform else (calculation.distribution_segments or [])

    if segments:
        segment_surface_ids = payload.inputs.segmentSurfaceIds or []
        if (
            len(segment_surface_ids) != len(segments)
            or len(set(segment_surface_ids)) != len(segment_surface_ids)
            or segment_surface_ids != payload.targetIds
        ):
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "ERR_CORE_V05_SURFACE_MAPPING",
                    "detail": (
                        "Non-uniform snow requires one unique stable surface ID per "
                        "distribution segment, and segmentSurfaceIds must exactly match targetIds."
                    ),
                },
            )
        return

    if len(payload.targetIds) != 1:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "ERR_CORE_V05_UNIFORM_TARGET",
                "detail": "Uniform roof snow requires exactly one target surface ID.",
            },
        )


@router.post(
    "/api/v1/core/roof-snow/v0.5",
    response_model=CoreSnowV05ApiWriteback,
    summary="Calculate roof snow and return Structural Core v0.5 canonical loads",
)
def calculate_roof_snow_for_core_v05(payload: CoreSnowV05Request) -> CoreSnowV05ApiWriteback:
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

    _validate_surface_mapping(payload, calculation)

    writeback = build_core_v05_writeback(payload, calculation)
    if writeback.errors:
        raise HTTPException(
            status_code=422,
            detail={"code": "ERR_CORE_V05_WRITEBACK", "errors": writeback.errors},
        )

    return CoreSnowV05ApiWriteback(
        **writeback.model_dump(),
        projectId=payload.projectId,
        targetIds=payload.targetIds,
    )
