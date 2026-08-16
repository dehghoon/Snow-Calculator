(() => {
  const STORE = 'snow-calculator-sls-response-v1';
  const DISCLAIMER = 'Disclaimer: Results from this tool must be independently verified by a qualified professional engineer. The engineer is responsible for verifying all inputs, assumptions, calculations, code references, and project-specific requirements before design or construction use.';
  const fmt = (v, d = 3) => Number.isFinite(Number(v)) ? Number(v).toFixed(d) : '—';

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (String(url).includes('/api/v1/calculations/roof-snow') && response.ok) {
        const data = await response.clone().json();
        sessionStorage.setItem(STORE, JSON.stringify(data));
        scheduleEnhance();
      }
    } catch {}
    return response;
  };

  function readData() {
    try { return JSON.parse(sessionStorage.getItem(STORE) || 'null'); } catch { return null; }
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function isUniform(data) {
    const mode = data?.interpreted_geometry?.mode || data?.inputs?.mode || '';
    return String(mode).includes('UNIFORM');
  }

  function ensureCardAfter(anchor, key, label, value) {
    const cards = anchor?.parentElement;
    if (!cards) return;
    let card = cards.querySelector(`[data-sls-card="${key}"]`);
    if (!card) {
      card = document.createElement('article');
      card.dataset.slsCard = key;
      card.innerHTML = '<span></span><b></b>';
      anchor.insertAdjacentElement('afterend', card);
    }
    setText(card.querySelector('span'), label);
    setText(card.querySelector('b'), value);
  }

  function ensureDisclaimer(panel) {
    let box = panel.querySelector('.engineering-disclaimer');
    if (!box) {
      box = document.createElement('div');
      box.className = 'engineering-disclaimer';
      box.innerHTML = `<b>Engineering responsibility</b><span>${DISCLAIMER}</span>`;
      panel.appendChild(box);
    }
  }

  function enhanceResultsPanel(panel, data) {
    if (!panel || !data) return;
    const final = data.final_results || {};
    const cards = panel.querySelector('.cards');
    const ulsPeak = final.peak_snow_load_kpa ?? final.governing_snow_load_kpa;
    const slsPeak = final.sls_peak_snow_load_kpa;

    if (cards) {
      const existingPeak = [...cards.querySelectorAll('article')].find(a => /Peak \/ governing snow load|ULS peak \/ governing snow load/i.test(a.querySelector('span')?.textContent || ''));
      if (existingPeak) {
        setText(existingPeak.querySelector('span'), 'ULS peak / governing snow load');
        if (ulsPeak != null) setText(existingPeak.querySelector('b'), `${fmt(ulsPeak)} kPa`);
        if (slsPeak != null) ensureCardAfter(existingPeak, 'sls', 'SLS peak / governing snow load', `${fmt(slsPeak)} kPa`);
      }
    }

    const table = panel.querySelector('.table');
    const uls = data.distribution_segments || [];
    const sls = data.report_data?.sls_load_distribution || [];
    if (table && uls.length && sls.length) {
      if (isUniform(data)) {
        const p = uls[0] || {};
        const s = sls[0] || {};
        table.classList.add('uniform-load-table');
        table.classList.remove('drift-load-table');
        table.innerHTML = '<div class="row head"><span>Ca</span><span>ULS S (kPa)</span><span>SLS S (kPa)</span></div>' +
          `<div class="row"><span>${fmt(p.ca)}</span><span>${fmt(p.snow_load_kpa)}</span><span>${fmt(s.snow_load_kpa)}</span></div>`;
      } else {
        table.classList.add('drift-load-table');
        table.classList.remove('uniform-load-table');
        table.innerHTML = '<div class="row head"><span>x (m)</span><span>Ca</span><span>ULS S (kPa)</span><span>SLS S (kPa)</span></div>' +
          uls.map((p, i) => `<div class="row"><span>${fmt(p.x_m, 2)}</span><span>${fmt(p.ca)}</span><span>${fmt(p.snow_load_kpa)}</span><span>${fmt(sls[i]?.snow_load_kpa)}</span></div>`).join('');
      }
    }
    ensureDisclaimer(panel);
  }

  function enhanceReport(data) {
    const report = document.querySelector('#excelCalcReport');
    if (!report || !data) return;
    const final = data.final_results || {};
    const sls = data.report_data?.sls_load_distribution || [];
    const uls = data.distribution_segments || [];

    const resultSection = [...report.querySelectorAll('section')].find(s => /Snow-load results/i.test(s.querySelector('h2')?.textContent || ''));
    const resultBody = resultSection?.querySelector('tbody');
    if (resultBody && !resultBody.querySelector('[data-limit-state="SLS"]') && final.sls_peak_snow_load_kpa != null) {
      const tr = document.createElement('tr');
      tr.dataset.limitState = 'SLS';
      tr.innerHTML = `<td>SLS governing snow load</td><td class="val">${fmt(final.sls_peak_snow_load_kpa)}</td><td>kPa</td><td>Is(SLS) = ${fmt(final.sls_importance_factor ?? 0.9, 2)}</td><td>NBCC 2020, Table 4.1.6.2.-A and Sentence 4.1.6.2.(1)</td>`;
      resultBody.appendChild(tr);
    }

    const distSection = [...report.querySelectorAll('section')].find(s => /^Load distribution$/i.test((s.querySelector('h2')?.textContent || '').trim()));
    const distTable = distSection?.querySelector('table');
    if (distTable && uls.length && sls.length) {
      if (isUniform(data)) {
        const p = uls[0] || {}, s = sls[0] || {};
        distTable.innerHTML = `<thead><tr><th>Ca</th><th>ULS S (kPa)</th><th>SLS S (kPa)</th></tr></thead><tbody><tr><td>${fmt(p.ca)}</td><td>${fmt(p.snow_load_kpa)}</td><td>${fmt(s.snow_load_kpa)}</td></tr></tbody>`;
      } else {
        distTable.innerHTML = '<thead><tr><th>x (m)</th><th>Ca</th><th>ULS S (kPa)</th><th>SLS S (kPa)</th></tr></thead><tbody>' +
          uls.map((p, i) => `<tr><td>${fmt(p.x_m,2)}</td><td>${fmt(p.ca)}</td><td>${fmt(p.snow_load_kpa)}</td><td>${fmt(sls[i]?.snow_load_kpa)}</td></tr>`).join('') + '</tbody>';
      }
    }
  }

  function enhance() {
    const data = readData();
    if (!data) return;
    document.querySelectorAll('.panel.results').forEach(panel => enhanceResultsPanel(panel, data));
    enhanceReport(data);
  }

  function scheduleEnhance() {
    [0, 80, 250, 600].forEach(delay => setTimeout(enhance, delay));
  }

  document.addEventListener('click', () => setTimeout(enhance, 120), true);
  window.addEventListener('pageshow', scheduleEnhance);
  scheduleEnhance();
})();
