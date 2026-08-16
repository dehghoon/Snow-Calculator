(() => {
  const mappingTable = `<table class="help-table help-table-wide roof-drop-map"><thead><tr><th>Case</th><th>l<sub>s</sub></th><th>w<sub>s</sub></th><th>β</th></tr></thead><tbody><tr><td>I</td><td>l<sub>1</sub></td><td>w<sub>1</sub></td><td>1.0</td></tr><tr><td>II</td><td>l<sub>2</sub></td><td>w<sub>2</sub></td><td>0.67</td></tr><tr><td>III</td><td>l<sub>2</sub></td><td>w<sub>2</sub></td><td>0.67</td></tr></tbody></table>`;
  const guide = alt => `<img src="/roof-drop-case-guide.svg" alt="${alt}" style="display:block;width:100%;height:auto;max-height:360px;object-fit:contain;background:#fff"/>`;
  function setVisual(pop, alt) { const visual=pop.querySelector('.help-visual'); if(visual){ visual.style.height='auto'; visual.style.minHeight='220px'; visual.style.padding='6px'; visual.innerHTML=guide(alt); } }
  function enhance() {
    document.querySelectorAll('.help-popover').forEach(pop => {
      const label=pop.getAttribute('aria-label')||''; if(pop.dataset.roofDropEnhanced==='1') return;
      const body=pop.querySelector('.help-body');
      if(label==='Lower-roof source case') { setVisual(pop,'Roof drop Cases I, II and III geometry guide'); if(body) body.innerHTML='<p>Select Case I, II or III by matching the project geometry and snow-drift source direction to the NBCC guide shown above.</p><p class="help-note">The lₛ / wₛ mapping table is shown only in the separate lₛ and wₛ field help.</p>'; pop.dataset.roofDropEnhanced='1'; }
      if(label==='Source length, ls') { setVisual(pop,'NBCC source length ls mapping by roof-drop case'); if(body) body.innerHTML='<p><b>l<sub>s</sub></b> is the source-area length used for the selected roof-drop case.</p>'+mappingTable+'<p class="help-note">Case I: lₛ = l₁. Cases II and III: lₛ = l₂. Enter the verified project dimension.</p>'; pop.dataset.roofDropEnhanced='1'; }
      if(label==='Source width, ws') { setVisual(pop,'NBCC source width ws mapping by roof-drop case'); if(body) body.innerHTML='<p><b>w<sub>s</sub></b> is the source-area width used for the selected roof-drop case.</p>'+mappingTable+'<p class="help-note">Case I: wₛ = w₁. Cases II and III: wₛ = w₂. Enter the verified project dimension.</p>'; pop.dataset.roofDropEnhanced='1'; }
    });
  }
  new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true}); enhance();
})();