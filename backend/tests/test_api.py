from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)

BASE = {
    "mode": "UNIFORM_ROOF",
    "common": {
        "ss": 2.5,
        "sr_climatic": 0.4,
        "roof_slope_alpha": 10,
        "roof_surface_type": "normal",
        "is": 1.0,
        "cw": 1.0,
        "cb": 0.8
    }
}


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_version():
    response = client.get("/version")
    assert response.status_code == 200
    assert response.json()["engine_version"] == "0.1.0"


def test_uniform_calculation_contract():
    response = client.post("/api/v1/calculations/roof-snow", json=BASE)
    assert response.status_code == 200
    body = response.json()
    assert body["calculation_status"] == "OK"
    assert body["code_edition"] == "NBCC 2020"
    assert body["final_results"]["governing_snow_load_kpa"] > 0
    assert body["warnings"] == []


def test_projection_boundary_3m_not_exempt():
    payload = {
        **BASE,
        "mode": "ROOF_PROJECTION_OR_PARAPET",
        "projection": {
            "projection_height": 1.0,
            "projection_longest_dimension": 3.0
        }
    }
    response = client.post("/api/v1/calculations/roof-snow", json=payload)
    assert response.status_code == 200
    assert response.json()["projection_result"]["exempt"] is False


def test_projection_under_3m_exempt():
    payload = {
        **BASE,
        "mode": "ROOF_PROJECTION_OR_PARAPET",
        "projection": {
            "projection_height": 1.0,
            "projection_longest_dimension": 2.99
        }
    }
    response = client.post("/api/v1/calculations/roof-snow", json=payload)
    assert response.status_code == 200
    assert response.json()["projection_result"]["exempt"] is True


def test_lower_roof_case():
    payload = {
        **BASE,
        "mode": "LOWER_ADJACENT_ROOF",
        "common": {**BASE["common"], "adjacent_surface_drift_applicable": True},
        "lower_roof_cases": [{
            "case_id": "I",
            "source_surface": "Upper roof",
            "receiving_surface": "Lower roof",
            "drift_direction": "Toward roof step",
            "ls": 20.0,
            "ws": 10.0,
            "step_height": 2.0,
            "parapet_height": 0.0,
            "applicability_status": "APPLICABLE",
            "interpretation_note": "Explicit source-area geometry"
        }]
    }
    response = client.post("/api/v1/calculations/roof-snow", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["governing_case"]["case_id"] == "I"
    assert body["distribution_segments"]


def test_adjacent_drift_rejects_cw_not_one():
    payload = {
        **BASE,
        "mode": "LOWER_ADJACENT_ROOF",
        "common": {**BASE["common"], "cw": 0.75, "adjacent_surface_drift_applicable": True},
        "lower_roof_cases": [{
            "case_id": "I",
            "source_surface": "Upper roof",
            "receiving_surface": "Lower roof",
            "drift_direction": "Toward roof step",
            "ls": 20.0,
            "ws": 10.0,
            "step_height": 2.0,
            "parapet_height": 0.0
        }]
    }
    response = client.post("/api/v1/calculations/roof-snow", json=payload)
    assert response.status_code == 422


def test_official_report_downloads_pdf():
    response = client.post("/api/v1/reports/official", json=BASE)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")
    assert "attachment" in response.headers["content-disposition"].lower()
    assert response.content.startswith(b"%PDF")


def test_openapi_generated():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "/api/v1/calculations/roof-snow" in response.json()["paths"]
