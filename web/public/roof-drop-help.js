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

  function showImage(pop, src, alt, fallbackSrc) {
    const visual = prepareVisual(pop);
    if (!visual) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.style.cssText = 'display:block;width:100%;height:auto;max-height:none;object-fit:contain;background:#fff;border-radius:8px';
    if (fallbackSrc) {
      img.onerror = () => {
        if (img.dataset.fallbackApplied === '1') return;
        img.dataset.fallbackApplied = '1';
        img.src = fallbackSrc;
      };
    }
    visual.innerHTML = '';
    visual.appendChild(img);
  }

  function enhance() {
    document.querySelectorAll('.help-popover').forEach(pop => {
      const label = pop.getAttribute('aria-label') || '';
      if (pop.dataset.roofDropEnhanced === '5') return;
      if (label === 'Lower-roof source case') {
        showImage(
          pop,
          '/nbcc-roof-drop-cases.jpg?v=5',
          'NBCC Figure 4.1.6.5.-B - Snow load Cases I, II and III',
          'https://raw.githubusercontent.com/dehghoon/Snow-Calculator/main/web/public/nbcc-roof-drop-cases.jpg'
        );
        pop.dataset.roofDropEnhanced = '5';
      } else if (label === 'Source length, ls' || label === 'Source width, ws') {
        showImage(pop, '/nbcc-ws-ls-table.webp?v=2', 'NBCC Table 4.1.6.5.-B - source dimensions ws and ls by case');
        pop.dataset.roofDropEnhanced = '5';
      }
    });
  }

  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  enhance();
})();