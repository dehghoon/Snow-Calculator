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

def _public_references(refs: list[dict[str, str]]) -> list[dict[str, str]]:
    return [{"NBCC 2020 Reference": r.get("reference", "")} for r in refs if r.get("reference")]

def build_report_preview(calculation: CalculationResponse) -> ReportPreviewResponse:
    data=calculation.report_data
    sections=[{"id":"document-control","title":"Document Control","content":data["document_control"]},{"id":"calculation-basis","title":"Calculation Basis","content":data["calculation_basis"]},{"id":"geometry","title":"Geometry","content":data["geometry"]},{"id":"climatic-inputs","title":"Climatic Inputs","content":data["climatic_inputs"]},{"id":"common-parameters","title":"Common Snow Parameters","content":data["common_snow_parameters"]},{"id":"source-area-cases","title":"Source-Area Cases","content":data["source_area_cases"]},{"id":"governing-case","title":"Governing Case","content":data["governing_case"]},{"id":"uls-load-distribution","title":"ULS Load Distribution","content":data["load_distribution"]},{"id":"sls-load-distribution","title":"SLS Load Distribution","content":data.get("sls_load_distribution",[])},{"id":"final-results","title":"ULS / SLS Final Results","content":data["final_results"]},{"id":"warnings","title":"Warnings and Limitations","content":{"warnings":data["warnings"],"limitations":data["limitations"]}},{"id":"references","title":"NBCC 2020 References","content":_public_references(data["code_references"])},{"id":"validation","title":"Validation Statement","content":data["validation_statement"]}]
    return ReportPreviewResponse(report_revision="4",title="NBCC 2020 Roof Snow Calculation Report Preview",sections=sections,figures=calculation.figure_metadata,official_pdf_available=True,entitlement_required=False)

def _fmt(value:Any,digits:int=3)->str:
    if isinstance(value,bool): return "Yes" if value else "No"
    if isinstance(value,(int,float)): return f"{value:.{digits}f}"
    if value is None:return "-"
    return str(value)

def _table(rows:list[list[Any]],widths:list[float]|None=None)->Table:
    t=Table(rows,colWidths=widths,repeatRows=1,hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#D9EAF7")),("TEXTCOLOR",(0,0),(-1,0),colors.HexColor("#173B5D")),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTNAME",(0,1),(0,-1),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),8.5),("GRID",(0,0),(-1,-1),0.45,colors.HexColor("#9AA8B3")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]));return t

def build_pdf_bytes(payload:CalculationRequest,calculation:CalculationResponse)->bytes:
    stream=BytesIO();doc=SimpleDocTemplate(stream,pagesize=A4,rightMargin=13*mm,leftMargin=13*mm,topMargin=12*mm,bottomMargin=12*mm,title="NBCC 2020 Roof Snow Report",author="LinkoTech Engineering")
    styles=getSampleStyleSheet(); title=ParagraphStyle("ReportTitle",parent=styles["Title"],fontName="Helvetica-Bold",fontSize=15,leading=18,textColor=colors.HexColor("#173B5D"),alignment=TA_LEFT,spaceAfter=8); h2=ParagraphStyle("ReportH2",parent=styles["Heading2"],fontName="Helvetica-Bold",fontSize=10.5,leading=13,textColor=colors.HexColor("#1F4E78"),spaceBefore=9,spaceAfter=5); body=ParagraphStyle("ReportBody",parent=styles["BodyText"],fontSize=8.5,leading=11)
    mode_titles={"UNIFORM_ROOF":"Uniform snow load","LOWER_ADJACENT_ROOF":"Snow distribution and snow loading factors for lower levels of adjacent roofs","ROOF_PROJECTION_OR_PARAPET":"Snow distribution and snow loading factors adjacent to roof obstructions / parapets"}
    story=[Paragraph("LINKOTECH ENGINEERING",title),Paragraph("NBCC 2020 Roof Snow Calculation — ULS & SLS",styles["Heading2"]),Paragraph(mode_titles.get(payload.mode.value,payload.mode.value),body),Spacer(1,5*mm)]
    c=payload.common
    rows=[["var","ULS / value","SLS / basis","unit"],["Ss",_fmt(c.ss),"same climatic value","kPa"],["Sr",_fmt(c.sr_climatic),"same climatic value","kPa"],["alpha",_fmt(c.roof_slope_alpha,2),"same geometry","deg"],["Is",_fmt(c.is_factor),"0.900",""],["Cw",_fmt(c.cw),"same",""],["Cb",_fmt(c.cb),"same",""]]
    story += [Paragraph("Input parameters and limit-state factors",h2),_table(rows,[28*mm,45*mm,72*mm,25*mm])]
    final_rows=[["result","value","unit"]]
    for k,v in calculation.final_results.items(): final_rows.append([k,_fmt(v),"kPa" if "load" in k.lower() else ""])
    story += [Paragraph("ULS / SLS snow-load results",h2),_table(final_rows,[85*mm,45*mm,40*mm])]
    if calculation.distribution_segments:
        sls=calculation.report_data.get("sls_load_distribution",[]); dist=[["x (m)","Ca","ULS S (kPa)","SLS S (kPa)"]]
        for i,p in enumerate(calculation.distribution_segments):
            sp=sls[i] if i<len(sls) else {};dist.append([_fmt(p.get("x_m"),2),_fmt(p.get("ca")),_fmt(p.get("snow_load_kpa")),_fmt(sp.get("snow_load_kpa"))])
        story += [Paragraph("Load distribution — ULS and SLS",h2),_table(dist,[38*mm,38*mm,47*mm,47*mm])]
    if calculation.warnings:
        story.append(Paragraph("Warnings",h2));story += [Paragraph(f"- {w}",body) for w in calculation.warnings]
    refs=[r.get("reference","") for r in calculation.references if r.get("reference")]
    if refs:
        rr=[["NBCC 2020 Reference"]]+[[r] for r in refs];story += [Paragraph("NBCC 2020 References",h2),_table(rr,[170*mm])]
    story += [Spacer(1,5*mm),Paragraph("ULS uses the selected NBCC Importance Category factor. SLS uses Is = 0.90 in accordance with the importance-factor table used by this application. Both limit states use the same calculated geometry and snow-distribution factors.",body)]
    doc.build(story);return stream.getvalue()
