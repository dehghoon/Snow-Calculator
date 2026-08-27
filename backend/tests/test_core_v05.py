from copy import deepcopy

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)

UNIFORM = {
    "mode": "UNIFORM_ROOF",
    "common": {
        "ss": 2.5,
        "sr_climatic": 0.4,
        "roof_slope_alpha": 10,
        "roof_surface_type": "normal",
        "is": 1.0,
        "cw": 1.0,
        "cb": 0.8,
    },
}

NON_UNIFORM = {
    **UNIFORM,
    "mode": "LOWER_ADJACENT_ROOF",
    "common": {**UNIFORM["common"], "adjacent_surface_drift_applicable": True},
    "lower_roof_cases": [
        {
            "case_id": "I",
            "source_surface": "Upper roof",
            "receiving_surface": "Lower roof",
            "drift_direction": "Toward roof step",
            "ls": 20.0,
            "ws": 10.0,
            "step_height": 2.0,
            "parapet_height": 0.0,
            "applicability_status": "APPLICABLE",
            "interpretation_note": "Explicit source-area geometry",
        }
    ],
}


def core_payload(calculation: dict, target_ids: list[str], segment_ids: list[str] | None = None) -> dict:
    inputs = {"calculation": calculation}
    if segment_ids is not None:
        inputs["segmentSurfaceIds"] = segment_ids
    return {
        "modelSchemaVersion": "0.5",
        "projectId": "PROJECT-SNOW-001",
        "runId": "RUN-SNOW-001",
        "calculator": "snow",
        "calculatorVersion": "0.1.0",
        "targetIds": target_ids,
        "inputs": inputs,
    }


def test_core_v05_endpoint_is_exposed_in_openapi():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "/api/v1/core/roof-snow/v0.5" in response.json()["paths"]


def test_core_v05_uniform_writeback_preserves_identity_and_canonical_snow_load():
    standalone = client.post("/api/v1/calculations/roof-snow", json=deepcopy(UNIFORM))
    assert standalone.status_code == 200
    standalone_body = standalone.json()

    response = client.post(
        "/api/v1/core/roof-snow/v0.5",
        json=core_payload(deepcopy(UNIFORM), ["SURFACE-ROOF-001"]),
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["modelSchemaVersion"] == "0.5"
    assert body["projectId"] == "PROJECT-SNOW-001"
    assert body["runId"] == "RUN-SNOW-001"
    assert body["targetIds"] == ["SURFACE-ROOF-001"]

    assert len(body["loadSources"]) == 1
    source = body["loadSources"][0]
    assert source["category"] == "snow"

    assert len(body["loadCases"]) == 1
    load_case = body["loadCases"][0]
    assert load_case["category"] == "snow"
    assert load_case["sourceId"] == source["id"]

    assert len(body["loads"]) == 1
    load = body["loads"][0]
    assert load["type"] == "surface-pressure"
    assert load["surfaceId"] == "SURFACE-ROOF-001"
    assert load["pressure"]["unit"] == "kPa"
    assert load["provenance"]["sourceId"] == source["id"]
    assert load["provenance"]["calculatorRunId"] == "RUN-SNOW-001"

    expected_pressure = standalone_body["final_results"]["governing_snow_load_kpa"]
    assert load["pressure"]["value"] == expected_pressure


def test_core_v05_non_uniform_distribution_maps_one_load_per_stable_surface():
    standalone = client.post("/api/v1/calculations/roof-snow", json=deepcopy(NON_UNIFORM))
    assert standalone.status_code == 200, standalone.text
    segments = standalone.json()["distribution_segments"]
    assert segments

    surface_ids = [f"SURFACE-DRIFT-{index + 1:03d}" for index in range(len(segments))]
    response = client.post(
        "/api/v1/core/roof-snow/v0.5",
        json=core_payload(deepcopy(NON_UNIFORM), surface_ids, surface_ids),
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["targetIds"] == surface_ids
    assert len(body["loads"]) == len(segments)
    assert [load["surfaceId"] for load in body["loads"]] == surface_ids
    assert len({load["surfaceId"] for load in body["loads"]}) == len(segments)
    assert all(load["type"] == "surface-pressure" for load in body["loads"])
    assert all(load["pressure"]["unit"] == "kPa" for load in body["loads"])


def test_core_v05_rejects_incomplete_non_uniform_surface_mapping():
    standalone = client.post("/api/v1/calculations/roof-snow", json=deepcopy(NON_UNIFORM))
    assert standalone.status_code == 200
    segment_count = len(standalone.json()["distribution_segments"])
    assert segment_count > 0

    incomplete_ids = [f"SURFACE-DRIFT-{index + 1:03d}" for index in range(max(0, segment_count - 1))]
    target_ids = [f"SURFACE-DRIFT-{index + 1:03d}" for index in range(segment_count)]

    response = client.post(
        "/api/v1/core/roof-snow/v0.5",
        json=core_payload(deepcopy(NON_UNIFORM), target_ids, incomplete_ids),
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ERR_CORE_V05_SURFACE_MAPPING"


def test_core_v05_rejects_lossy_or_mismatched_non_uniform_surface_mapping():
    standalone = client.post("/api/v1/calculations/roof-snow", json=deepcopy(NON_UNIFORM))
    assert standalone.status_code == 200
    segment_count = len(standalone.json()["distribution_segments"])
    assert segment_count > 0

    segment_ids = [f"SURFACE-DRIFT-{index + 1:03d}" for index in range(segment_count)]
    target_ids = list(segment_ids)
    target_ids[-1] = "SURFACE-NOT-MAPPED"

    response = client.post(
        "/api/v1/core/roof-snow/v0.5",
        json=core_payload(deepcopy(NON_UNIFORM), target_ids, segment_ids),
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ERR_CORE_V05_SURFACE_MAPPING"


def test_core_v05_rejects_uniform_mapping_to_multiple_surfaces():
    response = client.post(
        "/api/v1/core/roof-snow/v0.5",
        json=core_payload(deepcopy(UNIFORM), ["SURFACE-1", "SURFACE-2"]),
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ERR_CORE_V05_UNIFORM_TARGET"


def test_standalone_benchmark_remains_unchanged():
    response = client.post("/api/v1/calculations/roof-snow", json=deepcopy(UNIFORM))
    assert response.status_code == 200
    body = response.json()

    assert body["calculation_status"] == "OK"
    assert body["code_edition"] == "NBCC 2020"
    assert body["final_results"]["governing_snow_load_kpa"] > 0
    assert body["warnings"] == []
