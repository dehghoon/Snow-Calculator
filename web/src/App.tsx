import { FormEvent, useEffect, useMemo, useState } from "react";
import { calculateRoofSnow, getClimaticLocation, getClimaticLocations, getClimaticProvinces } from "./api";
import type { CalculationMode, CalculationRequest, CalculationResponse } from "./types";

const modes: { value: CalculationMode; label: string }[] = [
  { value: "UNIFORM_ROOF", label: "Uniform roof" },
  { value: "LOWER_ADJACENT_ROOF", label: "Lower adjacent roof" },
  { value: "ROOF_PROJECTION_OR_PARAPET", label: "Projection / parapet" },
];

function NumberField({ label, value, onChange, unit, readOnly = false }: { label: string; value: number; onChange: (n: number) => void; unit?: string; readOnly?: boolean }) {
  return <label className="field"><span>{label}</span><div className="input"><input type="number" step="any" value={value} readOnly={readOnly} onChange={e => onChange(Number(e.target.value))}/><small>{unit}</small></div></label>;
}

export default function App() {
  const [mode, setMode] = useState<CalculationMode>("UNIFORM_ROOF");
  const [ss, setSs] = useState(2.5);
  const [sr, setSr] = useState(0.4);
  const [province, setProvince] = useState("");
  const [location, setLocation] = useState("");
  const [provinces, setProvinces] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [climaticSource, setClimaticSource] = useState("");
  const [slope, setSlope] = useState(10);
  const [surface, setSurface] = useState<"normal"|"smooth_slippery">("normal");
  const [isFactor, setIsFactor] = useState(1);
  const [cw, setCw] = useState(1);
  const [cb, setCb] = useState(0.8);
  const [caseId, setCaseId] = useState<"I"|"II"|"III">("I");
  const [ls, setLs] = useState(20);
  const [ws, setWs] = useState(10);
  const [stepHeight, setStepHeight] = useState(2);
  const [parapetHeight, setParapetHeight] = useState(0);
  const [projectionHeight, setProjectionHeight] = useState(1);
  const [projectionLength, setProjectionLength] = useState(3);
  const [result, setResult] = useState<CalculationResponse|null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getClimaticProvinces().then(setProvinces).catch(err => setError(err instanceof Error ? err.message : "Failed to load provinces."));
  }, []);

  async function changeProvince(nextProvince: string) {
    setProvince(nextProvince);
    setLocation("");
    setLocations([]);
    setClimaticSource("");
    setResult(null);
    if (!nextProvince) return;
    try {
      setError("");
      setLocations(await getClimaticLocations(nextProvince));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load locations.");
    }
  }

  async function changeLocation(nextLocation: string) {
    setLocation(nextLocation);
    setResult(null);
    if (!province || !nextLocation) return;
    try {
      setError("");
      const data = await getClimaticLocation(province, nextLocation);
      setSs(data.ss);
      setSr(data.sr);
      setClimaticSource(data.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load climatic data.");
    }
  }

  const payload = useMemo<CalculationRequest>(() => {
    const base: CalculationRequest = {
      mode,
      common: { ss, sr_climatic: sr, roof_slope_alpha: slope, roof_surface_type: surface, is: isFactor, cw, cb, adjacent_surface_drift_applicable: mode === "LOWER_ADJACENT_ROOF" },
      distribution_points: 10,
    };
    if (mode === "LOWER_ADJACENT_ROOF") base.lower_roof_cases = [{
      case_id: caseId, source_surface: "Upper roof", receiving_surface: "Lower roof", drift_direction: "Toward roof step",
      ls, ws, step_height: stepHeight, parapet_height: parapetHeight, applicability_status: "APPLICABLE",
      interpretation_note: "Explicit structured case geometry"
    }];
    if (mode === "ROOF_PROJECTION_OR_PARAPET") base.projection = { projection_height: projectionHeight, projection_longest_dimension: projectionLength };
    return base;
  }, [mode, ss, sr, slope, surface, isFactor, cw, cb, caseId, ls, ws, stepHeight, parapetHeight, projectionHeight, projectionLength]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { setResult(await calculateRoofSnow(payload)); }
    catch (err) { setResult(null); setError(err instanceof Error ? err.message : "Calculation failed."); }
    finally { setBusy(false); }
  }

  const peak = result?.final_results["peak_snow_load_kpa"] ?? result?.final_results["governing_snow_load_kpa"];

  return <main>
    <header className="hero">
      <div><p className="eyebrow">LINKOTECH ENGINEERING</p><h1>NBCC 2020 Roof Snow Calculator</h1><p>Validated Agent #2 calculation engine with traceable inputs, warnings and report-ready results.</p></div>
      <span className="badge">NBCC 2020</span>
    </header>

    <div className="layout">
      <form className="panel" onSubmit={submit}>
        <div className="heading"><div><p className="eyebrow">INPUTS</p><h2>Snow parameters</h2></div></div>
        <label className="field"><span>Roof configuration</span><select value={mode} onChange={e => { setMode(e.target.value as CalculationMode); setResult(null); }}>{modes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
        <section className="mode">
          <p><strong>Project location</strong></p>
          <div className="grid">
            <label className="field"><span>Province / territory</span><select value={province} onChange={e => changeProvince(e.target.value)}><option value="">Select province</option>{provinces.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
            <label className="field"><span>Location</span><select value={location} disabled={!province} onChange={e => changeLocation(e.target.value)}><option value="">{province ? "Select location" : "Select province first"}</option>{locations.map(l => <option key={l} value={l}>{l}</option>)}</select></label>
          </div>
          {climaticSource && <p className="note">Climatic values loaded automatically from {climaticSource}.</p>}
        </section>
        <div className="grid">
          <NumberField label="Ground snow load, Ss" unit="kPa" value={ss} onChange={setSs} readOnly={Boolean(location)}/>
          <NumberField label="Associated rain load, Sr" unit="kPa" value={sr} onChange={setSr} readOnly={Boolean(location)}/>
          <NumberField label="Roof slope" unit="deg" value={slope} onChange={setSlope}/>
          <label className="field"><span>Roof surface</span><select value={surface} onChange={e => setSurface(e.target.value as typeof surface)}><option value="normal">Normal</option><option value="smooth_slippery">Smooth / slippery</option></select></label>
          <NumberField label="Importance factor, Is" value={isFactor} onChange={setIsFactor}/>
          <NumberField label="Wind exposure factor, Cw" value={cw} onChange={setCw}/>
          <NumberField label="Basic roof factor, Cb" value={cb} onChange={setCb}/>
        </div>

        {mode === "LOWER_ADJACENT_ROOF" && <section className="mode">
          <p><strong>Source-area geometry</strong></p>
          <p className="note">Enter verified project dimensions only. Do not scale dimensions from code figures.</p>
          <label className="field"><span>Case</span><select value={caseId} onChange={e => setCaseId(e.target.value as typeof caseId)}><option>I</option><option>II</option><option>III</option></select></label>
          <div className="grid">
            <NumberField label="Source length, ls" unit="m" value={ls} onChange={setLs}/>
            <NumberField label="Source width, ws" unit="m" value={ws} onChange={setWs}/>
            <NumberField label="Roof step height" unit="m" value={stepHeight} onChange={setStepHeight}/>
            <NumberField label="Parapet height" unit="m" value={parapetHeight} onChange={setParapetHeight}/>
          </div>
          {cw !== 1 && <div className="error">Adjacent-surface drift requires Cw = 1.0.</div>}
        </section>}

        {mode === "ROOF_PROJECTION_OR_PARAPET" && <section className="mode"><div className="grid">
          <NumberField label="Projection height" unit="m" value={projectionHeight} onChange={setProjectionHeight}/>
          <NumberField label="Longest dimension, l0" unit="m" value={projectionLength} onChange={setProjectionLength}/>
        </div></section>}

        <button className="primary" disabled={busy}>{busy ? "Calculating…" : "Run calculation"}</button>
        {error && <div className="error">{error}</div>}
      </form>

      <section className="panel results">
        <div className="heading"><div><p className="eyebrow">RESULTS</p><h2>Governing calculation</h2></div>{result && <span className="status">{result.calculation_status}</span>}</div>
        {!result ? <div className="empty"><b>Ready to calculate</b><span>Run the validated NBCC 2020 engine to review results.</span></div> :
        <>
          <div className="cards">
            <article><span>Peak / governing snow load</span><b>{typeof peak === "number" ? `${peak.toFixed(3)} kPa` : "—"}</b></article>
            <article><span>Snow density, γ</span><b>{Number(result.derived_parameters["gamma_kn_m3"]).toFixed(3)} kN/m³</b></article>
            <article><span>Slope factor, Cs</span><b>{Number(result.derived_parameters["cs"]).toFixed(3)}</b></article>
          </div>
          {result.warnings.length > 0 && <div className="warning"><b>Engineering warnings</b>{result.warnings.map(w => <span key={w}>{w}</span>)}</div>}
          <h3>Load distribution</h3>
          <div className="table"><div className="row head"><span>x (m)</span><span>Ca</span><span>S (kPa)</span></div>{result.distribution_segments.map((p, i) => <div className="row" key={i}><span>{Number(p.x_m).toFixed(2)}</span><span>{Number(p.ca).toFixed(3)}</span><span>{Number(p.snow_load_kpa).toFixed(3)}</span></div>)}</div>
          <details><summary>Engineering trace</summary><pre>{JSON.stringify({ governing_case: result.governing_case, projection_result: result.projection_result, references: result.references, validation_trace: result.validation_trace }, null, 2)}</pre></details>
          <div className="report"><b>Report preview available</b><span>Official PDF requires authenticated server-side report entitlement.</span></div>
        </>}
      </section>
    </div>

    <footer>Calculations use unrounded engine values. Professional release remains subject to review by the responsible licensed engineer.</footer>
  </main>;
}
