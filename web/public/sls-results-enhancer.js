(() => {
  const STORE = 'snow-calculator-sls-response-v1';
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

  function addOrUpdateCard(cards, key, label, value) {
    let card = cards.querySelector(`[data-sls-card="${key}"]`);
    if (!card) {
      card = document.createElement('article');
      card.dataset.slsCard = key;
      card.innerHTML = '<span></span><b></b>';
      cards.insertBefore(card, cards.firstChild);
    }
    setText(card.querySelector('span'), label);
    setText(card.querySelector('b'), value);
  }

  function enhanceResults(data) {
    const panel = document.querySelector('.panel.results');
    if (!panel || !data) return false;
    const cards = panel.querySelector('.cards');
    const final = data.final_results || {};
    const slsPeak = final.sls_peak_snow_load_kpa;
    const ulsPeak = final.peak_snow_load_kpa ?? final.governing_snow_load_kpa;
    if (cards) {
      if (ulsPeak != null) addOrUpdateCard(cards, 'uls', 'ULS peak / governing snow load', `${fmt(ulsPeak)} kPa`);
      if (slsPeak != null) addOrUpdateCard(cards, 'sls', 'SLS peak / governing snow load', `${fmt(slsPeak)} kPa`);
      if (final.uls_importance_factor != null) addOrUpdateCard(cards, 'is-uls', 'Importance factor, Is (ULS)', fmt(final.uls_importance_factor, 2));
      if (final.sls_importance_factor != null) addOrUpdateCard(cards, 'is-sls', 'Importance factor, Is (SLS)', fmt(final.sls_importance_factor, 2));
    }

    const table = panel.querySelector('.table');
    const sls = data.report_data?.sls_load_distribution || [];
    const uls = data.distribution_segments || [];
    if (table && uls.length && sls.length && table.dataset.slsEnhanced !== '1') {
      table.innerHTML = '<div class="row head"><span>x (m)</span><span>Ca</span><span>ULS S (kPa)</span><span>SLS S (kPa)</span></div>' +
        uls.map((p, i) => {
          const s = sls[i] || {};
          return `<div class="row"><span>${fmt(p.x_m, 2)}</span><span>${fmt(p.ca)}</span><span>${fmt(p.snow_load_kpa)}</span><span>${fmt(s.snow_load_kpa)}</span></div>`;
        }).join('');
      table.dataset.slsEnhanced = '1';
    }
    return true;
  }

  function enhanceReport(data) {
    const report = document.querySelector('#excelCalcReport');
    if (!report) return false;

    [...report.querySelectorAll('section')].forEach(section => {
      const h2 = section.querySelector('h2');
      if (!h2 || !/NBCC references/i.test(h2.textContent || '')) return;
      const table = section.querySelector('table');
      if (!table || table.dataset.publicRefs === '1') return;
      const head = table.querySelector('thead tr');
      if (head) {
        const ths = head.querySelectorAll('th');
        if (ths.length >= 2 && /formula id/i.test(ths[0].textContent || '')) ths[0].remove();
        if (head.querySelector('th')) setText(head.querySelector('th'), 'NBCC 2020 Reference');
      }
      table.querySelectorAll('tbody tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 2) tds[0].remove();
      });
      table.dataset.publicRefs = '1';
    });

    if (!data) return true;
    const final = data.final_results || {};
    const sls = data.report_data?.sls_load_distribution || [];
    const uls = data.distribution_segments || [];

    const resultSection = [...report.querySelectorAll('section')].find(s => /Snow-load results/i.test(s.querySelector('h2')?.textContent || ''));
    const resultBody = resultSection?.querySelector('tbody');
    if (resultBody && !resultBody.querySelector('[data-limit-state="SLS"]') && final.sls_peak_snow_load_kpa != null) {
      const tr = document.createElement('tr');
      tr.dataset.limitState = 'SLS';
      tr.innerHTML = `<td>SLS governing snow load</td><td class="val">${fmt(final.sls_peak_snow_load_kpa)}</td><td>kPa</td><td>NBCC 2020; Is(SLS) = ${fmt(final.sls_importance_factor ?? 0.9, 2)}</td>`;
      resultBody.appendChild(tr);
    }

    const distSection = [...report.querySelectorAll('section')].find(s => /^Load distribution$/i.test((s.querySelector('h2')?.textContent || '').trim()));
    const distTable = distSection?.querySelector('table');
    if (distTable && uls.length && sls.length && distTable.dataset.slsEnhanced !== '1') {
      const headRows = distTable.querySelectorAll('thead tr');
      if (headRows[0]) headRows[0].innerHTML = '<th>x</th><th>Ca</th><th>ULS S</th><th>SLS S</th>';
      if (headRows[1]) headRows[1].innerHTML = '<th>m</th><th></th><th>kPa</th><th>kPa</th>';
      const tbody = distTable.querySelector('tbody');
      if (tbody) tbody.innerHTML = uls.map((p, i) => `<tr><td>${fmt(p.x_m,2)}</td><td>${fmt(p.ca)}</td><td>${fmt(p.snow_load_kpa)}</td><td>${fmt(sls[i]?.snow_load_kpa)}</td></tr>`).join('');
      distTable.dataset.slsEnhanced = '1';
    }
    return true;
  }

  function enhance() {
    const data = readData();
    const resultsDone = enhanceResults(data);
    const reportDone = enhanceReport(data);
    return resultsDone || reportDone;
  }

  function scheduleEnhance() {
    [0, 80, 250, 600].forEach(delay => setTimeout(enhance, delay));
  }

  document.addEventListener('click', () => setTimeout(enhance, 120), true);
  window.addEventListener('pageshow', scheduleEnhance);
  scheduleEnhance();
})();
