import pytest
from nbcc2020_roof_snow.models.inputs import CommonSnowInputs
from nbcc2020_roof_snow.models.enums import RoofSurfaceType
from nbcc2020_roof_snow.validation.rules import validate_common_inputs
from nbcc2020_roof_snow.validation.errors import InvalidInputError


def test_ss_must_be_positive():
    inputs = CommonSnowInputs(
        ss=0.0, sr_climatic=0.4, roof_slope_alpha=0,
        roof_surface_type=RoofSurfaceType.NORMAL,
        is_factor=1.0, cw=1.0, cb=0.8
    )
    with pytest.raises(InvalidInputError):
        validate_common_inputs(inputs)


def test_adjacent_surface_drift_requires_cw_one():
    inputs = CommonSnowInputs(
        ss=2.4, sr_climatic=0.4, roof_slope_alpha=0,
        roof_surface_type=RoofSurfaceType.NORMAL,
        is_factor=1.0, cw=0.75, cb=0.8,
        adjacent_surface_drift_applicable=True
    )
    with pytest.raises(InvalidInputError, match="cw must equal 1.0"):
        validate_common_inputs(inputs)
