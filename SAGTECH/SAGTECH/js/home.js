/* ==========================================================================
   SAGTECH — Home page controller
   Pulls live aggregates from the services / projects / tickets tables and
   renders the hero counters, live snapshot panel, featured work and
   testimonials. All reads are GET requests against the table API.
   ========================================================================== */

(function () {
  'use strict';

  const { listAll, escapeHtml, badge, stars, fmtDate } = SAG;

  /* ------------------------------------------------------ Hero counters --- */

  async function loadHeroCounters() {
    const [services, projects, tickets] = await Promise.all([
      listAll('services'), listAll('architecture_projects'), listAll('support_tickets')
    ]);
    SAG.byId('hero-services').textContent = services.total || services.data.length;
    SAG.byId('hero-projects').textContent = projects.total || projects.data.length;
    const closed = tickets.data.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
    SAG.byId('hero-tickets').textContent = closed;
  }

  /* --------------------------------------------------- Live snapshot panel --- */

  function metricCard(label, value, icon, color) {
    return '<div class="sag-panel p-4">' +
      '<div class="flex items-center gap-2 mb-2">' +
        '<i class="fa-solid ' + icon + '" style="color:' + color + '"></i>' +
        '<span class="sag-metric-label">' + escapeHtml(label) + '</span>' +
      '</div>' +
      '<p class="sag-metric-value m-0" style="color:' + color + '">' + value + '</p>' +
    '</div>';
  }

  async function loadSnapshot() {
    const [projects, tickets, proposals, inquiries] = await Promise.all([
      listAll('architecture_projects'), listAll('support_tickets'),
      listAll('proposals'), listAll('inquiries')
    ]);

    const activeProjects = projects.data.filter((p) => p.status !== 'Delivered').length;
    const openTickets = tickets.data.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length;
    const proposalsInReview = proposals.data.filter((p) =>
      ['Submitted', 'Under Review', 'Revisions Requested'].includes(p.status)).length;
    const newEnquiries = inquiries.data.filter((i) => i.status === 'New').length;

    SAG.byId('snapshot-metrics').innerHTML =
      metricCard('Active Engagements', activeProjects, 'fa-diagram-project', 'var(--sag-cyan)') +
      metricCard('Open Tickets', openTickets, 'fa-ticket', 'var(--sag-emerald)') +
      metricCard('Proposals in Review', proposalsInReview, 'fa-file-pen', 'var(--sag-violet)') +
      metricCard('New Enquiries', newEnquiries, 'fa-inbox', 'var(--sag-amber)');

    /* Artifact mix across live projects */
    const counts = SAG.countBy(projects.data, (p) => p.artifact_type);
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = rows.length ? rows[0][1] : 1;

    SAG.byId('snapshot-artifacts').innerHTML = rows.length ? rows.map(([name, n]) =>
      '<div class="mb-3">' +
        '<div class="flex justify-between text-xs mb-1">' +
          '<span>' + escapeHtml(name) + '</span><span class="sag-muted">' + n + '</span>' +
        '</div>' +
        '<div class="sag-progress-track"><div class="sag-progress-fill" style="width:' +
          Math.round((n / max) * 100) + '%"></div></div>' +
      '</div>').join('') : '<p class="sag-muted text-sm m-0">No artifacts recorded yet.</p>';
  }

  /* ----------------------------------------------------- Featured work --- */

  async function loadFeaturedProjects() {
    const host = SAG.byId('featured-projects');
    try {
      const { data } = await listAll('architecture_projects');
      const featured = data
        .slice()
        .sort((a, b) => (Number(b.progress) || 0) - (Number(a.progress) || 0))
        .slice(0, 3);

      if (!featured.length) {
        host.innerHTML = SAG.emptyBlock('No engagements yet', 'Architecture projects added to the hub appear here.');
        return;
      }

      host.innerHTML = featured.map((p) => {
        const progress = Math.max(0, Math.min(100, Number(p.progress) || 0));
        return '<article class="sag-card sag-card-hover p-5 flex flex-col">' +
          '<div class="flex items-start justify-between gap-3 mb-3">' +
            '<span class="sag-icon-badge" style="width:40px;height:40px"><i class="fa-solid fa-cubes"></i></span>' +
            badge(p.status) +
          '</div>' +
          '<h3 class="font-bold text-base mb-1">' + escapeHtml(p.project_name) + '</h3>' +
          '<p class="text-xs sag-muted mb-3">' + escapeHtml(p.client || '—') + ' &middot; ' + escapeHtml(p.artifact_type || '—') + '</p>' +
          '<p class="text-sm sag-muted flex-1 mb-4">' + escapeHtml((p.description || '').slice(0, 130)) +
            ((p.description || '').length > 130 ? '…' : '') + '</p>' +
          '<div class="flex justify-between text-xs mb-1"><span class="sag-muted">Progress</span><span>' + progress + '%</span></div>' +
          '<div class="sag-progress-track"><div class="sag-progress-fill" style="width:' + progress + '%"></div></div>' +
          '<p class="text-xs sag-muted mt-3 mb-0"><i class="fa-regular fa-calendar"></i> Due ' + fmtDate(p.due_date) + '</p>' +
        '</article>';
      }).join('');
    } catch (err) {
      host.innerHTML = SAG.errorBlock('Could not load engagements: ' + err.message);
    }
  }

  /* ------------------------------------------------------ Testimonials --- */

  async function loadTestimonials() {
    const host = SAG.byId('testimonial-list');
    try {
      const { data } = await listAll('testimonials');
      if (!data.length) {
        host.innerHTML = SAG.emptyBlock('No testimonials yet');
        return;
      }
      host.innerHTML = data.map((t) =>
        '<figure class="sag-card p-5 m-0 flex flex-col">' +
          '<div class="mb-3" aria-label="Rated ' + (Number(t.rating) || 0) + ' out of 5">' + stars(t.rating) + '</div>' +
          '<blockquote class="m-0 text-sm flex-1" style="color:#dbe5f7">“' + escapeHtml(t.quote) + '”</blockquote>' +
          '<figcaption class="mt-4 pt-3" style="border-top:1px solid var(--sag-line)">' +
            '<strong class="block text-sm">' + escapeHtml(t.client_name) + '</strong>' +
            '<span class="text-xs sag-muted">' + escapeHtml(t.role || '') + (t.organization ? ', ' + escapeHtml(t.organization) : '') + '</span>' +
            '<div class="mt-2">' + badge(t.pillar) + '</div>' +
          '</figcaption>' +
        '</figure>').join('');
    } catch (err) {
      host.innerHTML = SAG.errorBlock('Could not load testimonials: ' + err.message);
    }
  }

  async function boot() {
    try {
      await Promise.all([
        loadHeroCounters(),
        loadSnapshot(),
        loadFeaturedProjects(),
        loadTestimonials()
      ]);
    } catch (err) {
      SAG.toast('Some live data could not be loaded: ' + err.message, 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
