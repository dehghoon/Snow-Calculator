(() => {
  function showImage(pop, src, alt) {
    const visual = pop.querySelector('.help-visual');
    const body = pop.querySelector('.help-body');
    if (visual) {
      visual.style.height = 'auto';
      visual.style.minHeight = '0';
      visual.style.padding = '0';
      visual.style.border = '0';
      visual.style.background = 'transparent';
      visual.innerHTML = `<img src="${src}" alt="${alt}" style="display:block;width:100%;height:auto;max-height:70vh;object-fit:contain;background:#fff;border-radius:8px"/>`;
    }
    if (body) body.innerHTML = '';
    pop.querySelectorAll('.help-reference, small').forEach(el => { if (el.parentElement === pop) el.style.display = 'none'; });
  }
  function enhance() {
    document.querySelectorAll('.help-popover').forEach(pop => {
      const label = pop.getAttribute('aria-label') || '';
      if (pop.dataset.roofDropEnhanced === '1') return;
      if (label === 'Lower-roof source case') {
        showImage(pop, '/roof-drop-case-guide.png', 'NBCC Figure 4.1.6.5.-B - Snow load Cases I, II and III');
        pop.dataset.roofDropEnhanced = '1';
      } else if (label === 'Source length, ls' || label === 'Source width, ws') {
        showImage(pop, '/ws-ls-table.png', 'NBCC Table 4.1.6.5.-B - source dimensions ws and ls by case');
        pop.dataset.roofDropEnhanced = '1';
      }
    });
  }
  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  enhance();
})();