(() => {
  const STORE = 'snow-calculator-report-state-v2';

  function readMode() {
    try {
      const state = JSON.parse(sessionStorage.getItem(STORE) || '{}');
      return String(state?.inputs?.mode || '');
    } catch {
      return '';
    }
  }

  function figureForMode(mode) {
    if (/Lower adjacent roof/i.test(mode)) {
      return {
        src: '/figures/lower-adjacent-roof.svg',
        title: 'Lower adjacent roof / drift geometry',
        reference: 'NBCC Figure 4.1.6.5.-A / approved commentary geometry',
        note: 'Geometry reference used to identify h, hp, source dimensions and drift direction. Do not scale dimensions from the figure.'
      };
    }
    if (/Projection|parapet/i.test(mode)) {
      return {
        src: '/figures/projection-parapet.svg',
        title: 'Roof obstruction / parapet drift geometry',
        reference: 'Workbook Figure G-8 / approved geometry reference',
        note: 'Geometry reference used to identify obstruction or parapet dimensions and the drift region. Do not scale dimensions from the figure.'
      };
    }
    return null;
  }

  function inject() {
    const report = document.querySelector('#excelCalcReport');
    if (!report || report.querySelector('[data-report-figure="1"]')) return;

    const fig = figureForMode(readMode());
    if (!fig) return;

    const section = document.createElement('section');
    section.dataset.reportFigure = '1';
    section.className = 'reportFigureSection';
    section.innerHTML = `
      <h2>Engineering geometry figure</h2>
      <figure class="reportFigure">
        <div class="reportFigureMeta">
          <b>${fig.title}</b>
          <span>${fig.reference}</span>
        </div>
        <img src="${fig.src}" alt="${fig.title}">
        <figcaption>${fig.note}</figcaption>
      </figure>`;

    const calculated = [...report.querySelectorAll('section')].find(s => /Calculated parameters/i.test(s.querySelector('h2')?.textContent || ''));
    if (calculated?.nextSibling) calculated.parentNode.insertBefore(section, calculated.nextSibling);
    else report.appendChild(section);
  }

  function schedule() {
    [0, 100, 300, 700].forEach(delay => setTimeout(inject, delay));
  }

  document.addEventListener('click', () => setTimeout(inject, 120), true);
  window.addEventListener('pageshow', schedule);
  schedule();
})();
