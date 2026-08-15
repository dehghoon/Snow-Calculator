import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { calculateRoofSnow, getClimaticLocation, getClimaticLocations, getClimaticProvinces } from "./api";
import type { CalculationMode, CalculationRequest, CalculationResponse } from "./types";

const modes: { value: CalculationMode; label: string }[] = [
  { value: "UNIFORM_ROOF", label: "Uniform roof" },
  { value: "LOWER_ADJACENT_ROOF", label: "Lower adjacent roof" },
  { value: "ROOF_PROJECTION_OR_PARAPET", label: "Projection / parapet" },
];

type HelpKey = "slope" | "surface" | "is" | "cw" | "cb" | "case" | "ls" | "ws" | "h" | "hp";
const cbRows = [
  [70,.80,.80,.80],[80,.82,.85,.91],[100,.85,.94,1.11],[120,.88,1.01,1.27],[140,.90,1.07,1.40],[160,.92,1.12,1.51],[180,.93,1.16,1.60],[200,.95,1.19,1.67],[220,.96,1.21,1.73],[240,.96,1.24,1.78],[260,.97,1.25,1.82],[280,.98,1.27,1.85],[300,.98,1.28,1.88],[320,.99,1.29,1.90],[340,.99,1.30,1.92],[360,.99,1.30,1.93],[380,.99,1.30,1.95],[400,.99,1.31,1.95],[420,.99,1.31,1.96],[440,1.00,1.32,1.96],[460,1.00,1.32,1.97],[480,1.00,1.32,1.98],[500,1.00,1.32,1.98],[520,1.00,1.33,1.98],[540,1.00,1.33,1.99],[560,1.00,1.33,1.99],[580,1.00,1.33,1.99],[600,1.00,1.33,1.99],[620,1.00,1.33,2.00],
];

