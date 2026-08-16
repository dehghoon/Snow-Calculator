(() => {
  const STORE = 'snow-calculator-report-state-v2';
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const num = v => { const n = Number(String(v ?? '').replace(/[^0-9+\-.eE]/g,'')); return Number.isFinite(n) ? n : null; };
  const fmt = (v, d=3) => Number.isFinite(Number(v)) ? Number(v).toFixed(d) : '—';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function readStored(){ try { return JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch { return {}; } }
  function saveStored(next){ sessionStorage.setItem(STORE, JSON.stringify({...readStored(), ...next})); }

  function readField(labelText){
    const labels = [...document.querySelectorAll('label.field')];
    const label = labels.find(l => norm(l.querySelector('.field-label,span')?.textContent).replace(/\?$/, '').startsWith(labelText));
    if(!label) return null;
    const el = label.querySelector('input,select');
    if(!el) return null;
    if(el.tagName === 'SELECT') return el.options[el.selectedIndex]?.text || el.value;
    return el.value;
  }

  function captureInputs(){
    const form = document.querySelector('form.panel');
    if(!form) return;
    const mode = readField('Roof configuration');
    const state = {
      mode,
      ss: readField('Ground snow load, Ss'),
      sr: readField('Associated rain load, Sr'),
      alpha: readField('Roof slope, α'),
      surface: readField('Roof surface'),
      is: readField('Importance factor, Is'),
      cw: readField('Wind exposure factor, Cw'),
      l: readField('Larger plan dimension, l'),
      w: readField('Smaller plan dimension, w'),
      lc: readField('Characteristic length, lc'),
      cb: readField('Calculated basic roof factor, Cb'),
      caseId: readField('Case'),
      ls: readField('Source length, ls'),
      ws: readField('Source width, ws'),
      h: readField('Roof step height, h') || readField('Projection height, h'),
      hp: readField('Parapet height, hp'),
      l0: readField('Longest dimension, l0'),
      province: readField('Province / territory'),
      location: readField('Location')
    };
    saveStored({inputs: state});
  }

  function captureResults(){
    const results = document.querySelector('.panel.results');
    if(!results) return;
    const cards = {};
    [...results.querySelectorAll('.cards article')].forEach(a => {
      const k = norm(a.querySelector('span')?.textContent);
      const v = norm(a.querySelector('b')?.textContent);
      if(k) cards[k] = v;
    });
    const distribution = [...results.querySelectorAll('.table .row:not(.head)')].map(r => {
      const c = [...r.querySelectorAll('span')].map(x => norm(x.textContent));
      return {x:c[0], ca:c[1], s:c[2]};
    });
    let trace = {};
    try { trace = JSON.parse(results.querySelector('details pre')?.textContent || '{}'); } catch {}
    saveStored({results:{cards, distribution, trace}});
  }

  function reportData(){
    captureInputs(); captureResults();
    const st = readStored(), i = st.inputs || {}, r = st.results || {};
    const ss=num(i.ss), sr=num(i.sr), Is=num(i.is), cw=num(i.cw), cb=num(i.cb), lc=num(i.lc), alpha=num(i.alpha);
    const gamma=num(r.cards?.['Snow density, γ']);
    const cs=num(r.cards?.['Calculated slope factor, Cs']);
    const threshold=num(r.cards?.['70 / Cw²']);
    const peak=num(r.cards?.['Peak / governing snow load']);
    const mode = i.mode || 'Uniform roof';
    const title = mode.includes('Lower') ? 'G-5 Snow distribution and snow loading factors for lower levels of adjacent roofs' : mode.includes('Projection') ? 'G-8 Snow distribution and snow loading factors for areas adjacent to roof obstructions' : 'Uniform snow load';
    const inputRows = [
      ['Ss', ss, 'kPa', 'ground snow load'], ['Sr', sr, 'kPa', 'rain load'],
      ...(mode.includes('Lower') ? [['h', num(i.h), 'm', 'height difference'], ['hp', num(i.hp), 'm', 'parapet height'], ['ls', num(i.ls), 'm', 'source length'], ['ws', num(i.ws), 'm', 'source width']] : []),
      ...(mode.includes('Projection') ? [['h', num(i.h), 'm', 'obstruction height'], ['l₀', num(i.l0), 'm', 'obstruction longest dimension']] : []),
      ['w', num(i.w), 'm', 'short edge length'], ['l', num(i.l), 'm', 'long edge length'], ['α', alpha, 'deg', 'roof angle'],
      ['γ', gamma, 'kN/m³', 'snow specific weight'], ['Cw', cw, '', 'wind exposure factor'], ['Is', Is, '', 'importance factor'], ['roof surface', i.surface || '', '', 'surface condition']
    ];
    const derivedRows = [
      ['lc', lc, '', '2w − w²/l'], ['70/Cw²', threshold, 'm', 'NBCC Cb threshold'], ['Cb', cb, '', lc != null && threshold != null && lc <= threshold ? '0.80 when lc ≤ 70/Cw²' : '(1/Cw)[1 − (1 − 0.8Cw)e^−((lcCw²−70)/100)]'], ['Cs', cs, '', 'slope factor calculated from α and roof surface']
    ];
    if(mode.includes('Uniform')) derivedRows.push(['Ca', 1, '', 'uniform roof shape factor']);
    if(mode.includes('Lower')) {
      const gc=r.trace?.governing_case || {};
      if(gc.F != null) derivedRows.push(['F', gc.F, '', 'governing lower-roof drift factor']);
      if(gc.ca != null || gc.Ca != null) derivedRows.push(['Ca', gc.ca ?? gc.Ca, '', 'accumulation factor']);
      if(gc.xd_m != null || gc.xd != null) derivedRows.push(['xd', gc.xd_m ?? gc.xd, 'm', 'drift length']);
    }
    if(mode.includes('Projection')) {
      const pr=r.trace?.projection_result || {};
      if(pr.ca != null || pr.Ca != null) derivedRows.push(['Ca', pr.ca ?? pr.Ca, '', 'accumulation factor']);
      if(pr.xd_m != null || pr.xd != null) derivedRows.push(['xd', pr.xd_m ?? pr.xd, 'm', 'drift length']);
    }
    const resultRows = mode.includes('Uniform') ? [['S', peak, 'kPa', 'Is × (Ss × Cb × Cw × Cs × Ca + Sr)']] : [['Smax', peak, 'kPa', 'peak / governing snow load from calculation engine']];
    return {mode,title,inputRows,derivedRows,resultRows,distribution:r.distribution||[],trace:r.trace||{},province:i.province,location:i.location};
  }

  const tr = row => `<tr><td>${esc(row[0])}</td><td class="val">${typeof row[1] === 'number' ? fmt(row[1]) : esc(row[1] ?? '—')}</td><td>${esc(row[2] ?? '')}</td><td>${esc(row[3] ?? '')}</td></tr>`;
  function buildReport(d){
    const importance = `<table class="excelTable importance"><thead><tr><th>Importance</th><th>ULS Is</th><th>SLS Is</th></tr></thead><tbody><tr><td>Low</td><td>0.80</td><td>0.90</td></tr><tr><td>Normal</td><td>1.00</td><td>0.90</td></tr><tr><td>High</td><td>1.15</td><td>0.90</td></tr><tr><td>Post-disaster</td><td>1.25</td><td>0.90</td></tr></tbody></table>`;
    const dist = d.distribution.length ? `<table class="excelTable distribution"><thead><tr><th>x</th><th>Ca</th><th>S</th></tr><tr class="units"><th>m</th><th></th><th>kPa</th></tr></thead><tbody>${d.distribution.map(x=>`<tr><td>${esc(x.x)}</td><td>${esc(x.ca)}</td><td>${esc(x.s)}</td></tr>`).join('')}</tbody></table>` : '<p class="reportNote">No load-distribution points are available for this calculation.</p>';
    const refs = Array.isArray(d.trace?.references) ? d.trace.references : [];
    return `<article class="excelCalcReport" id="excelCalcReport"><header class="excelTitle"><div><b>LINKOTECH ENGINEERING</b><span>NBCC 2020 Roof Snow Calculation</span></div><div><span>${esc(d.province || '')}${d.location ? ' / '+esc(d.location):''}</span><b>${esc(d.mode)}</b></div></header><h1>${esc(d.title)}</h1><section class="excelTwoCol"><div><h2>Input parameters</h2><table class="excelTable"><thead><tr><th>var</th><th>val</th><th>unit</th><th>desc / formula</th></tr></thead><tbody>${d.inputRows.map(tr).join('')}</tbody></table></div><div><h2>Importance factor</h2>${importance}</div></section><section><h2>Calculated parameters</h2><table class="excelTable"><thead><tr><th>var</th><th>val</th><th>unit</th><th>desc / formula</th></tr></thead><tbody>${d.derivedRows.map(tr).join('')}</tbody></table></section><section><h2>Snow-load results</h2><table class="excelTable resultTable"><thead><tr><th>name</th><th>val</th><th>unit</th><th>formula / basis</th></tr></thead><tbody>${d.resultRows.map(tr).join('')}</tbody></table></section><section><h2>Load distribution</h2>${dist}</section>${refs.length?`<section><h2>NBCC references</h2><table class="excelTable"><thead><tr><th>Formula ID</th><th>Reference</th></tr></thead><tbody>${refs.map(x=>`<tr><td>${esc(x.formula_id||'')}</td><td>${esc(x.reference||'')}</td></tr>`).join('')}</tbody></table></section>`:''}<footer class="excelFooter">Calculation values are generated from the current application inputs and NBCC 2020 calculation engine. Report layout follows the supplied Excel calculation sheets.</footer></article>`;
  }

  function printableHtml(reportHtml){
    const css = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>`<link rel="stylesheet" href="${l.href}">`).join('') + '<link rel="stylesheet" href="'+location.origin+'/report-enhancer.css">';
    return `<!doctype html><html><head><meta charset="utf-8"><title>NBCC 2020 Roof Snow Report</title>${css}</head><body class="standaloneReport">${reportHtml}</body></html>`;
  }
  function exportPdf(){ const d=reportData(), html=buildReport(d), w=window.open('','_blank','noopener,noreferrer'); if(!w) return; w.document.open(); w.document.write(printableHtml(html)); w.document.close(); w.onload=()=>setTimeout(()=>{w.focus();w.print();},250); }
  function exportWord(){ const d=reportData(), html=printableHtml(buildReport(d)); const blob=new Blob(['\ufeff',html],{type:'application/msword'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='NBCC-2020-Roof-Snow-Report.doc'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000); }

  function enhance(){
    captureInputs(); captureResults();
    const panel=document.querySelector('.reportPanel');
    if(!panel || panel.dataset.excelEnhanced==='1') return;
    const existing=panel.querySelector('.calcReport');
    if(!existing) return;
    panel.dataset.excelEnhanced='1';
    const d=reportData(); existing.outerHTML=buildReport(d);
    const actions=panel.querySelector('.reportActions');
    if(actions){ actions.innerHTML='<button type="button" class="pdfExport">Generate PDF</button><button type="button" class="wordExport">Generate Word</button>'; actions.querySelector('.pdfExport').addEventListener('click',exportPdf); actions.querySelector('.wordExport').addEventListener('click',exportWord); }
  }

  document.addEventListener('input',()=>captureInputs(),true);
  document.addEventListener('change',()=>captureInputs(),true);
  document.addEventListener('click',e=>{ if(e.target.closest('button')) setTimeout(()=>{captureInputs();captureResults();enhance();},120); },true);
  new MutationObserver(()=>{captureInputs();captureResults();enhance();}).observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(enhance,500);
})();