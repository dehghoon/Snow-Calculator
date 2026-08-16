import type { CalculationRequest, CalculationResponse } from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 30000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The calculation service did not respond within 30 seconds. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail?.detail ?? body?.detail ?? "Request failed.";
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return response.json() as Promise<T>;
}

export async function getClimaticProvinces(): Promise<string[]> {
  const data = await getJson<{ provinces: string[] }>("/api/v1/climatic/provinces");
  return data.provinces;
}

export async function getClimaticLocations(province: string): Promise<string[]> {
  const data = await getJson<{ province: string; locations: string[] }>(`/api/v1/climatic/locations?province=${encodeURIComponent(province)}`);
  return data.locations;
}

export type ClimaticLocationData = {
  province: string;
  location: string;
  ss: number;
  sr: number;
  source: string;
};

export function getClimaticLocation(province: string, location: string): Promise<ClimaticLocationData> {
  return getJson<ClimaticLocationData>(`/api/v1/climatic/location?province=${encodeURIComponent(province)}&location=${encodeURIComponent(location)}`);
}

export async function calculateRoofSnow(payload: CalculationRequest): Promise<CalculationResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/calculations/roof-snow`, {
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
