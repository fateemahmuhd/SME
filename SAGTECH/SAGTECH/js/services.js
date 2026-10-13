/* ==========================================================================
   SAGTECH — Service catalogue controller
   Reads the `services` table, renders filterable cards plus the deliverable
   matrix table. Mirrors a PHP page doing:
     SELECT * FROM services WHERE active = 1 ORDER BY pillar, price_from;
   ========================================================================== */

(function () {
  'use strict';

  let ALL_SERVICES = [];

  const PILLAR_ICON = {
    'Enterprise & System Architecture': 'fa-sitemap',
    'Technical Support & Infrastructure': 'fa-network-wired',
    'Business & Academic Proposals': 'fa-file-signature'
  };

  const PILLAR_COLOR = {
    'Enterprise & System Architecture': 'var(--sag-cyan)',
    'Technical Support & Infrastructure': 'var(--sag-emerald)',
    'Business & Academic Proposals': 'var(--sag-violet)'
  };

  function deliverableList(raw) {
    return String(raw || '').split('|').map((s) => s.trim()).filter(Boolean);
  }

  function cardMarkup(svc) {
    const color = PILLAR_COLOR[svc.pillar] || 'var(--sag-cyan)';
    const items = deliverableList(svc.deliverables);
    return '<article class="sag-card sag-card-hover p-5 flex flex-col">' +
      '<div class="flex items-start justify-between gap-3 mb-3">' +
        '<span class="sag-icon-badge" style="color:' + color + ';background:' +
          (color === 'var(--sag-emerald)' ? 'rgba(52,211,153,.14)' :
           color === 'var(--sag-violet)' ? 'rgba(167,139,250,.15)' : 'rgba(34,211,238,.13)') + '">' +
          '<i class="fa-solid ' + SAG.escapeHtml(svc.icon || PILLAR_ICON[svc.pillar] || 'fa-gear') + '"></i>' +
        '</span>' +
        SAG.badge(svc.pillar) +
      '</div>' +
      '<h3 class="text-lg font-bold mb-2">' + SAG.escapeHtml(svc.name) + '</h3>' +
      '<p class="text-sm sag-muted mb-4">' + SAG.escapeHtml(svc.summary) + '</p>' +
      (items.length ? '<ul class="text-xs space-y-1.5 mb-4 list-none p-0 flex-1">' +
        items.slice(0, 5).map((d) => '<li><i class="fa-solid fa-check" style="color:' + color + '"></i> ' +
          SAG.escapeHtml(d) + '</li>').join('') + '</ul>' : '') +
      '<div class="flex items-end justify-between pt-4" style="border-top:1px solid var(--sag-line)">' +
        '<div>' +
          '<p class="sag-metric-label m-0">From</p>' +
          '<p class="text-lg font-bold m-0" style="color:' + color + '">' + SAG.fmtMoney(svc.price_from) + '</p>' +
        '</div>' +
        '<div class="text-right">' +
          '<p class="sag-metric-label m-0">Turnaround</p>' +
          '<p class="text-sm font-semibold m-0">' + (Number(svc.turnaround_days) || 0) + ' days</p>' +
        '</div>' +
      '</div>' +
      '<a class="sag-btn sag-btn-ghost w-full justify-center mt-4" href="contact.html?service=' +
        encodeURIComponent(svc.pillar) + '"><i class="fa-solid fa-paper-plane"></i> Request this service</a>' +
    '</article>';
  }

  function matrixRow(svc) {
    const items = deliverableList(svc.deliverables);
    return '<tr>' +
      '<td><strong>' + SAG.escapeHtml(svc.name) + '</strong></td>' +
      '<td>' + SAG.badge(svc.pillar) + '</td>' +
      '<td>' + (items.length ? items.map(SAG.escapeHtml).join(' &middot; ') : '—') + '</td>' +
      '<td>' + (Number(svc.turnaround_days) || 0) + ' days</td>' +
      '<td>' + SAG.fmtMoney(svc.price_from) + '</td>' +
    '</tr>';
  }

  function render() {
    const term = (SAG.byId('service-search').value || '').toLowerCase().trim();
    const pillar = SAG.byId('pillar-filter').value;

    const filtered = ALL_SERVICES.filter((s) => {
      if (pillar && s.pillar !== pillar) return false;
      if (!term) return true;
      const haystack = [s.name, s.pillar, s.summary, s.deliverables, s.tech_stack]
        .join(' ').toLowerCase();
      return haystack.includes(term);
    });

    const grid = SAG.byId('service-grid');
    grid.innerHTML = filtered.length
      ? filtered.map(cardMarkup).join('')
      : SAG.emptyBlock('No services match that filter', 'Try a different keyword or reset the filters.');

    SAG.byId('service-matrix').innerHTML = filtered.length
      ? filtered.map(matrixRow).join('')
      : '<tr><td colspan="5" class="sag-muted">No matching services.</td></tr>';

    SAG.byId('catalogue-count').textContent =
      'Showing ' + filtered.length + ' of ' + ALL_SERVICES.length + ' service lines' +
      (pillar ? ' in ' + pillar : '') + (term ? ' matching “' + term + '”' : '') + '.';
  }

  async function boot() {
    const grid = SAG.byId('service-grid');
    try {
      const { data } = await SAG.listAll('services');
      ALL_SERVICES = data
        .filter((s) => s.active !== false)
        .sort((a, b) => {
          if (a.pillar === b.pillar) return (Number(a.price_from) || 0) - (Number(b.price_from) || 0);
          return String(a.pillar).localeCompare(String(b.pillar));
        });

      if (!ALL_SERVICES.length) {
        grid.innerHTML = SAG.emptyBlock('No services in the catalogue', 'Add rows to the services table to populate this page.');
        SAG.byId('catalogue-count').textContent = 'No services available.';
        return;
      }

      SAG.byId('service-search').addEventListener('input', render);
      SAG.byId('pillar-filter').addEventListener('change', render);
      SAG.byId('btn-reset-filters').addEventListener('click', () => {
        SAG.byId('service-search').value = '';
        SAG.byId('pillar-filter').value = '';
        render();
      });

      render();
    } catch (err) {
      grid.innerHTML = SAG.errorBlock('Could not load the service catalogue: ' + err.message);
      SAG.byId('catalogue-count').textContent = 'Catalogue unavailable.';
      SAG.byId('service-matrix').innerHTML = '<tr><td colspan="5" class="sag-muted">Unavailable.</td></tr>';
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
