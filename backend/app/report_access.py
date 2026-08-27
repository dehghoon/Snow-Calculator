from __future__ import annotations

from fastapi import HTTPException


OFFICIAL_REPORT_DENIAL_CODE = "ERR_REPORT_ENTITLEMENT_REQUIRED"
OFFICIAL_REPORT_DENIAL_DETAIL = (
    "Official PDF requires approved Linkoteq authentication and an active report entitlement."
)


def require_official_report_entitlement() -> None:
    """Deny official report generation until approved Linkoteq auth/entitlement is integrated."""
    raise HTTPException(
        status_code=403,
        detail={
            "code": OFFICIAL_REPORT_DENIAL_CODE,
            "detail": OFFICIAL_REPORT_DENIAL_DETAIL,
            "entitlement_required": True,
        },
    )
