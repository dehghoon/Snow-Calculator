"""Engineering input metadata for application-layer help text.

This module contains explanatory metadata only. It does not implement UI logic.
"""

USER_INPUT_GUIDANCE: dict[str, dict[str, str]] = {
    "is_factor": {
        "label": "Importance Factor, Is",
        "unit": "-",
        "help_text": (
            "Select Is in accordance with NBCC 2020 for the applicable building "
            "importance category and limit state. The calculation engine consumes "
            "the user-selected value and does not derive it."
        ),
        "reference": "NBCC 2020, snow load importance-factor requirements",
    },
    "cw": {
        "label": "Wind Exposure Factor, Cw",
        "unit": "-",
        "help_text": (
            "Use Cw = 1.0 by default. A reduced value is permitted only when all "
            "applicable NBCC exposure conditions are satisfied. For adjacent-surface "
            "drift, Cw must be 1.0."
        ),
        "reference": "NBCC 2020 Division B 4.1.6.2.(3)-(4)",
    },
    "cb": {
        "label": "Basic Roof Snow Load Factor, Cb",
        "unit": "-",
        "help_text": (
            "Select Cb in accordance with NBCC 2020 considering characteristic roof "
            "length, Cw, and the applicable mean-roof-height condition. The approved "
            "specification notes Cb = 0.8 through lc <= 70/Cw^2 unless the low-height "
            "override applies; the user is responsible for selecting any value from "
            "branches not numerically defined in the specification."
        ),
        "reference": "NBCC 2020 Division B 4.1.6.2.(2)",
    },
    "h_prime": {
        "label": "Sheltered Height Parameter, h_prime",
        "unit": "m",
        "help_text": (
            "Enter h_prime from the project drift geometry in accordance with the "
            "applicable NBCC 2020 interpretation. Do not estimate dimensions by scaling "
            "code or commentary figures. Ambiguous geometry requires engineering review."
        ),
        "reference": "NBCC 2020 Figure 4.1.6.5.-A / approved specification geometry contract",
    },
}
