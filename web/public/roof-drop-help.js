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

  async function showCaseImage(pop) {
    const visual = prepareVisual(pop);
    if (!visual) return;
    try {
      const response = await fetch('/nbcc-roof-drop-cases-v3.webp?v=3', { cache: 'no-store' });
      if (!response.ok) throw new Error('case figure asset failed to load');
      const base64 = (await response.text()).trim();
      visual.innerHTML = `<img src="data:image/webp;base64,${base64}" alt="NBCC Figure 4.1.6.5.-B - Snow load Cases I, II and III" style="display:block;width:100%;height:auto;max-height:none;object-fit:contain;background:#fff;border-radius:8px"/>`;
    } catch (error) {
      visual.innerHTML = '';
      console.error(error);
    }
  }

  function enhance() {
    document.querySelectorAll('.help-popover').forEach(pop => {
      const label = pop.getAttribute('aria-label') || '';
      if (pop.dataset.roofDropEnhanced === '3') return;
      if (label === 'Lower-roof source case') {
        pop.dataset.roofDropEnhanced = '3';
        showCaseImage(pop);
      } else if (label === 'Source length, ls' || label === 'Source width, ws') {
        showImage(pop, '/nbcc-ws-ls-table.webp?v=2', 'NBCC Table 4.1.6.5.-B - source dimensions ws and ls by case');
        pop.dataset.roofDropEnhanced = '3';
      }
    });
  }

  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  enhance();
})();