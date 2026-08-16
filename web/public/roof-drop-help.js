(() => {
  function prepareVisual(pop) {
    const visual = pop.querySelector('.help-visual');
    const body = pop.querySelector('.help-body');
    if (visual) {
      visual.style.height = 'auto';
      visual.style.minHeight = '0';
      visual.style.padding = '0';
      visual.style.border = '0';
      visual.style.background = 'transparent';
      visual.style.display = 'block';
      visual.style.overflow = 'visible';
    }
    if (body) body.innerHTML = '';
    pop.querySelectorAll('.help-reference, small').forEach(el => {
      if (el.parentElement === pop) el.style.display = 'none';
    });
    return visual;
  }

  function showImage(pop, src, alt) {
    const visual = prepareVisual(pop);
    if (visual) visual.innerHTML = `<img src="${src}" alt="${alt}" style="display:block;width:100%;height:auto;max-height:none;object-fit:contain;background:#fff;border-radius:8px"/>`;
  }

  function enhance() {
    document.querySelectorAll('.help-popover').forEach(pop => {
      const label = pop.getAttribute('aria-label') || '';
      if (pop.dataset.roofDropEnhanced === '4') return;
      if (label === 'Lower-roof source case') {
        showImage(pop, '/nbcc-roof-drop-cases.jpg?v=4', 'NBCC Figure 4.1.6.5.-B - Snow load Cases I, II and III');
        pop.dataset.roofDropEnhanced = '4';
      } else if (label === 'Source length, ls' || label === 'Source width, ws') {
        showImage(pop, '/nbcc-ws-ls-table.webp?v=2', 'NBCC Table 4.1.6.5.-B - source dimensions ws and ls by case');
        pop.dataset.roofDropEnhanced = '4';
      }
    });
  }

  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  enhance();
})();