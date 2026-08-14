from nbcc2020_roof_snow import CommonSnowInputs, calculate_common_parameters
from nbcc2020_roof_snow.calculations.common import (
    calculate_sr_applicable,
    calculate_specified_snow_load,
)
from nbcc2020_roof_snow.models.enums import RoofSurfaceType

inputs = CommonSnowInputs(
    ss=2.4,
    sr_climatic=0.4,
    roof_slope_alpha=0.0,
    roof_surface_type=RoofSurfaceType.NORMAL,
    is_factor=1.0,  # User-selected per applicable NBCC requirements.
    cw=1.0,         # User-selected per applicable NBCC exposure requirements.
    cb=0.8,         # User-selected per applicable NBCC roof-length/height requirements.
    h_prime=2.6,    # User-entered from verified project drift geometry, when applicable.
)

common = calculate_common_parameters(inputs)
ca = 1.0
sr = calculate_sr_applicable(
    ss=inputs.ss,
    sr_climatic=inputs.sr_climatic,
    cb=inputs.cb,
    cw=inputs.cw,
    cs=common.cs,
    ca=ca,
)
snow_load = calculate_specified_snow_load(
    is_factor=inputs.is_factor,
    ss=inputs.ss,
    cb=inputs.cb,
    cw=inputs.cw,
    cs=common.cs,
    ca=ca,
    sr_applicable=sr,
)

print(f"gamma = {common.gamma:.6f} kN/m^3")
print(f"Cs = {common.cs:.6f}")
print(f"S = {snow_load:.6f} kPa")
