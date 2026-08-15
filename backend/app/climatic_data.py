from __future__ import annotations

# NBCC 2020 Appendix C / Table C-2 climatic design data used by the UI lookup.
# Keep this dataset server-side so the frontend never hard-codes climatic values.
# Values below seed the lookup structure and can be extended with the complete
# licensed/verified Table C-2 dataset without changing the API or frontend.

CLIMATIC_DATA: dict[str, dict[str, dict[str, float]]] = {
    "Ontario": {
        "Toronto": {"ss": 1.1, "sr": 0.4},
        "Ottawa": {"ss": 2.4, "sr": 0.4},
    },
    "Quebec": {
        "Montreal": {"ss": 2.1, "sr": 0.4},
        "Quebec City": {"ss": 3.6, "sr": 0.4},
    },
}


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
