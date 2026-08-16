(() => {
  const mappingTable = `
    <table class="help-table help-table-wide roof-drop-map">
      <thead><tr><th>Case</th><th>l<sub>s</sub></th><th>w<sub>s</sub></th><th>β</th></tr></thead>
      <tbody>
        <tr><td>I</td><td>l<sub>1</sub></td><td>w<sub>1</sub></td><td>1.0</td></tr>
        <tr><td>II</td><td>l<sub>2</sub></td><td>w<sub>2</sub></td><td>0.67</td></tr>
        <tr><td>III</td><td>l<sub>2</sub></td><td>w<sub>2</sub></td><td>0.67</td></tr>
      </tbody>
    </table>`;

  function enhance() {
    document.querySelectorAll('.help-popover').forEach(pop => {
      const label = pop.getAttribute('aria-label') || '';
      if (pop.dataset.roofDropEnhanced === '1') return;
      if (label === 'Lower-roof source case') {
        const visual = pop.querySelector('.help-visual');
        const body = pop.querySelector('.help-body');
        if (visual) visual.innerHTML = '<img class="roof-drop-guide" src="/roof-drop-case-guide.svg" alt="Roof drop Cases I, II and III geometry guide" />';
        if (body) body.innerHTML = '<p>Select Case I, II or III by matching the project geometry and snow-drift source direction to the NBCC guide shown above.</p><p class="help-note">The lₛ / wₛ mapping table is intentionally shown in the separate lₛ and wₛ field help.</p>';
        pop.dataset.roofDropEnhanced = '1';
      }
      if (label === 'Source length, ls') {
        const visual = pop.querySelector('.help-visual');
        const body = pop.querySelector('.help-body');
        if (visual) visual.innerHTML = '<img class="roof-drop-guide" src="/roof-drop-case-guide.svg" alt="NBCC source length ls mapping by roof-drop case" />';
        if (body) body.innerHTML = '<p><b>l<sub>s</sub></b> is the source-area length used for the selected roof-drop case.</p>' + mappingTable + '<p class="help-note">Case I: lₛ = l₁. Cases II and III: lₛ = l₂. Enter the verified project dimension.</p>';
        pop.dataset.roofDropEnhanced = '1';
      }
      if (label === 'Source width, ws') {
        const visual = pop.querySelector('.help-visual');
        const body = pop.querySelector('.help-body');
        if (visual) visual.innerHTML = '<img class="roof-drop-guide" src="/roof-drop-case-guide.svg" alt="NBCC source width ws mapping by roof-drop case" />';
        if (body) body.innerHTML = '<p><b>w<sub>s</sub></b> is the source-area width used for the selected roof-drop case.</p>' + mappingTable + '<p class="help-note">Case I: wₛ = w₁. Cases II and III: wₛ = w₂. Enter the verified project dimension.</p>';
        pop.dataset.roofDropEnhanced = '1';
      }
    });
  }
  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhance();
})();