from __future__ import annotations

from .schemas import CalculationResponse, ReportPreviewResponse


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
        report_revision="1",
        title="NBCC 2020 Roof Snow Calculation Report Preview",
        sections=sections,
        figures=calculation.figure_metadata,
        official_pdf_available=False,
    )