const help: Record<HelpKey, { title: string; reference: string; visual: ReactNode; body: ReactNode }> = {
  slope: {
    title: "Roof slope, α", reference: "Project geometry input",
    visual: <svg viewBox="0 0 220 90"><path d="M25 70H195M45 70L165 25"/><path d="M76 70A31 31 0 0 1 74 59"/><text x="82" y="61">α</text></svg>,
    body: <><p>Enter the actual roof angle measured from horizontal.</p><p className="help-note">This is a physical project input. The engine calculates the applicable slope factor internally from the roof slope and surface condition.</p></>,
  },
  surface: {
    title: "Roof surface", reference: "NBCC 2020 4.1.6.2.(5)–(7)",
    visual: <svg viewBox="0 0 220 90"><path d="M20 65L90 30M125 65L195 30"/><circle cx="52" cy="43" r="5"/><path d="M154 44l22-11M172 31l-5 9"/><text x="30" y="82">Normal</text><text x="132" y="82">Slippery</text></svg>,
    body: <><p><b>Normal</b> — ordinary roof surface condition.</p><p><b>Smooth / slippery</b> — use only where the roof is unobstructed and snow and ice can slide completely off the roof.</p><p className="help-note">If parapets, obstructions, geometry, or other conditions prevent complete sliding, do not assume the slippery-roof condition.</p></>,
  },
  is: {
    title: "Importance factor, Is", reference: "NBCC 2020 Table 4.1.6.2.-A",
    visual: <svg viewBox="0 0 220 90"><path d="M55 72V35L110 15l55 20v37M40 72h140M88 72V48h44v24"/><text x="92" y="43">Is</text></svg>,
    body: <><p>Select the building Importance Category and use the factor for the applicable limit state.</p><table className="help-table help-table-wide"><thead><tr><th>Importance category</th><th>ULS</th><th>SLS</th></tr></thead><tbody><tr><td>Low</td><td>0.80</td><td>0.90</td></tr><tr><td>Normal</td><td>1.00</td><td>0.90</td></tr><tr><td>High</td><td>1.15</td><td>0.90</td></tr><tr><td>Post-disaster</td><td>1.25</td><td>0.90</td></tr></tbody></table><p className="help-note">Use the project's NBCC Importance Category. If the classification is uncertain, confirm it before selecting Is.</p></>,
  },
  cw: {
    title: "Wind exposure factor, Cw", reference: "NBCC 2020 4.1.6.2.(3)–(4)",
    visual: <svg viewBox="0 0 220 90"><path d="M25 28h75M15 43h105M35 58h70M135 70V43l28-15 28 15v27M128 70h70"/><text x="56" y="23">wind</text><text x="151" y="61">Cw</text></svg>,
    body: <><div className="help-callout"><b>Default: Cw = 1.0</b><span>Use 1.0 unless the NBCC reduction conditions are fully satisfied.</span></div><p><b>Cw = 0.75</b> may be used only for Low or Normal Importance buildings in the qualifying rural / exposed condition and when all required exposure conditions are satisfied.</p><ul><li>Exposed on all sides to wind over open terrain and expected to remain so.</li><li>Roof exposed on all sides without significant nearby roof obstructions within the Code clearance.</li><li>No accumulation due to drifting from adjacent surfaces.</li></ul><p className="help-note">For adjacent-surface drift, use Cw = 1.0.</p></>,
  },
  cb: {
    title: "Basic roof factor, Cb", reference: "NBCC 2020 4.1.6.2.(2) and Table 4.1.6.2.-B",
    visual: <svg viewBox="0 0 220 90"><path d="M30 65h160M50 65l55-38 65 38"/><path d="M61 53h98" strokeDasharray="5 4"/><text x="96" y="48">Cb</text></svg>,
    body: <><div className="help-callout"><b>Quick rule</b><span>Cb = 0.80 when lc ≤ 70 / Cw².</span></div><p>For <b>lc &gt; 70 / Cw²</b>, use Table 4.1.6.2.-B. Linear interpolation is permitted for intermediate values of <b>lc Cw²</b> or <b>Cw</b>.</p><div className="help-table-scroll"><table className="help-table help-table-wide"><thead><tr><th>lc Cw²</th><th>Cw = 1.0</th><th>Cw = 0.75</th><th>Cw = 0.50</th></tr></thead><tbody>{cbRows.map(r => <tr key={r[0]}><td>{r[0]}</td><td>{Number(r[1]).toFixed(2)}</td><td>{Number(r[2]).toFixed(2)}</td><td>{Number(r[3]).toFixed(2)}</td></tr>)}</tbody></table></div><p className="help-note">Cb = 1.0 also applies for the low mean-roof-height condition stated by NBCC. lc is the Code characteristic roof length.</p></>,
  },
  case: {
    title: "Lower-roof source case", reference: "Commentary G Figure G-2 / approved geometry contract",
    visual: <svg viewBox="0 0 220 90"><rect x="18" y="24" width="52" height="40"/><rect x="84" y="36" width="52" height="28"/><rect x="150" y="36" width="52" height="28"/><text x="35" y="19">I</text><text x="103" y="31">II</text><text x="170" y="31">III</text></svg>,
    body: <><table className="help-table"><tbody><tr><td><b>Case I</b></td><td>Upper-roof snow source contributing to the lower receiving roof; β = 1.00.</td></tr><tr><td><b>Case II</b></td><td>Applicable lower-roof source toward the roof step; β = 0.67.</td></tr><tr><td><b>Case III</b></td><td>Alternate lower-roof source configuration/direction where geometry permits; β = 0.67.</td></tr></tbody></table><p className="help-note">Each case has its own source area and its own ls / ws mapping. Use the case that matches the actual source surface and drift direction.</p></>,
  },
  ls: {
    title: "Source length, ls", reference: "Commentary G Figure G-2 / lower-roof source-area mapping",
    visual: <svg viewBox="0 0 220 90"><rect x="28" y="25" width="164" height="42"/><path d="M45 76H175"/><text x="103" y="84">ls</text></svg>,
    body: <><p><b>ls is the physical source-area length for the selected drift case.</b></p><p>Measure it from the actual project geometry for the snow source surface associated with that case.</p><p className="help-note">Do not reuse one generic roof length for Cases I–III and do not scale ls from a Code figure.</p></>,
  },
  ws: {
    title: "Source width, ws", reference: "Commentary G Figure G-2 / lower-roof source-area mapping",
    visual: <svg viewBox="0 0 220 90"><rect x="48" y="15" width="124" height="60"/><path d="M37 21V69"/><text x="19" y="49">ws</text></svg>,
    body: <><p><b>ws is the physical source-area width for the selected drift case.</b></p><p>Use the dimension of the snow source area perpendicular to the corresponding source length, based on the selected case geometry.</p><p className="help-note">Each applicable case can have a different ws. Use verified project dimensions only.</p></>,
  },
  h: {
    title: "Roof step height, h", reference: "NBCC Figure 4.1.6.5.-A / Commentary G geometry",
    visual: <svg viewBox="0 0 220 90"><path d="M25 30H100V65H195"/><path d="M115 31V64"/><text x="122" y="51">h</text></svg>,
    body: <><p><b>h is the vertical roof-level difference at the step that creates the sheltered lower-roof drift condition.</b></p><p>Enter the actual vertical project dimension between the relevant roof elevations.</p><p className="help-note">Do not include snow depth in h and do not estimate h from the reference figure.</p></>,
  },
  hp: {
    title: "Parapet height, hp", reference: "Commentary G geometry",
    visual: <svg viewBox="0 0 220 90"><path d="M20 64H200M35 64V30M185 64V30"/><path d="M50 31V63M170 31V63"/><text x="54" y="49">hp</text><text x="141" y="49">hp</text></svg>,
    body: <><p><b>hp is the vertical parapet height above the roof surface.</b></p><p>Enter the actual project parapet height for the applicable roof edge / geometry.</p><p className="help-note">The reference view now shows parapets on both sides only to clarify the dimension; use the actual project geometry and value.</p></>,
  },
};

