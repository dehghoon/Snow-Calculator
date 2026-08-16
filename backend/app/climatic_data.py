from __future__ import annotations

import json
from pathlib import Path

# NBCC 2020 Appendix C, Table C-2 climatic snow design data used by the UI lookup.
# The application currently consumes Ss and Sr. The dataset below covers every
# selected Canadian location listed in the supplied Table C-2 pages.
_DATA_FILES = (
    "climatic_bc.json",
    "climatic_prairies.json",
    "climatic_ontario.json",
    "climatic_quebec.json",
    "climatic_atlantic.json",
    "climatic_north.json",
)


def _load_climatic_data() -> dict[str, dict[str, dict[str, float]]]:
    root = Path(__file__).resolve().parent
    merged: dict[str, dict[str, dict[str, float]]] = {}
    for filename in _DATA_FILES:
        payload = json.loads((root / filename).read_text(encoding="utf-8"))
        for province, locations in payload.items():
            merged.setdefault(province, {}).update(locations)
    return merged


CLIMATIC_DATA = _load_climatic_data()


def list_provinces() -> list[str]:
    return sorted(CLIMATIC_DATA)


def list_locations(province: str) -> list[str]:
    return sorted(CLIMATIC_DATA.get(province, {}))


def get_location_data(province: str, location: str) -> dict[str, object] | None:
    record = CLIMATIC_DATA.get(province, {}).get(location)
    if record is None:
        return None
    return {
        "province": province,
        "location": location,
        "ss": record["ss"],
        "sr": record["sr"],
        "source": "NBCC 2020 Appendix C, Table C-2",
    }
