export type CalculationMode =
  | "UNIFORM_ROOF"
  | "LOWER_ADJACENT_ROOF"
  | "ROOF_PROJECTION_OR_PARAPET";

export interface CommonInputs {
  ss: number;
  sr_climatic: number;
  roof_slope_alpha: number;
  roof_surface_type: "normal" | "smooth_slippery";
  is: number;
  cw: number;
  cb: number;
  adjacent_surface_drift_applicable?: boolean;
}

export interface LowerRoofCaseGeometry {
  case_id: "I" | "II" | "III";
  source_surface: string;
  receiving_surface: string;
  drift_direction: string;
  ls: number;
  ws: number;
  step_height: number;
  parapet_height: number;
  available_drift_length?: number;
  applicability_status: "APPLICABLE" | "NOT_APPLICABLE" | "INSUFFICIENT_GEOMETRY";
  interpretation_note: string;
}

export interface CalculationRequest {
  mode: CalculationMode;
  common: CommonInputs;
  lower_roof_cases?: LowerRoofCaseGeometry[];
  projection?: {
    projection_height: number;
    projection_longest_dimension: number;
    available_drift_length?: number;
  };
  distribution_points?: number;
}

export interface SnowDistributionPoint {
  x_m: number;
  ca: number;
  sr_applicable_kpa: number;
  snow_load_kpa: number;
}

export interface CalculationResponse {
  calculation_status: string;
  calculation_basis: string;
  code_edition: string;
  jurisdiction: string;
  inputs: Record<string, unknown>;
  interpreted_geometry: Record<string, unknown>;
  case_geometry: Array<Record<string, unknown>>;
  derived_parameters: Record<string, number>;
  case_results: Array<Record<string, unknown>>;
  governing_case: Record<string, unknown> | null;
  projection_result: Record<string, unknown> | null;
  distribution_segments: SnowDistributionPoint[];
  final_results: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  references: Array<Record<string, string>>;
  validation_trace: Array<Record<string, string>>;
  figure_metadata: Array<Record<string, unknown>>;
  report_data: Record<string, unknown> & {
    sls_load_distribution?: SnowDistributionPoint[];
  };
}
