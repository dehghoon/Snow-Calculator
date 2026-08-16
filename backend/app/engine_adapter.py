from __future__ import annotations

import dataclasses
from typing import Any

from nbcc2020_roof_snow import (
    CommonSnowInputs, LowerRoofCaseInput, ProjectionInput,
    calculate_common_parameters, calculate_lower_roof_case,
    calculate_projection_drift, calculate_specified_snow_load,
    select_governing_lower_roof_case,
)
from nbcc2020_roof_snow.calculations.common import calculate_sr_applicable
from nbcc2020_roof_snow.calculations.distribution import calculate_distribution_point
from nbcc2020_roof_snow.models.enums import ApplicabilityStatus, CaseId, RoofSurfaceType
from .schemas import CalculationMode, CalculationRequest, CalculationResponse

SLS_IMPORTANCE_FACTOR = 0.90


def _plain(value: Any) -> Any:
    if dataclasses.is_dataclass(value): return _plain(dataclasses.asdict(value))
    if isinstance(value, dict): return {k: _plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)): return [_plain(v) for v in value]
    return getattr(value, "value", value)


def _common(request: CalculationRequest) -> CommonSnowInputs:
    c = request.common
    return CommonSnowInputs(ss=c.ss, sr_climatic=c.sr_climatic, roof_slope_alpha=c.roof_slope_alpha,
        roof_surface_type=RoofSurfaceType(c.roof_surface_type.value), is_factor=c.is_factor,
        cw=c.cw, cb=c.cb, h_prime=c.h_prime,
        adjacent_surface_drift_applicable=c.adjacent_surface_drift_applicable)


def _distribution(request: CalculationRequest, *, ca0: float, xd: float, cs: float, is_factor: float | None = None) -> list[dict[str, Any]]:
    count = request.distribution_points
    xs = [0.0] if xd <= 0 else [xd * i / (count - 1) for i in range(count)]
    factor = request.common.is_factor if is_factor is None else is_factor
    out = []
    for x in xs:
        p = calculate_distribution_point(x=x, ca0=ca0, xd=xd, is_factor=factor,
            ss=request.common.ss, cb=request.common.cb, cw=request.common.cw, cs=cs,
            sr_climatic=request.common.sr_climatic)
        out.append({"x_m": p.x, "ca": p.ca, "sr_applicable_kpa": p.sr_applicable, "snow_load_kpa": p.snow_load})
    return out


def _sls_from_distribution(request: CalculationRequest, distribution: list[dict[str, Any]], cs: float) -> list[dict[str, Any]]:
    out = []
    for p in distribution:
        ca = float(p["ca"])
        sr = calculate_sr_applicable(ss=request.common.ss, sr_climatic=request.common.sr_climatic,
            cb=request.common.cb, cw=request.common.cw, cs=cs, ca=ca)
        snow = calculate_specified_snow_load(is_factor=SLS_IMPORTANCE_FACTOR, ss=request.common.ss,
            cb=request.common.cb, cw=request.common.cw, cs=cs, ca=ca, sr_applicable=sr)
        out.append({"x_m": p["x_m"], "ca": ca, "sr_applicable_kpa": sr, "snow_load_kpa": snow})
    return out


def _refs(mode: CalculationMode) -> list[dict[str, str]]:
    refs = [
        {"formula_id":"NBCC20-IS-001","reference":"NBCC 2020 Table 4.1.6.2.-A (Importance factor: ULS by category; SLS = 0.90)"},
        {"formula_id":"NBCC20-GAMMA-001","reference":"NBCC 2020 roof snow calculation specification"},
        {"formula_id":"NBCC20-CS-001","reference":"NBCC 2020 roof snow calculation specification"},
        {"formula_id":"NBCC20-SR-001","reference":"NBCC 2020 roof snow calculation specification"},
        {"formula_id":"NBCC20-SNOW-001","reference":"NBCC 2020 roof snow calculation specification"},
    ]
    if mode == CalculationMode.LOWER_ADJACENT_ROOF:
        refs += [{"formula_id":x,"reference":"Approved lower-roof drift calculation"} for x in ("NBCC20-LCS-001","NBCC20-CA0-CASE-001","NBCC20-XD-001","NBCC20-CA-X-001")]
    elif mode == CalculationMode.ROOF_PROJECTION_OR_PARAPET:
        refs += [{"formula_id":x,"reference":"Approved projection/parapet drift calculation"} for x in ("NBCC20-PAR-CA0-001","NBCC20-PAR-XD-001")]
    return refs


