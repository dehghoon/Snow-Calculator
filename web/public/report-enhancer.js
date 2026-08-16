(() => {
  const STORE = 'snow-calculator-report-state-v2';
  const SLS_STORE = 'snow-calculator-sls-response-v1';
  const DISCLAIMER = 'Results from this tool must be independently verified by a qualified professional engineer. The engineer is responsible for verifying all inputs, assumptions, calculations, NBCC references, and project-specific requirements before design or construction use.';
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const num = v => { const n = Number(String(v ?? '').replace(/[^0-9+\-.eE]/g,'')); return Number.isFinite(n) ? n : null; };
  const fmt = (v, d=3) => Number.isFinite(Number(v)) ? Number(v).toFixed(d) : '—';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  const refs = {
    Ss: 'NBCC 2020, Appendix C, Table C-2',
    Sr: 'NBCC 2020, Appendix C, Table C-2',
    Is: 'NBCC 2020, Table 4.1.6.2.-A',
    Cw: 'NBCC 2020, Sentences 4.1.6.2.(3)–(4)',
    Cb: 'NBCC 2020, Sentence 4.1.6.2.(2)',
    Cs: 'NBCC 2020, Sentences 4.1.6.2.(5)–(7)',
    Ca: 'NBCC 2020, Sentence 4.1.6.2.(8) and applicable Articles 4.1.6.5–4.1.6.12',
    S: 'NBCC 2020, Sentence 4.1.6.2.(1)',
    Smax: 'NBCC 2020, Sentence 4.1.6.2.(1) with applicable accumulation provisions',
    lc: 'NBCC 2020, Sentence 4.1.6.2.(2)',
    '70/Cw²': 'NBCC 2020, Sentence 4.1.6.2.(2)',
    h: 'NBCC 2020, Figure 4.1.6.5.-A / applicable drift geometry',
    hp: 'NBCC 2020, Figure 4.1.6.5.-A / applicable drift geometry',
    ls: 'NBCC 2020 Commentary G drift geometry',
    ws: 'NBCC 2020 Commentary G drift geometry',
    xd: 'NBCC 2020 applicable drift provision'
  };

  function readStored(){ try { return JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch { return {}; } }
  function readSls(){ try { return JSON.parse(sessionStorage.getItem(SLS_STORE) || 'null'); } catch { return null; } }
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
    saveStored({inputs:{
      mode: readField('Roof configuration'), ss: readField('Ground snow load, Ss'), sr: readField('Associated rain load, Sr'),
      alpha: readField('Roof slope, α'), surface: readField('Roof surface'), is: readField('Importance factor, Is'), cw: readField('Wind exposure factor, Cw'),
      l: readField('Larger plan dimension, l'), w: readField('Smaller plan dimension, w'), lc: readField('Characteristic length, lc'), cb: readField('Calculated basic roof factor, Cb'),
      caseId: readField('Case'), ls: readField('Source length, ls'), ws: readField('Source width, ws'), h: readField('Roof step height, h') || readField('Projection height, h'),
      hp: readField('Parapet height, hp'), l0: readField('Longest dimension, l0'), province: readField('Province / territory'), location: readField('Location')
    }});
  }

  function captureResults(){
    const results = document.querySelector('.panel.results'); if(!results) return;
    const cards = {};
    [...results.querySelectorAll('.cards article')].forEach(a => { const k=norm(a.querySelector('span')?.textContent), v=norm(a.querySelector('b')?.textContent); if(k) cards[k]=v; });
    saveStored({results:{cards}});
  }

  function row(variable, value, unit, desc, ref){ return [variable,value,unit,desc,ref || refs[variable] || '']; }

  function reportData(){
    captureInputs(); captureResults();
    const st=readStored(), i=st.inputs||{}, r=st.results||{}, calc=readSls();
    const ss=num(i.ss), sr=num(i.sr), Is=num(i.is), cw=num(i.cw), cb=num(i.cb), lc=num(i.lc), alpha=num(i.alpha);
    const gamma=num(r.cards?.['Snow density, γ']);
    const cs=num(r.cards?.['Calculated slope factor, Cs']);
    const threshold=num(r.cards?.['70 / Cw²']);
    const mode=i.mode||'Uniform roof';
    const isUniform=mode.includes('Uniform');
    const title=mode.includes('Lower') ? 'G-5 Snow distribution and snow loading factors for lower levels of adjacent roofs' : mode.includes('Projection') ? 'G-8 Snow distribution and snow loading factors for areas adjacent to roof obstructions' : 'Uniform snow load';
    const inputRows=[
      row('Ss',ss,'kPa','ground snow load'), row('Sr',sr,'kPa','associated rain load'),
      ...(mode.includes('Lower') ? [row('h',num(i.h),'m','height difference'),row('hp',num(i.hp),'m','parapet height'),row('ls',num(i.ls),'m','source length'),row('ws',num(i.ws),'m','source width')] : []),
      ...(mode.includes('Projection') ? [row('h',num(i.h),'m','obstruction height'),row('l₀',num(i.l0),'m','obstruction longest dimension','NBCC 2020 applicable obstruction geometry provision')] : []),
      row('w',num(i.w),'m','short edge length','NBCC 2020, Sentence 4.1.6.2.(2)'), row('l',num(i.l),'m','long edge length','NBCC 2020, Sentence 4.1.6.2.(2)'),
      row('α',alpha,'deg','roof angle','NBCC 2020, Sentences 4.1.6.2.(5)–(7)'), row('γ',gamma,'kN/m³','snow specific weight','NBCC 2020, Article 4.1.6.13'),
      row('Cw',cw,'','wind exposure factor'), row('Is',Is,'','importance factor'), row('roof surface',i.surface||'','','surface condition','NBCC 2020, Sentences 4.1.6.2.(5)–(7)')
    ];
    const derivedRows=[
      row('lc',lc,'m','lc = 2w − w²/l'), row('70/Cw²',threshold,'m','Cb threshold'),
      row('Cb',cb,'',lc!=null&&threshold!=null&&lc<=threshold?'Cb = 0.80 when lc ≤ 70/Cw²':'Cb = (1/Cw)[1 − (1 − 0.8Cw)e^−((lcCw²−70)/100)]'),
      row('Cs',cs,'','slope factor calculated from α and roof surface')
    ];
    if(isUniform) derivedRows.push(row('Ca',1,'','uniform accumulation factor'));
    const final=calc?.final_results||{};
    const ulsPeak=final.peak_snow_load_kpa ?? final.governing_snow_load_kpa ?? num(r.cards?.['ULS peak / governing snow load']) ?? num(r.cards?.['Peak / governing snow load']);
    const slsPeak=final.sls_peak_snow_load_kpa;
    const resultRows=[row(isUniform?'S (ULS)':'Smax (ULS)',ulsPeak,'kPa','Is(ULS) × (Ss × Cb × Cw × Cs × Ca + Sr)',refs.S)];
    if(slsPeak!=null) resultRows.push(row(isUniform?'S (SLS)':'Smax (SLS)',slsPeak,'kPa','Is(SLS)=0.90 × (Ss × Cb × Cw × Cs × Ca + Sr)','NBCC 2020, Table 4.1.6.2.-A and Sentence 4.1.6.2.(1)'));
    const uls=calc?.distribution_segments||[], sls=calc?.report_data?.sls_load_distribution||[];
    return {mode,title,inputRows,derivedRows,resultRows,uls,sls,isUniform,province:i.province,location:i.location};
  }

  const tr = row => `<tr><td>${esc(row[0])}</td><td class="val">${typeof row[1]==='number'?fmt(row[1]):esc(row[1]??'—')}</td><td>${esc(row[2]??'')}</td><td>${esc(row[3]??'')}</td><td>${esc(row[4]??'')}</td></tr>`;

  function distributionTable(d){
    if(!d.uls.length) return '<p class="reportNote">No load-distribution points are available for this calculation.</p>';
    if(d.isUniform){
      const p=d.uls[0]||{}, s=d.sls[0]||{};
      return `<table class="excelTable distribution"><thead><tr><th>Ca</th><th>ULS S (kPa)</th><th>SLS S (kPa)</th></tr></thead><tbody><tr><td>${fmt(p.ca)}</td><td>${fmt(p.snow_load_kpa)}</td><td>${fmt(s.snow_load_kpa)}</td></tr></tbody></table>`;
    }
    return `<table class="excelTable distribution"><thead><tr><th>x (m)</th><th>Ca</th><th>ULS S (kPa)</th><th>SLS S (kPa)</th></tr></thead><tbody>${d.uls.map((p,i)=>`<tr><td>${fmt(p.x_m,2)}</td><td>${fmt(p.ca)}</td><td>${fmt(p.snow_load_kpa)}</td><td>${fmt(d.sls[i]?.snow_load_kpa)}</td></tr>`).join('')}</tbody></table>`;
  }

  function buildReport(d){
    const importance='<table class="excelTable importance"><thead><tr><th>Importance</th><th>ULS Is</th><th>SLS Is</th></tr></thead><tbody><tr><td>Low</td><td>0.80</td><td>0.90</td></tr><tr><td>Normal</td><td>1.00</td><td>0.90</td></tr><tr><td>High</td><td>1.15</td><td>0.90</td></tr><tr><td>Post-disaster</td><td>1.25</td><td>0.90</td></tr></tbody></table>';
    const disclaimer=`<section class="engineering-disclaimer report-disclaimer"><b>Engineering responsibility</b><span>${esc(DISCLAIMER)}</span></section>`;
    const tableHead='<thead><tr><th>var</th><th>val</th><th>unit</th><th>formula / basis</th><th>NBCC 2020 reference</th></tr></thead>';
    return `<article class="excelCalcReport" id="excelCalcReport"><header class="excelTitle"><div><b>LINKOTECH ENGINEERING</b><span>NBCC 2020 Roof Snow Calculation</span></div><div><span>${esc(d.province||'')}${d.location?' / '+esc(d.location):''}</span><b>${esc(d.mode)}</b></div></header><h1>${esc(d.title)}</h1><section class="excelTwoCol"><div><h2>Input parameters</h2><table class="excelTable">${tableHead}<tbody>${d.inputRows.map(tr).join('')}</tbody></table></div><div><h2>Importance factor</h2>${importance}</div></section><section><h2>Calculated parameters</h2><table class="excelTable">${tableHead}<tbody>${d.derivedRows.map(tr).join('')}</tbody></table></section><section><h2>Snow-load results</h2><table class="excelTable resultTable">${tableHead}<tbody>${d.resultRows.map(tr).join('')}</tbody></table></section><section><h2>Load distribution</h2>${distributionTable(d)}</section>${disclaimer}<footer class="excelFooter">Calculation values are generated from the current application inputs and NBCC 2020 calculation engine. This tool is not a substitute for professional judgment.</footer></article>`;
  }

  function printableHtml(reportHtml){
    const css=[...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>`<link rel="stylesheet" href="${l.href}">`).join('')+'<link rel="stylesheet" href="'+location.origin+'/report-enhancer.css">';
    return `<!doctype html><html><head><meta charset="utf-8"><title>NBCC 2020 Roof Snow Report</title>${css}</head><body class="standaloneReport">${reportHtml}</body></html>`;
  }
  function exportPdf(){ const d=reportData(),html=buildReport(d),w=window.open('','_blank','noopener,noreferrer');if(!w)return;w.document.open();w.document.write(printableHtml(html));w.document.close();w.onload=()=>setTimeout(()=>{w.focus();w.print();},250); }
  function exportWord(){ const d=reportData(),html=printableHtml(buildReport(d));const blob=new Blob(['\ufeff',html],{type:'application/msword'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='NBCC-2020-Roof-Snow-Report.doc';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000); }

  function enhance(){
    captureInputs(); captureResults();
    document.querySelectorAll('.reportPanel').forEach(panel=>{
      if(panel.dataset.excelEnhanced==='1')return;
      const existing=panel.querySelector('.calcReport');if(!existing)return;
      panel.dataset.excelEnhanced='1';
      existing.outerHTML=buildReport(reportData());
      const actions=panel.querySelector('.reportActions');
      if(actions){actions.innerHTML='<button type="button" class="pdfExport">Generate PDF</button><button type="button" class="wordExport">Generate Word</button>';}
    });
  }

  document.addEventListener('input',captureInputs,true);
  document.addEventListener('change',captureInputs,true);
  document.addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(()=>{captureInputs();captureResults();enhance();},120);},true);
  setTimeout(enhance,500);
})();
