from __future__ import annotations

from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .schemas import CalculationRequest, CalculationResponse, ReportPreviewResponse


def build_report_preview(calculation: CalculationResponse) -> ReportPreviewResponse:
    data = calculation.report_data
    sections = [
        {"id": "document-control", "title": "Document Control", "content": data["document_control"]},
        {"id": "calculation-basis", "title": "Calculation Basis", "content": data["calculation_basis"]},
        {"id": "geometry", "title": "Geometry", "content": data["geometry"]},
        {"id": "climatic-inputs", "title": "Climatic Inputs", "content": data["climatic_inputs"]},
        {"id": "common-parameters", "title": "Common Snow Parameters", "content": data["common_snow_parameters"]},
        {"id": "source-area-cases", "title": "Source-Area Cases", "content": data["source_area_cases"]},
        {"id": "governing-case", "title": "Governing Case", "content": data["governing_case"]},
        {"id": "load-distribution", "title": "Load Distribution", "content": data["load_distribution"]},
        {"id": "final-results", "title": "Final Results", "content": data["final_results"]},
        {"id": "warnings", "title": "Warnings and Limitations", "content": {"warnings": data["warnings"], "limitations": data["limitations"]}},
        {"id": "references", "title": "Code References", "content": data["code_references"]},
        {"id": "validation", "title": "Validation Statement", "content": data["validation_statement"]},
    ]
    return ReportPreviewResponse(
        report_revision="2",
        title="NBCC 2020 Roof Snow Calculation Report Preview",
        sections=sections,
        figures=calculation.figure_metadata,
        official_pdf_available=True,
        entitlement_required=False,
    )


def _fmt(value: Any, digits: int = 3) -> str:
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (int, float)):
        return f"{value:.{digits}f}"
    if value is None:
        return "-"
    return str(value)


def _table(rows: list[list[Any]], widths: list[float] | None = None) -> Table:
    table = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9EAF7")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#173B5D")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#9AA8B3")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def build_pdf_bytes(payload: CalculationRequest, calculation: CalculationResponse) -> bytes:
    stream = BytesIO()
    doc = SimpleDocTemplate(
        stream,
        pagesize=A4,
        rightMargin=13 * mm,
        leftMargin=13 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title="NBCC 2020 Roof Snow Report",
        author="LinkoTech Engineering",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#173B5D"),
        alignment=TA_LEFT,
        spaceAfter=8,
    )
    h2 = ParagraphStyle(
        "ReportH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor("#1F4E78"),
        spaceBefore=9,
        spaceAfter=5,
    )
    body = ParagraphStyle("ReportBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.5, leading=11)

    mode_titles = {
        "UNIFORM_ROOF": "Uniform snow load",
        "LOWER_ADJACENT_ROOF": "Snow distribution and snow loading factors for lower levels of adjacent roofs",
        "ROOF_PROJECTION_OR_PARAPET": "Snow distribution and snow loading factors adjacent to roof obstructions / parapets",
    }
    story: list[Any] = [
        Paragraph("LINKOTECH ENGINEERING", title_style),
        Paragraph("NBCC 2020 Roof Snow Calculation", styles["Heading2"]),
        Paragraph(mode_titles.get(payload.mode.value, payload.mode.value), body),
        Spacer(1, 5 * mm),
    ]

    common = payload.common
    input_rows: list[list[Any]] = [
        ["var", "val", "unit", "description / basis"],
        ["Ss", _fmt(common.ss), "kPa", "ground snow load"],
        ["Sr", _fmt(common.sr_climatic), "kPa", "associated rain load"],
        ["alpha", _fmt(common.roof_slope_alpha, 2), "deg", "roof slope"],
        ["surface", common.roof_surface_type.value, "", "roof surface condition"],
        ["Is", _fmt(common.is_factor), "", "importance factor"],
        ["Cw", _fmt(common.cw), "", "wind exposure factor"],
        ["Cb", _fmt(common.cb), "", "basic roof snow load factor"],
    ]
    if payload.mode.value == "LOWER_ADJACENT_ROOF":
        for case in payload.lower_roof_cases:
            input_rows.extend(
                [
                    [f"Case {case.case_id} ls", _fmt(case.ls), "m", "source length"],
                    [f"Case {case.case_id} ws", _fmt(case.ws), "m", "source width"],
                    [f"Case {case.case_id} h", _fmt(case.step_height), "m", "roof step height"],
                    [f"Case {case.case_id} hp", _fmt(case.parapet_height), "m", "parapet height"],
                ]
            )
    if payload.mode.value == "ROOF_PROJECTION_OR_PARAPET" and payload.projection is not None:
        input_rows.extend(
            [
                ["h", _fmt(payload.projection.projection_height), "m", "projection / parapet height"],
                ["l0", _fmt(payload.projection.projection_longest_dimension), "m", "longest obstruction dimension"],
            ]
        )
    story += [Paragraph("Input parameters", h2), _table(input_rows, [30 * mm, 28 * mm, 21 * mm, 91 * mm])]

    derived_rows = [["parameter", "value", "basis"]]
    for key in ("gamma_kn_m3", "cs"):
        if key in calculation.derived_parameters:
            derived_rows.append([key, _fmt(calculation.derived_parameters[key]), "calculation engine"])
    for key, value in calculation.derived_parameters.items():
        if key not in {"gamma_kn_m3", "cs"} and isinstance(value, (int, float, str)):
            derived_rows.append([key, _fmt(value), "calculation engine"])
    story += [Paragraph("Calculated parameters", h2), _table(derived_rows, [54 * mm, 38 * mm, 78 * mm])]

    final_rows = [["result", "value", "unit"]]
    for key, value in calculation.final_results.items():
        if isinstance(value, (int, float)):
            final_rows.append([key, _fmt(value), "kPa" if "load" in key.lower() else ""])
        else:
            final_rows.append([key, _fmt(value), ""])
    story += [Paragraph("Snow-load results", h2), _table(final_rows, [75 * mm, 45 * mm, 50 * mm])]

    if calculation.distribution_segments:
        dist_rows = [["x (m)", "Ca", "S (kPa)"]]
        for point in calculation.distribution_segments:
            dist_rows.append([_fmt(point.get("x_m"), 2), _fmt(point.get("ca")), _fmt(point.get("snow_load_kpa"))])
        story += [Paragraph("Load distribution", h2), _table(dist_rows, [55 * mm, 55 * mm, 60 * mm])]

    if calculation.warnings:
        story.append(Paragraph("Warnings", h2))
        for warning in calculation.warnings:
            story.append(Paragraph(f"- {warning}", body))

    if calculation.references:
        ref_rows = [["formula ID", "NBCC reference"]]
        for ref in calculation.references:
            ref_rows.append([ref.get("formula_id", ""), ref.get("reference", "")])
        story += [Paragraph("NBCC references", h2), _table(ref_rows, [48 * mm, 122 * mm])]

    story += [Spacer(1, 5 * mm), Paragraph("Generated directly by the Snow Calculator from the current calculation inputs and results. No raw engineering trace is included in this user-facing report.", body)]
    doc.build(story)
    return stream.getvalue()
