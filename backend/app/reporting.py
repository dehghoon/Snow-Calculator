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

DISCLAIMER = (
    "Results from this tool must be independently verified by a qualified professional engineer. "
    "The engineer is responsible for verifying all inputs, assumptions, calculations, NBCC references, "
    "and project-specific requirements before design or construction use."
)


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
        {"id": "uls-load-distribution", "title": "ULS Load Distribution", "content": data["load_distribution"]},
        {"id": "sls-load-distribution", "title": "SLS Load Distribution", "content": data.get("sls_load_distribution", [])},
        {"id": "final-results", "title": "ULS / SLS Final Results", "content": data["final_results"]},
        {"id": "warnings", "title": "Warnings and Limitations", "content": {"warnings": data["warnings"], "limitations": data["limitations"]}},
        {"id": "responsibility", "title": "Engineering Responsibility", "content": DISCLAIMER},
        {"id": "validation", "title": "Validation Statement", "content": data["validation_statement"]},
    ]
    return ReportPreviewResponse(report_revision="6", title="NBCC 2020 Roof Snow Calculation Report Preview", sections=sections, figures=calculation.figure_metadata, official_pdf_available=True, entitlement_required=False)


def _fmt(value: Any, digits: int = 3) -> str:
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (int, float)):
        return f"{value:.{digits}f}"
    return "-" if value is None else str(value)


def _table(rows: list[list[Any]], widths: list[float] | None = None) -> Table:
    t = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9EAF7")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#173B5D")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.2),
        ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#9AA8B3")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def build_pdf_bytes(payload: CalculationRequest, calculation: CalculationResponse) -> bytes:
    stream = BytesIO()
    doc = SimpleDocTemplate(stream, pagesize=A4, rightMargin=13 * mm, leftMargin=13 * mm, topMargin=12 * mm, bottomMargin=12 * mm, title="NBCC 2020 Roof Snow Report", author="LinkoTech Engineering")
    styles = getSampleStyleSheet()
    title = ParagraphStyle("ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=colors.HexColor("#173B5D"), alignment=TA_LEFT, spaceAfter=8)
    h2 = ParagraphStyle("ReportH2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=colors.HexColor("#1F4E78"), spaceBefore=9, spaceAfter=5)
    body = ParagraphStyle("ReportBody", parent=styles["BodyText"], fontSize=8.5, leading=11)
    disclaimer_style = ParagraphStyle("Disclaimer", parent=body, backColor=colors.HexColor("#FFF8E8"), borderColor=colors.HexColor("#E3B25C"), borderWidth=0.7, borderPadding=7, textColor=colors.HexColor("#684C14"), spaceBefore=8, spaceAfter=8)

    mode_titles = {
        "UNIFORM_ROOF": "Uniform snow load",
        "LOWER_ADJACENT_ROOF": "Snow distribution and snow loading factors for lower levels of adjacent roofs",
        "ROOF_PROJECTION_OR_PARAPET": "Snow distribution and snow loading factors adjacent to roof obstructions / parapets",
    }
    story = [
        Paragraph("LINKOTECH ENGINEERING", title),
        Paragraph("NBCC 2020 Roof Snow Calculation — ULS & SLS", styles["Heading2"]),
        Paragraph(mode_titles.get(payload.mode.value, payload.mode.value), body),
        Spacer(1, 5 * mm),
    ]

    c = payload.common
    inputs = [
        ["var", "ULS / value", "SLS / basis", "unit", "NBCC 2020 reference"],
        ["Ss", _fmt(c.ss), "same climatic value", "kPa", "Appendix C, Table C-2"],
        ["Sr", _fmt(c.sr_climatic), "same climatic value", "kPa", "Appendix C, Table C-2"],
        ["alpha", _fmt(c.roof_slope_alpha, 2), "same geometry", "deg", "Sentences 4.1.6.2.(5)-(7)"],
        ["Is", _fmt(c.is_factor), "0.900", "", "Table 4.1.6.2.-A"],
        ["Cw", _fmt(c.cw), "same", "", "Sentences 4.1.6.2.(3)-(4)"],
        ["Cb", _fmt(c.cb), "same", "", "Sentence 4.1.6.2.(2)"],
    ]
    story += [Paragraph("Input parameters and limit-state factors", h2), _table(inputs, [22 * mm, 31 * mm, 46 * mm, 18 * mm, 53 * mm])]

    final_rows = [["result", "value", "unit", "formula / basis", "NBCC 2020 reference"]]
    uls_peak = calculation.final_results.get("peak_snow_load_kpa", calculation.final_results.get("governing_snow_load_kpa"))
    sls_peak = calculation.final_results.get("sls_peak_snow_load_kpa")
    if uls_peak is not None:
        final_rows.append(["ULS governing snow load", _fmt(uls_peak), "kPa", "Is(ULS) (Ss Cb Cw Cs Ca + Sr)", "Sentence 4.1.6.2.(1)"])
    if sls_peak is not None:
        final_rows.append(["SLS governing snow load", _fmt(sls_peak), "kPa", "Is(SLS)=0.90 (Ss Cb Cw Cs Ca + Sr)", "Table 4.1.6.2.-A; Sentence 4.1.6.2.(1)"])
    story += [Paragraph("ULS / SLS snow-load results", h2), _table(final_rows, [45 * mm, 27 * mm, 18 * mm, 48 * mm, 42 * mm])]

    if calculation.distribution_segments:
        sls = calculation.report_data.get("sls_load_distribution", [])
        if payload.mode.value == "UNIFORM_ROOF":
            p = calculation.distribution_segments[0]
            sp = sls[0] if sls else {}
            dist = [["Ca", "ULS S (kPa)", "SLS S (kPa)"], [_fmt(p.get("ca")), _fmt(p.get("snow_load_kpa")), _fmt(sp.get("snow_load_kpa"))]]
            story += [Paragraph("Uniform load", h2), _table(dist, [50 * mm, 60 * mm, 60 * mm])]
        else:
            dist = [["x (m)", "Ca", "ULS S (kPa)", "SLS S (kPa)"]]
            for i, p in enumerate(calculation.distribution_segments):
                sp = sls[i] if i < len(sls) else {}
                dist.append([_fmt(p.get("x_m"), 2), _fmt(p.get("ca")), _fmt(p.get("snow_load_kpa")), _fmt(sp.get("snow_load_kpa"))])
            story += [Paragraph("Load distribution — ULS then SLS", h2), _table(dist, [35 * mm, 35 * mm, 50 * mm, 50 * mm])]

    if calculation.warnings:
        story.append(Paragraph("Warnings", h2))
        story += [Paragraph(f"- {w}", body) for w in calculation.warnings]

    story += [
        Paragraph("Engineering responsibility", h2),
        Paragraph(DISCLAIMER, disclaimer_style),
        Paragraph("This tool is not a substitute for professional judgment. The engineer must review and verify all results against NBCC 2020, applicable amendments, and project-specific requirements.", body),
    ]
    doc.build(story)
    return stream.getvalue()
