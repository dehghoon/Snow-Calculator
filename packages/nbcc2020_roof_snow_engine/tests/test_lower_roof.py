import math
from nbcc2020_roof_snow.calculations.lower_roof import (
    calculate_lcs, calculate_hp_prime, calculate_snow_source_factor,
    calculate_case_ca0, calculate_xd, calculate_ca_at_x
)


def test_lcs_formula():
    assert math.isclose(calculate_lcs(12.0, 8.0), 10.666666666666668)


def test_hp_prime_limits():
    value = calculate_hp_prime(parapet_height=2.0, ss=2.4, gamma=3.232, lcs=10.0)
    expected = min(max(2.0 - 0.8 * 2.4 / 3.232, 0.0), 2.0)
    assert math.isclose(value, expected)


def test_snow_source_factor_formula():
    f = calculate_snow_source_factor(
        beta=1.0, gamma=3.232, lcs=10.666666666666668,
        hp_prime=0.0, ss=2.4, cb=0.8
    )
    expected = 0.35 * math.sqrt(3.232 * 10.666666666666668 / 2.4) + 0.8
    assert math.isclose(f, expected)


def test_ca0_uses_minimum_competing_term():
    h, source, ca0 = calculate_case_ca0(
        beta=1.0, gamma=3.232, step_height=2.0,
        cb=0.8, ss=2.4, snow_source_factor_f=2.0
    )
    assert ca0 == min(h, source)


def test_xd_no_negative_physical_length():
    assert calculate_xd(cb=0.8, ss=2.4, gamma=3.232, ca0=0.8) == 0.0


def test_ca_distribution():
    assert calculate_ca_at_x(ca0=3.0, xd=6.0, x=0.0) == 3.0
    assert math.isclose(calculate_ca_at_x(ca0=3.0, xd=6.0, x=3.0), 2.0)
    assert calculate_ca_at_x(ca0=3.0, xd=6.0, x=6.0) == 1.0
