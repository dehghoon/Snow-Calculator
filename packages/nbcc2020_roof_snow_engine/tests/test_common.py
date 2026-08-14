import math
import pytest
from nbcc2020_roof_snow.calculations.common import (
    calculate_gamma, calculate_cs, calculate_sr_applicable, calculate_specified_snow_load
)
from nbcc2020_roof_snow.models.enums import RoofSurfaceType


def test_gamma_formula():
    assert math.isclose(calculate_gamma(2.4), 3.232, abs_tol=1e-12)


def test_gamma_cap():
    assert calculate_gamma(10.0) == 4.0


@pytest.mark.parametrize(
    ("alpha", "expected"),
    [(0, 1.0), (30, 1.0), (50, 0.5), (70, 0.0), (80, 0.0)],
)
def test_cs_normal(alpha, expected):
    assert math.isclose(calculate_cs(alpha, RoofSurfaceType.NORMAL), expected)


@pytest.mark.parametrize(
    ("alpha", "expected"),
    [(0, 1.0), (15, 1.0), (37.5, 0.5), (60, 0.0), (80, 0.0)],
)
def test_cs_smooth_slippery(alpha, expected):
    assert math.isclose(calculate_cs(alpha, RoofSurfaceType.SMOOTH_SLIPPERY), expected)


def test_rain_limit_and_final_snow():
    sr = calculate_sr_applicable(ss=2.4, sr_climatic=0.4, cb=0.8, cw=1.0, cs=1.0, ca=2.0)
    assert sr == 0.4
    s = calculate_specified_snow_load(
        is_factor=1.0, ss=2.4, cb=0.8, cw=1.0, cs=1.0, ca=2.0, sr_applicable=sr
    )
    assert math.isclose(s, 4.24)
