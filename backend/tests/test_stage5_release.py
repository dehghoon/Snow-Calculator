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
        "cb": 0.8,
    },
}


def test_official_report_is_denied_without_approved_entitlement():
    response = client.post("/api/v1/reports/official", json=BASE)
    assert response.status_code == 403
    assert response.json() == {
        "detail": {
            "code": "ERR_REPORT_ENTITLEMENT_REQUIRED",
            "detail": "Official PDF requires approved Linkoteq authentication and an active report entitlement.",
            "entitlement_required": True,
        }
    }


def test_report_preview_advertises_entitlement_requirement():
    response = client.post("/api/v1/reports/preview", json=BASE)
    assert response.status_code == 200
    body = response.json()
    assert body["official_pdf_available"] is False
    assert body["entitlement_required"] is True


def test_version_reports_core_v05_as_current_and_v02_as_legacy():
    response = client.get("/version")
    assert response.status_code == 200
    body = response.json()
    assert body["core_contract_current"] == "0.5"
    assert body["core_contract_legacy"] == ["0.2"]
    assert body["core_contract"] == "0.5"


def test_openapi_keeps_legacy_and_v05_core_endpoints():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/core/roof-snow" in paths
    assert "/api/v1/core/roof-snow/v0.5" in paths
