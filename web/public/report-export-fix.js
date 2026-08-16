(() => {
  const STORE = 'snow-calculator-report-state-v2';
  const te = new TextEncoder();
  const xml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const u16 = n => new Uint8Array([n & 255, (n >>> 8) & 255]);
  const u32 = n => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
  const cat = parts => { const len = parts.reduce((s,p)=>s+p.length,0); const out=new Uint8Array(len); let o=0; for(const p of parts){out.set(p,o);o+=p.length;} return out; };
  const crcTable = (() => { const t=new Uint32Array(256); for(let n=0;n<256;n++){let c=n; for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0;} return t; })();
  const crc32 = bytes => { let c=0xFFFFFFFF; for(const b of bytes) c=crcTable[(c^b)&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
  const n = v => { const x=Number(String(v ?? '').replace(/[^0-9+\-.eE]/g,'')); return Number.isFinite(x) ? x : 0; };

  function zipStore(files){
    const locals=[], centrals=[]; let offset=0;
    for(const [name,dataText] of files){
      const nameB=te.encode(name), data=te.encode(dataText), crc=crc32(data), flags=0x0800;
      const local=cat([u32(0x04034b50),u16(20),u16(flags),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(nameB.length),u16(0),nameB,data]);
      locals.push(local);
      const central=cat([u32(0x02014b50),u16(20),u16(20),u16(flags),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(nameB.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nameB]);
      centrals.push(central); offset += local.length;
    }
    const centralBlock=cat(centrals), localBlock=cat(locals);
    const end=cat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralBlock.length),u32(localBlock.length),u16(0)]);
    return new Blob([localBlock,centralBlock,end],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  }

  const p = (text,bold=false,style='') => `<w:p>${style?`<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`:''}<w:r>${bold?'<w:rPr><w:b/></w:rPr>':''}<w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
  const cell = text => `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${p(text)}</w:tc>`;
  const tableFrom = table => {
    const rows=[...table.querySelectorAll('tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(td=>td.textContent.trim()));
    return `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="808080"/><w:left w:val="single" w:sz="4" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:color="808080"/><w:right w:val="single" w:sz="4" w:color="808080"/><w:insideH w:val="single" w:sz="4" w:color="B0B0B0"/><w:insideV w:val="single" w:sz="4" w:color="B0B0B0"/></w:tblBorders></w:tblPr>${rows.map(r=>`<w:tr>${r.map(cell).join('')}</w:tr>`).join('')}</w:tbl>`;
  };

  function buildDocumentXml(report){
    let body='';
    const title=report.querySelector('h1')?.textContent.trim() || 'NBCC 2020 Roof Snow Calculation';
    body += p('LINKOTECH ENGINEERING',true,'Title') + p(title,true,'Heading1');
    const header=[...report.querySelectorAll('.excelTitle span,.excelTitle b')].map(x=>x.textContent.trim()).filter(Boolean).join(' | ');
    if(header) body += p(header);
    for(const section of report.querySelectorAll('section')){
      const h=section.querySelector('h2'); if(h) body += p(h.textContent.trim(),true,'Heading2');
      const tables=section.querySelectorAll('table');
      if(tables.length){ for(const t of tables) body += tableFrom(t); }
      else { const txt=[...section.childNodes].filter(node=>node.nodeType===3 || (node.nodeType===1 && node.tagName!=='H2')).map(node=>node.textContent?.trim()).filter(Boolean).join(' '); if(txt) body += p(txt); }
    }
    const footer=report.querySelector('.excelFooter')?.textContent.trim(); if(footer) body += p(footer);
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900"/></w:sectPr></w:body></w:document>`;
  }

  function exportDocx(){
    const report=document.querySelector('#excelCalcReport'); if(!report) return;
    const contentTypes=`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
    const rels=`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1F4E78"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="1F4E78"/></w:rPr></w:style></w:styles>`;
    const blob=zipStore([['[Content_Types].xml',contentTypes],['_rels/.rels',rels],['word/document.xml',buildDocumentXml(report)],['word/styles.xml',styles]]);
    const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download='NBCC-2020-Roof-Snow-Report.docx'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);
  }

  function storedInputs(){
    try { return JSON.parse(sessionStorage.getItem(STORE) || '{}').inputs || {}; } catch { return {}; }
  }

  function buildCalculationPayload(){
    const i=storedInputs();
    const modeText=String(i.mode || 'Uniform roof');
    const mode=modeText.includes('Lower') ? 'LOWER_ADJACENT_ROOF' : modeText.includes('Projection') ? 'ROOF_PROJECTION_OR_PARAPET' : 'UNIFORM_ROOF';
    const surface=String(i.surface || '').toLowerCase().includes('slippery') ? 'smooth_slippery' : 'normal';
    const payload={
      mode,
      common:{
        ss:n(i.ss),
        sr_climatic:n(i.sr),
        roof_slope_alpha:n(i.alpha),
        roof_surface_type:surface,
        is:n(i.is),
        cw:n(i.cw),
        cb:n(i.cb),
        adjacent_surface_drift_applicable:mode==='LOWER_ADJACENT_ROOF'
      },
      distribution_points:10
    };
    if(mode==='LOWER_ADJACENT_ROOF'){
      payload.lower_roof_cases=[{
        case_id:String(i.caseId || 'I'),
        source_surface:'Upper roof',
        receiving_surface:'Lower roof',
        drift_direction:'Toward roof step',
        ls:n(i.ls),
        ws:n(i.ws),
        step_height:n(i.h),
        parapet_height:n(i.hp),
        applicability_status:'APPLICABLE',
        interpretation_note:'Report export from current UI calculation inputs'
      }];
    }
    if(mode==='ROOF_PROJECTION_OR_PARAPET'){
      payload.projection={projection_height:n(i.h),projection_longest_dimension:n(i.l0)};
    }
    return payload;
  }

  function downloadBlob(blob, filename){
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=filename; a.style.display='none'; document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},2500);
  }

  async function exportPdf(button){
    const old=button?.textContent;
    if(button){ button.disabled=true; button.textContent='Creating PDF…'; }
    try{
      const base=String(window.__SNOW_API_BASE__ || '').replace(/\/$/,'');
      const response=await fetch(`${base}/api/v1/reports/official`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(buildCalculationPayload())
      });
      if(!response.ok){
        let detail='PDF generation failed.';
        try{ const body=await response.json(); detail=body?.detail?.detail || body?.detail || detail; }catch{}
        throw new Error(typeof detail==='string' ? detail : JSON.stringify(detail));
      }
      downloadBlob(await response.blob(),'NBCC-2020-Roof-Snow-Report.pdf');
    }catch(err){
      console.error(err);
      alert(err instanceof Error ? err.message : 'PDF generation failed.');
    }finally{
      if(button){ button.disabled=false; button.textContent=old || 'Generate PDF'; }
    }
  }

  document.addEventListener('click', e => {
    const pdf=e.target.closest('.pdfExport');
    const word=e.target.closest('.wordExport');
    if(!pdf && !word) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if(pdf) exportPdf(pdf); else exportDocx();
  }, true);
})();