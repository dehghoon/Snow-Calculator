import type { CalculationRequest, CalculationResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function calculateRoofSnow(payload: CalculationRequest): Promise<CalculationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/calculations/roof-snow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail?.detail ?? body?.detail ?? "Calculation failed.";
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return response.json() as Promise<CalculationResponse>;
}