function HelpButton({ id, open, setOpen }: { id: HelpKey; open: HelpKey|null; setOpen: (v: HelpKey|null) => void }) {
  const item = help[id];
  return <span className="help-wrap"><button type="button" className="help-button" aria-label={`Help for ${item.title}`} aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>?</button>{open === id && <span className="help-popover" role="dialog" aria-label={item.title}><button type="button" className="help-close" aria-label="Close help" onClick={() => setOpen(null)}>×</button><span className="help-title">{item.title}</span><span className="help-reference">{item.reference}</span><span className="help-visual">{item.visual}</span><span className="help-body">{item.body}</span><small>Selection aid based on the cited NBCC 2020 / approved geometry guidance. Project-specific engineering judgment and jurisdictional requirements still apply.</small></span>}</span>;
}

function NumberField({ label, value, onChange, unit, readOnly = false, helpId, openHelp, setOpenHelp }: { label: string; value: number; onChange: (n: number) => void; unit?: string; readOnly?: boolean; helpId?: HelpKey; openHelp?: HelpKey|null; setOpenHelp?: (v: HelpKey|null) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  function edit(next: string) { setDraft(next); if (next.trim() === "" || next === "-" || next === "." || next === "-.") return; const n = Number(next); if (Number.isFinite(n)) onChange(n); }
  function finish() { const n = Number(draft); if (draft.trim() === "" || !Number.isFinite(n)) setDraft(String(value)); else onChange(n); }
  return <label className="field"><span className="field-label">{label}{helpId && setOpenHelp && <HelpButton id={helpId} open={openHelp ?? null} setOpen={setOpenHelp}/>}</span><div className="input"><input type="text" inputMode="decimal" value={draft} readOnly={readOnly} onChange={e => edit(e.target.value)} onBlur={finish}/><small>{unit}</small></div></label>;
}

function ReferenceFigure({ src, title, reference }: { src: string; title: string; reference: string }) { return <aside className="engineering-figure" aria-label={title}><div className="figure-heading"><div><span>GEOMETRY REFERENCE</span><b>{title}</b></div><small>{reference}</small></div><img src={src} alt={title}/><p>Use this diagram to identify physical dimensions only. Enter verified project dimensions; do not scale values from the figure.</p></aside>; }

export default function App() {
  const [mode, setMode] = useState<CalculationMode>("UNIFORM_ROOF");
  const [ss, setSs] = useState(2.5), [sr, setSr] = useState(0.4);
  const [province, setProvince] = useState(""), [location, setLocation] = useState("");
  const [provinces, setProvinces] = useState<string[]>([]), [locations, setLocations] = useState<string[]>([]), [climaticSource, setClimaticSource] = useState("");
  const [slope, setSlope] = useState(10), [isFactor, setIsFactor] = useState(1), [cw, setCw] = useState(1), [cb, setCb] = useState(0.8);
  const [surface, setSurface] = useState<"normal"|"smooth_slippery">("normal"), [openHelp, setOpenHelp] = useState<HelpKey|null>(null);
  const [caseId, setCaseId] = useState<"I"|"II"|"III">("I");
  const [ls, setLs] = useState(20), [ws, setWs] = useState(10), [stepHeight, setStepHeight] = useState(2), [parapetHeight, setParapetHeight] = useState(0);
  const [projectionHeight, setProjectionHeight] = useState(1), [projectionLength, setProjectionLength] = useState(3);
  const [result, setResult] = useState<CalculationResponse|null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);

  useEffect(() => { getClimaticProvinces().then(setProvinces).catch(err => setError(err instanceof Error ? err.message : "Failed to load provinces.")); }, []);
  async function changeProvince(next: string) { setProvince(next); setLocation(""); setLocations([]); setClimaticSource(""); setResult(null); if (!next) return; try { setError(""); setLocations(await getClimaticLocations(next)); } catch (err) { setError(err instanceof Error ? err.message : "Failed to load locations."); } }
  async function changeLocation(next: string) { setLocation(next); setResult(null); if (!province || !next) return; try { setError(""); const data = await getClimaticLocation(province, next); setSs(data.ss); setSr(data.sr); setClimaticSource(data.source); } catch (err) { setError(err instanceof Error ? err.message : "Failed to load climatic data."); } }

  const payload = useMemo<CalculationRequest>(() => {
    const base: CalculationRequest = { mode, common: { ss, sr_climatic: sr, roof_slope_alpha: slope, roof_surface_type: surface, is: isFactor, cw, cb, adjacent_surface_drift_applicable: mode === "LOWER_ADJACENT_ROOF" }, distribution_points: 10 };
    if (mode === "LOWER_ADJACENT_ROOF") base.lower_roof_cases = [{ case_id: caseId, source_surface: "Upper roof", receiving_surface: "Lower roof", drift_direction: "Toward roof step", ls, ws, step_height: stepHeight, parapet_height: parapetHeight, applicability_status: "APPLICABLE", interpretation_note: "Explicit structured case geometry" }];
    if (mode === "ROOF_PROJECTION_OR_PARAPET") base.projection = { projection_height: projectionHeight, projection_longest_dimension: projectionLength };
    return base;
  }, [mode, ss, sr, slope, surface, isFactor, cw, cb, caseId, ls, ws, stepHeight, parapetHeight, projectionHeight, projectionLength]);

  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(""); try { setResult(await calculateRoofSnow(payload)); } catch (err) { setResult(null); setError(err instanceof Error ? err.message : "Calculation failed."); } finally { setBusy(false); } }
  const peak = result?.final_results["peak_snow_load_kpa"] ?? result?.final_results["governing_snow_load_kpa"];

  return <main>
    <header className="hero"><div><p className="eyebrow">LINKOTECH ENGINEERING</p><h1>NBCC 2020 Roof Snow Calculator</h1><p>Validated calculation engine with traceable inputs, engineering geometry and report-ready results.</p></div><span className="badge">NBCC 2020</span></header>
    <div className="layout">
      <form className="panel" onSubmit={submit}>
        <div className="heading"><div><p className="eyebrow">INPUTS</p><h2>Snow parameters</h2></div></div>
        <label className="field"><span>Roof configuration</span><select value={mode} onChange={e => { setMode(e.target.value as CalculationMode); setResult(null); setOpenHelp(null); }}>{modes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
        <section className="mode"><p><strong>Project location</strong></p><div className="grid"><label className="field"><span>Province / territory</span><select value={province} onChange={e => changeProvince(e.target.value)}><option value="">Select province</option>{provinces.map(p => <option key={p}>{p}</option>)}</select></label><label className="field"><span>Location</span><select value={location} disabled={!province} onChange={e => changeLocation(e.target.value)}><option value="">{province ? "Select location" : "Select province first"}</option>{locations.map(l => <option key={l}>{l}</option>)}</select></label></div>{climaticSource && <p className="note">Climatic values loaded automatically from {climaticSource}.</p>}</section>
        <div className="grid">
          <NumberField label="Ground snow load, Ss" unit="kPa" value={ss} onChange={setSs} readOnly={Boolean(location)}/>
          <NumberField label="Associated rain load, Sr" unit="kPa" value={sr} onChange={setSr} readOnly={Boolean(location)}/>
          <NumberField label="Roof slope, α" unit="deg" value={slope} onChange={setSlope} helpId="slope" openHelp={openHelp} setOpenHelp={setOpenHelp}/>
          <label className="field"><span className="field-label">Roof surface<HelpButton id="surface" open={openHelp} setOpen={setOpenHelp}/></span><select value={surface} onChange={e => setSurface(e.target.value as typeof surface)}><option value="normal">Normal</option><option value="smooth_slippery">Smooth / slippery</option></select></label>
          <NumberField label="Importance factor, Is" value={isFactor} onChange={setIsFactor} helpId="is" openHelp={openHelp} setOpenHelp={setOpenHelp}/>
          <NumberField label="Wind exposure factor, Cw" value={cw} onChange={setCw} helpId="cw" openHelp={openHelp} setOpenHelp={setOpenHelp}/>
          <NumberField label="Basic roof factor, Cb" value={cb} onChange={setCb} helpId="cb" openHelp={openHelp} setOpenHelp={setOpenHelp}/>
        </div>

        {mode === "LOWER_ADJACENT_ROOF" && <div className="input-figure-layout"><section className="mode geometry-inputs"><p><strong>Source-area geometry</strong></p><p className="note">Use the help icons and the reference figure to map project geometry to the calculation inputs.</p><label className="field"><span className="field-label">Case<HelpButton id="case" open={openHelp} setOpen={setOpenHelp}/></span><select value={caseId} onChange={e => setCaseId(e.target.value as typeof caseId)}><option>I</option><option>II</option><option>III</option></select></label><div className="grid"><NumberField label="Source length, ls" unit="m" value={ls} onChange={setLs} helpId="ls" openHelp={openHelp} setOpenHelp={setOpenHelp}/><NumberField label="Source width, ws" unit="m" value={ws} onChange={setWs} helpId="ws" openHelp={openHelp} setOpenHelp={setOpenHelp}/><NumberField label="Roof step height, h" unit="m" value={stepHeight} onChange={setStepHeight} helpId="h" openHelp={openHelp} setOpenHelp={setOpenHelp}/><NumberField label="Parapet height, hp" unit="m" value={parapetHeight} onChange={setParapetHeight} helpId="hp" openHelp={openHelp} setOpenHelp={setOpenHelp}/></div>{cw !== 1 && <div className="error">Adjacent-surface drift requires Cw = 1.0.</div>}</section><ReferenceFigure src="/figures/lower-adjacent-roof.svg" title="Lower adjacent roof / drift geometry" reference="Workbook / Commentary geometry"/></div>}

        {mode === "ROOF_PROJECTION_OR_PARAPET" && <div className="input-figure-layout"><section className="mode geometry-inputs"><p><strong>Projection / parapet geometry</strong></p><p className="note">The figure beside these inputs identifies h, l₀, x and the drift region.</p><div className="grid"><NumberField label="Projection height, h" unit="m" value={projectionHeight} onChange={setProjectionHeight}/><NumberField label="Longest dimension, l0" unit="m" value={projectionLength} onChange={setProjectionLength}/></div></section><ReferenceFigure src="/figures/projection-parapet.svg" title="Roof obstruction / parapet drift geometry" reference="Workbook Figure G-8"/></div>}

        <button className="primary" disabled={busy}>{busy ? "Calculating…" : "Run calculation"}</button>{error && <div className="error">{error}</div>}
      </form>

      <section className="panel results"><div className="heading"><div><p className="eyebrow">RESULTS</p><h2>Governing calculation</h2></div>{result && <span className="status">{result.calculation_status}</span>}</div>{!result ? <div className="empty"><b>Ready to calculate</b><span>Run the validated NBCC 2020 engine to review results.</span></div> : <><div className="cards"><article><span>Peak / governing snow load</span><b>{typeof peak === "number" ? `${peak.toFixed(3)} kPa` : "—"}</b></article><article><span>Snow density, γ</span><b>{Number(result.derived_parameters["gamma_kn_m3"]).toFixed(3)} kN/m³</b></article><article><span>Calculated slope factor, Cs</span><b>{Number(result.derived_parameters["cs"]).toFixed(3)}</b></article></div>{result.warnings.length > 0 && <div className="warning"><b>Engineering warnings</b>{result.warnings.map(w => <span key={w}>{w}</span>)}</div>}<h3>Load distribution</h3><div className="table"><div className="row head"><span>x (m)</span><span>Ca</span><span>S (kPa)</span></div>{result.distribution_segments.map((p, i) => <div className="row" key={i}><span>{Number(p.x_m).toFixed(2)}</span><span>{Number(p.ca).toFixed(3)}</span><span>{Number(p.snow_load_kpa).toFixed(3)}</span></div>)}</div><details><summary>Engineering trace</summary><pre>{JSON.stringify({ governing_case: result.governing_case, projection_result: result.projection_result, references: result.references, validation_trace: result.validation_trace }, null, 2)}</pre></details><div className="report"><b>Report preview available</b><span>Official PDF requires authenticated server-side report entitlement.</span></div></>}</section>
    </div>
    <footer>Figures clarify variable meaning and geometry only; calculations use explicit project inputs and unrounded engine values.</footer>
  </main>;
}
