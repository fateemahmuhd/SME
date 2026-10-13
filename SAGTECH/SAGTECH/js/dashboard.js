/* ==========================================================================
   SAGTECH — Delivery Dashboard
   Aggregates the four operational tables into KPI cards, four Chart.js
   visualisations and two attention tables.

   PHP/MySQL equivalent: a reporting page running GROUP BY aggregate queries,
   e.g. SELECT status, COUNT(*) FROM architecture_projects GROUP BY status;
   ========================================================================== */

(function () {
  'use strict';

  const PALETTE = {
    cyan: '#22d3ee', emerald: '#34d399', violet: '#a78bfa', amber: '#fbbf24',
    rose: '#fb7185', blue: '#60a5fa', slate: '#94a3b8'
  };

  const charts = {};

  /* ---------------------------------------------------------------- Utils --- */

  const gridColor = 'rgba(148,190,255,0.12)';
  const tickColor = '#9db0cf';

  function baseOptions(extra = {}) {
    return Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: tickColor, font: { family: 'Inter', size: 11 }, boxWidth: 12 } },
        tooltip: {
          backgroundColor: 'rgba(10,20,40,0.95)',
          borderColor: 'rgba(148,190,255,0.25)',
          borderWidth: 1,
          titleColor: '#e8eefb',
          bodyColor: '#cddbf5',
          padding: 10
        }
      },
      scales: {
        x: { ticks: { color: tickColor, font: { family: 'Inter', size: 11 } }, grid: { color: gridColor } },
        y: { beginAtZero: true, ticks: { color: tickColor, precision: 0, font: { family: 'Inter', size: 11 } }, grid: { color: gridColor } }
      }
    }, extra);
  }

  function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
  }

  /** Sorted [labels, values] from a count map, biggest first. */
  function toPairs(countMap) {
    const entries = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map((e) => e[0]), values: entries.map((e) => e[1]) };
  }

  /* ---------------------------------------------------------------- KPIs --- */

  function renderKpis(projects, tickets, proposals, inquiries) {
    const active = projects.filter((p) => p.status !== 'Delivered' && p.status !== 'On Hold').length;
    const open = tickets.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length;
    const critical = tickets.filter((t) =>
      t.severity === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed').length;
    const newEnq = inquiries.filter((i) => i.status === 'New').length;

    const card = (label, value, icon, color, hint) =>
      '<div class="sag-card p-4">' +
        '<div class="flex items-center gap-2 mb-2">' +
          '<i class="fa-solid ' + icon + '" style="color:' + color + '"></i>' +
          '<span class="sag-metric-label">' + SAG.escapeHtml(label) + '</span>' +
        '</div>' +
        '<p class="sag-metric-value m-0">' + value + '</p>' +
        '<p class="sag-help m-0">' + SAG.escapeHtml(hint) + '</p>' +
      '</div>';

    SAG.byId('dash-kpis').innerHTML =
      card('Active Engagements', active, 'fa-diagram-project', PALETTE.cyan, projects.length + ' logged in total') +
      card('Open Support Tickets', open, 'fa-headset', PALETTE.emerald, critical + ' at critical severity') +
      card('Proposals In Review', proposals.filter((p) => ['Submitted', 'Under Review', 'Revisions Requested'].includes(p.status)).length,
        'fa-file-pen', PALETTE.violet, proposals.length + ' documents on the desk') +
      card('New Enquiries', newEnq, 'fa-inbox', PALETTE.amber, inquiries.length + ' received in total');
  }

  /* -------------------------------------------------------------- Charts --- */

  function renderCharts(projects, tickets, proposals) {
    /* 1. Engagements by status — horizontal bar */
    const ps = toPairs(SAG.countBy(projects, (p) => p.status));
    destroyChart('projStatus');
    charts.projStatus = new Chart(SAG.byId('chart-project-status'), {
      type: 'bar',
      data: {
        labels: ps.labels,
        datasets: [{ label: 'Engagements', data: ps.values, backgroundColor: PALETTE.cyan, borderRadius: 6, maxBarThickness: 34 }]
      },
      options: baseOptions({ indexAxis: 'y', plugins: { legend: { display: false } } })
    });

    /* 2. Tickets by category — doughnut */
    const tc = toPairs(SAG.countBy(tickets, (t) => t.category));
    destroyChart('ticketCat');
    charts.ticketCat = new Chart(SAG.byId('chart-ticket-category'), {
      type: 'doughnut',
      data: {
        labels: tc.labels,
        datasets: [{
          data: tc.values,
          backgroundColor: [PALETTE.emerald, PALETTE.cyan, PALETTE.violet, PALETTE.amber, PALETTE.rose, PALETTE.blue, PALETTE.slate],
          borderColor: 'rgba(6,13,28,0.9)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '58%',
        plugins: {
          legend: { position: 'bottom', labels: { color: tickColor, font: { family: 'Inter', size: 11 }, boxWidth: 12 } },
          tooltip: { backgroundColor: 'rgba(10,20,40,0.95)', titleColor: '#e8eefb', bodyColor: '#cddbf5', padding: 10 }
        }
      }
    });

    /* 3. Proposal pipeline by status — bar */
    const pr = toPairs(SAG.countBy(proposals, (p) => p.status));
    destroyChart('propStatus');
    charts.propStatus = new Chart(SAG.byId('chart-proposal-status'), {
      type: 'bar',
      data: {
        labels: pr.labels,
        datasets: [{
          label: 'Proposals', data: pr.values,
          backgroundColor: [PALETTE.violet, PALETTE.cyan, PALETTE.amber, PALETTE.emerald, PALETTE.rose, PALETTE.slate],
          borderRadius: 6, maxBarThickness: 44
        }]
      },
      options: baseOptions({ plugins: { legend: { display: false } } })
    });

    /* 4. Ticket severity mix — polar area */
    const sevOrder = ['Critical', 'High', 'Medium', 'Low'];
    const sevCounts = SAG.countBy(tickets, (t) => t.severity);
    const sevValues = sevOrder.map((s) => sevCounts[s] || 0);
    destroyChart('sev');
    charts.sev = new Chart(SAG.byId('chart-ticket-severity'), {
      type: 'polarArea',
      data: {
        labels: sevOrder,
        datasets: [{
          data: sevValues,
          backgroundColor: ['rgba(251,113,133,.55)', 'rgba(251,191,36,.55)', 'rgba(34,211,238,.55)', 'rgba(148,163,184,.5)'],
          borderColor: 'rgba(6,13,28,0.9)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: tickColor, font: { family: 'Inter', size: 11 }, boxWidth: 12 } },
          tooltip: { backgroundColor: 'rgba(10,20,40,0.95)', titleColor: '#e8eefb', bodyColor: '#cddbf5', padding: 10 }
        },
        scales: {
          r: {
            beginAtZero: true,
            ticks: { color: tickColor, backdropColor: 'transparent', precision: 0 },
            grid: { color: gridColor },
            angleLines: { color: gridColor }
          }
        }
      }
    });
  }

  /* ------------------------------------------------------------- Tables --- */

  function renderAttention(tickets) {
    const rows = tickets
      .filter((t) => ['Critical', 'High'].includes(t.severity) &&
        t.status !== 'Resolved' && t.status !== 'Closed')
      .sort((a, b) => (a.severity === 'Critical' ? -1 : 1) - (b.severity === 'Critical' ? -1 : 1));

    SAG.byId('attention-tbody').innerHTML = rows.length
      ? rows.map((t) =>
        '<tr>' +
          '<td><strong>' + SAG.escapeHtml(t.ticket_ref) + '</strong></td>' +
          '<td>' + SAG.escapeHtml(t.requester_name) + '</td>' +
          '<td>' + SAG.escapeHtml(t.category) + '</td>' +
          '<td>' + SAG.badge(t.severity) + '</td>' +
          '<td>' + SAG.badge(t.status) + '</td>' +
          '<td>' + SAG.escapeHtml(t.assigned_to || 'Unassigned') + '</td>' +
        '</tr>').join('')
      : '<tr><td colspan="6">' + SAG.emptyBlock('Nothing critical outstanding', 'No high-severity tickets are open right now.') + '</td></tr>';
  }

  function renderEnquiries(inquiries) {
    const rows = inquiries
      .slice()
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 6);

    SAG.byId('enquiry-tbody').innerHTML = rows.length
      ? rows.map((i) =>
        '<tr>' +
          '<td><strong>' + SAG.escapeHtml(i.name) + '</strong>' +
            '<div class="text-xs sag-muted">' + SAG.escapeHtml(i.email || '') + '</div></td>' +
          '<td>' + SAG.escapeHtml(i.company || '—') + '</td>' +
          '<td>' + SAG.badge(i.service_interest) + '</td>' +
          '<td>' + SAG.badge(i.status) + '</td>' +
          '<td class="whitespace-nowrap">' + SAG.fmtDate(i.created_at) + '</td>' +
        '</tr>').join('')
      : '<tr><td colspan="5">' + SAG.emptyBlock('No enquiries recorded yet') + '</td></tr>';
  }

  /* --------------------------------------------------------------- Load --- */

  async function load() {
    const [projects, tickets, proposals, inquiries] = await Promise.all([
      SAG.listAll('architecture_projects'),
      SAG.listAll('support_tickets'),
      SAG.listAll('proposals'),
      SAG.listAll('inquiries')
    ]);

    const P = projects.data, T = tickets.data, R = proposals.data, I = inquiries.data;

    renderKpis(P, T, R, I);
    renderCharts(P, T, R);
    renderAttention(T);
    renderEnquiries(I);
  }

  async function boot() {
    SAG.byId('btn-refresh').addEventListener('click', async () => {
      SAG.toast('Refreshing dashboard data…', 'info', 1800);
      try { await load(); SAG.toast('Dashboard refreshed.', 'success'); }
      catch (err) { SAG.toast('Refresh failed: ' + err.message, 'error'); }
    });

    try {
      await load();
    } catch (err) {
      SAG.byId('dash-kpis').innerHTML = SAG.errorBlock('Dashboard data unavailable: ' + err.message);
      SAG.byId('attention-tbody').innerHTML = '<tr><td colspan="6" class="sag-muted">Unavailable.</td></tr>';
      SAG.byId('enquiry-tbody').innerHTML = '<tr><td colspan="5" class="sag-muted">Unavailable.</td></tr>';
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
