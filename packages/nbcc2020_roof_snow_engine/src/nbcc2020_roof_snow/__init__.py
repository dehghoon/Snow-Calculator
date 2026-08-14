"""NBCC 2020 roof snow calculation engine."""

from .models.inputs import CommonSnowInputs, LowerRoofCaseInput, ProjectionInput
from .calculations.common import calculate_common_parameters, calculate_specified_snow_load
from .calculations.lower_roof import calculate_lower_roof_case, select_governing_lower_roof_case
from .calculations.projection import calculate_projection_drift

__all__ = [
    "CommonSnowInputs",
    "LowerRoofCaseInput",
    "ProjectionInput",
    "calculate_common_parameters",
    "calculate_specified_snow_load",
    "calculate_lower_roof_case",
    "select_governing_lower_roof_case",
    "calculate_projection_drift",
]
