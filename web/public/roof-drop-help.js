(() => {
  function showOnlyImage(pop, src, alt) {
    const visual = pop.querySelector('.help-visual');
    const body = pop.querySelector('.help-body');
    const reference = pop.querySelector('.help-reference');
    const note = pop.querySelector('small');
    if (visual) {
      visual.style.height = 'auto';
      visual.style.minHeight = '0';
      visual.style.padding = '0';
      visual.style.border = '0';
      visual.style.background = '#fff';
      visual.innerHTML = `<img src="${src}" alt="${alt}" style="display:block;width:100%;height:auto;max-height:70vh;object-fit:contain;background:#fff"/>`;
    }
    if (body) body.innerHTML = '';
    if (reference) reference.style.display = 'none';
    if (note) note.style.display = 'none';
  }

  function enhance() {
    document.querySelectorAll('.help-popover').forEach(pop => {
      const label = pop.getAttribute('aria-label') || '';
      if (pop.dataset.roofDropEnhanced === '2') return;
      if (label === 'Lower-roof source case') {
        showOnlyImage(pop, '/nbcc-snow-cases.webp', 'NBCC Figure 4.1.6.5.-B - Snow load Cases I, II and III');
        pop.dataset.roofDropEnhanced = '2';
      }
      if (label === 'Source length, ls' || label === 'Source width, ws') {
        showOnlyImage(pop, '/nbcc-ws-ls-table.webp', 'NBCC Table 4.1.6.5.-B - Parameters for snow load cases');
        pop.dataset.roofDropEnhanced = '2';
      }
    });
  }

  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  enhance();
})();