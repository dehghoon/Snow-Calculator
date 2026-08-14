import math
from nbcc2020_roof_snow.calculations.projection import calculate_projection_drift
from nbcc2020_roof_snow.models.inputs import ProjectionInput
from nbcc2020_roof_snow.models.enums import CalculationStatus


def test_projection_2_999_is_exempt():
    r = calculate_projection_drift(
        ProjectionInput(projection_height=1.0, projection_longest_dimension=2.999),
        gamma=3.232, cb=0.8, ss=2.4
    )
    assert r.exempt is True
    assert r.status is CalculationStatus.EXEMPT


def test_projection_3_000_is_not_exempt():
    r = calculate_projection_drift(
        ProjectionInput(projection_height=1.0, projection_longest_dimension=3.0),
        gamma=3.232, cb=0.8, ss=2.4
    )
    assert r.exempt is False
    expected_ca_h = 0.67 * 3.232 * 1.0 / (0.8 * 2.4)
    expected_ca_l = 3.232 * 3.0 / (7.5 * 0.8 * 2.4) + 1.0
    assert math.isclose(r.ca0, min(expected_ca_h, expected_ca_l))
    assert math.isclose(r.xd_code, min(3.35, 2.0))
