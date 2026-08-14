from dataclasses import dataclass
from .common import calculate_sr_applicable, calculate_specified_snow_load
from .lower_roof import calculate_ca_at_x


@dataclass(frozen=True)
class DistributionPoint:
    x: float
    ca: float
    sr_applicable: float
    snow_load: float


def calculate_distribution_point(
    *,
    x: float,
    ca0: float,
    xd: float,
    is_factor: float,
    ss: float,
    cb: float,
    cw: float,
    cs: float,
    sr_climatic: float,
) -> DistributionPoint:
    """Calculate Ca(x), applicable rain load and S(x) at one distance."""
    ca = calculate_ca_at_x(ca0=ca0, xd=xd, x=x)
    sr = calculate_sr_applicable(
        ss=ss, sr_climatic=sr_climatic, cb=cb, cw=cw, cs=cs, ca=ca
    )
    s = calculate_specified_snow_load(
        is_factor=is_factor, ss=ss, cb=cb, cw=cw, cs=cs, ca=ca, sr_applicable=sr
    )
    return DistributionPoint(x=x, ca=ca, sr_applicable=sr, snow_load=s)