def calculate(request: CalculationRequest) -> CalculationResponse:
    common = calculate_common_parameters(_common(request))
    warnings=[]; errors=[]; case_geometry=[]; case_results=[]; governing_case=None; projection_result=None
    interpreted={"mode":request.mode.value}; status="OK"
    if request.common.cw_override_reason: warnings.append("WARN_MANUAL_CW_OVERRIDE")
    if request.common.is_override_reason: warnings.append("WARN_MANUAL_IS_OVERRIDE")

    if request.mode == CalculationMode.UNIFORM_ROOF:
        ca=1.0
        sr=calculate_sr_applicable(ss=request.common.ss,sr_climatic=request.common.sr_climatic,cb=request.common.cb,cw=request.common.cw,cs=common.cs,ca=ca)
        snow=calculate_specified_snow_load(is_factor=request.common.is_factor,ss=request.common.ss,cb=request.common.cb,cw=request.common.cw,cs=common.cs,ca=ca,sr_applicable=sr)
        distribution=[{"x_m":0.0,"ca":ca,"sr_applicable_kpa":sr,"snow_load_kpa":snow}]
        final={"governing_snow_load_kpa":snow,"ca":ca,"sr_applicable_kpa":sr}
    elif request.mode == CalculationMode.LOWER_ADJACENT_ROOF:
        applicable=[]
        for g in request.lower_roof_cases:
            case_geometry.append(g.model_dump(mode="json"))
            if g.applicability_status.value != "APPLICABLE": continue
            result=calculate_lower_roof_case(LowerRoofCaseInput(case_id=CaseId(g.case_id),ls=g.ls,ws=g.ws,step_height=g.step_height,parapet_height=g.parapet_height,applicability_status=ApplicabilityStatus.APPLICABLE,available_drift_length=g.available_drift_length),ss=request.common.ss,gamma=common.gamma,cb=request.common.cb)
            applicable.append(result); case_results.append(_plain(result)); warnings += list(result.warnings)
        if not applicable:
            status="REQUIRES_ENGINEERING_REVIEW"; errors.append("ERR_REQUIRED_CASE_NOT_EVALUATED"); distribution=[]; final={}
        else:
            governing,tie_warnings=select_governing_lower_roof_case(applicable); warnings += list(tie_warnings); governing_case=_plain(governing)
            distribution=_distribution(request,ca0=governing.ca0,xd=governing.xd_used,cs=common.cs)
            final={"governing_case":governing.case_id.value,"governing_ca0":governing.ca0,"drift_length_code_m":governing.xd_code,"drift_length_used_m":governing.xd_used,"peak_snow_load_kpa":max(p["snow_load_kpa"] for p in distribution),"tail_snow_load_kpa":distribution[-1]["snow_load_kpa"]}
            status=governing.status.value
            interpreted={"mode":request.mode.value,"mapping_source":"Explicit structured case geometry supplied to validated engine","review_required_if_ambiguous":True}
    else:
        p=request.projection; assert p is not None
        result=calculate_projection_drift(ProjectionInput(projection_height=p.projection_height,projection_longest_dimension=p.projection_longest_dimension,available_drift_length=p.available_drift_length),gamma=common.gamma,cb=request.common.cb,ss=request.common.ss)
        projection_result=_plain(result); warnings += list(result.warnings)
        distribution=_distribution(request,ca0=result.ca0,xd=result.xd_used,cs=common.cs)
        final={"exempt":result.exempt,"governing_ca0":result.ca0,"ca0_governing_term":result.ca0_governing_term,"drift_length_code_m":result.xd_code,"drift_length_used_m":result.xd_used,"xd_governing_term":result.xd_governing_term,"peak_snow_load_kpa":max(p["snow_load_kpa"] for p in distribution),"tail_snow_load_kpa":distribution[-1]["snow_load_kpa"]}
        status=result.status.value; interpreted |= {"projection_height_m":p.projection_height,"projection_longest_dimension_m":p.projection_longest_dimension}

    sls_distribution=_sls_from_distribution(request,distribution,common.cs) if distribution else []
    if sls_distribution:
        sls_peak=max(p["snow_load_kpa"] for p in sls_distribution); sls_tail=sls_distribution[-1]["snow_load_kpa"]
        final["uls_importance_factor"]=request.common.is_factor
        final["sls_importance_factor"]=SLS_IMPORTANCE_FACTOR
        final["sls_peak_snow_load_kpa"]=sls_peak
        final["sls_tail_snow_load_kpa"]=sls_tail
    warnings=sorted(set(warnings)); refs=_refs(request.mode)
    trace=[{"stage":"input_validation","status":"PASS"},{"stage":"engine_common_parameters","status":"PASS"},{"stage":"mode_calculation","status":"PASS" if not errors else "REVIEW"}]
    report_data={"document_control":{"code_edition":"NBCC 2020","calculation_basis":"Production"},"calculation_basis":"Validated Agent #2 Python engine","geometry":interpreted,"climatic_inputs":{"ss_kpa":request.common.ss,"sr_climatic_kpa":request.common.sr_climatic},"common_snow_parameters":{"gamma_kn_m3":common.gamma,"cs":common.cs,"cw":request.common.cw,"cb":request.common.cb,"is_uls":request.common.is_factor,"is_sls":SLS_IMPORTANCE_FACTOR},"source_area_cases":case_results,"governing_case":governing_case,"projection":projection_result,"load_distribution":distribution,"sls_load_distribution":sls_distribution,"final_results":final,"warnings":warnings,"limitations":["Jurisdiction-specific adoption and amendments are not verified by this calculation.","Figures are interpretation aids and are not numerical measuring devices."],"code_references":refs,"validation_statement":"Calculation executed through the validated Agent #2 engine without client-side engineering recomputation."}
    return CalculationResponse(calculation_status=status,jurisdiction=request.jurisdiction,inputs=request.model_dump(mode="json",by_alias=True),interpreted_geometry=interpreted,case_geometry=case_geometry,derived_parameters={"gamma_kn_m3":common.gamma,"cs":common.cs,"is_uls":request.common.is_factor,"is_sls":SLS_IMPORTANCE_FACTOR},case_results=case_results,governing_case=governing_case,projection_result=projection_result,distribution_segments=distribution,final_results=final,warnings=warnings,errors=errors,references=refs,validation_trace=trace,figure_metadata=[],report_data=report_data)
