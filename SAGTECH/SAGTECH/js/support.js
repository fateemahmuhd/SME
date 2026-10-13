/* ==========================================================================
   SAGTECH — Technical Support & Infrastructure module
   Ticket intake (INSERT), reference lookup (SELECT), queue listing with
   status filtering, and triage updates (UPDATE).

   PHP/MySQL equivalents:
     intake   -> INSERT INTO support_tickets (ticket_ref, ...) VALUES (...)
     lookup   -> SELECT * FROM support_tickets WHERE ticket_ref = ?
     update   -> UPDATE support_tickets SET status = ?, ... WHERE id = ?
   ========================================================================== */

(function () {
  'use strict';

  const TABLE = 'support_tickets';

  const CATEGORIES = ['Software Troubleshooting', 'Hardware Setup', 'Network Configuration',
    'Cloud Deployment', 'Cybersecurity', 'Database / Backend', 'Other'];
  const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
  const ENVIRONMENTS = ['On-Premise', 'Cloud', 'Hybrid', 'Remote / Field'];
  const STATUSES = ['Open', 'In Progress', 'Awaiting Client', 'Resolved', 'Closed'];

  const CATEGORY_ICON = {
    'Software Troubleshooting': 'fa-bug',
    'Hardware Setup': 'fa-microchip',
    'Network Configuration': 'fa-network-wired',
    'Cloud Deployment': 'fa-cloud-arrow-up',
    'Cybersecurity': 'fa-shield-halved',
    'Database / Backend': 'fa-database',
    'Other': 'fa-circle-question'
  };

  let TICKETS = [];

  /* -------------------------------------------------------- Capability tiles --- */

  async function loadTiles() {
    const host = SAG.byId('support-tiles');
    try {
      const { data } = await SAG.listAll('services');
      const support = data.filter((s) => s.pillar === 'Technical Support & Infrastructure');
      if (!support.length) {
        host.innerHTML = SAG.emptyBlock('No support services configured');
        return;
      }
      host.innerHTML = support.map((s) =>
        '<article class="sag-card sag-card-hover p-4">' +
          '<span class="sag-icon-badge mb-3" style="background:rgba(52,211,153,.14);color:var(--sag-emerald)">' +
            '<i class="fa-solid ' + SAG.escapeHtml(s.icon || 'fa-screwdriver-wrench') + '"></i></span>' +
          '<h3 class="font-semibold text-sm mb-1">' + SAG.escapeHtml(s.name) + '</h3>' +
          '<p class="text-xs sag-muted mb-3">' + SAG.escapeHtml((s.summary || '').slice(0, 96)) +
            ((s.summary || '').length > 96 ? '…' : '') + '</p>' +
          '<div class="flex justify-between text-xs">' +
            '<span class="sag-muted">From ' + SAG.fmtMoney(s.price_from) + '</span>' +
            '<span class="sag-muted">' + (Number(s.turnaround_days) || 0) + 'd SLA</span>' +
          '</div>' +
        '</article>').join('');
    } catch (err) {
      host.innerHTML = SAG.errorBlock('Could not load capability areas: ' + err.message);
    }
  }

  /* --------------------------------------------------------- Ticket intake --- */

  function nextRef() {
    const nums = TICKETS
      .map((t) => parseInt(String(t.ticket_ref || '').replace(/[^0-9]/g, ''), 10))
      .filter((n) => !isNaN(n));
    const next = (nums.length ? Math.max.apply(null, nums) : 3000) + 1;
    return 'SAG-' + next;
  }

  async function submitTicket(ev) {
    ev.preventDefault();
    const form = ev.target;
    const check = SAG.validate(form, [
      { name: 'requester_name', label: 'Your name', required: true },
      { name: 'contact_email', label: 'Contact email', required: true, type: 'email' },
      { name: 'category', label: 'Category', required: true },
      { name: 'severity', label: 'Severity', required: true },
      { name: 'description', label: 'Issue description', required: true }
    ]);
    SAG.showErrors(SAG.byId('ticket-form-errors'), check.errors);
    if (!check.valid) {
      SAG.toast('Please correct the highlighted fields.', 'error');
      return;
    }

    const v = check.values;
    const ref = nextRef();
    const payload = {
      id: SAG.makeId('tkt'),
      ticket_ref: ref,
      requester_name: v.requester_name,
      contact_email: v.contact_email,
      category: v.category,
      severity: v.severity,
      environment: form.querySelector('[name="environment"]').value || 'On-Premise',
      description: v.description,
      status: 'Open',
      assigned_to: 'Unassigned',
      resolution_notes: '',
      created_at: new Date().toISOString().slice(0, 10)
    };

    const btn = SAG.byId('ticket-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="sag-spinner"></span> Submitting…';

    try {
      await SAG.api.create(TABLE, payload);
      form.reset();
      SAG.byId('tf-category').value = 'Software Troubleshooting';
      SAG.byId('tf-severity').value = 'Medium';
      SAG.byId('tf-environment').value = 'On-Premise';

      const conf = SAG.byId('ticket-confirmation');
      conf.style.display = 'block';
      conf.className = 'sag-panel p-4';
      conf.innerHTML =
        '<div class="flex items-start gap-3">' +
          '<i class="fa-solid fa-circle-check" style="color:var(--sag-emerald);font-size:1.3rem"></i>' +
          '<div>' +
            '<p class="font-semibold m-0">Ticket ' + SAG.escapeHtml(ref) + ' created</p>' +
            '<p class="text-sm sag-muted mb-2">Expected first response within ' +
              (v.severity === 'Critical' ? '1 hour' : v.severity === 'High' ? '4 hours' : '1 business day') +
              '. Keep the reference to track progress.</p>' +
            '<button class="sag-btn sag-btn-ghost" type="button" id="btn-track-new">' +
              '<i class="fa-solid fa-magnifying-glass"></i> Track this ticket</button>' +
          '</div>' +
        '</div>';

      SAG.byId('btn-track-new').addEventListener('click', () => {
        SAG.byId('lookup-ref').value = ref;
        lookup();
        SAG.byId('ticket-lookup').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      SAG.toast('Ticket ' + ref + ' submitted to the support queue.', 'success');
      await reload();
    } catch (err) {
      SAG.toast('Could not submit ticket: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-ticket"></i> Submit Ticket';
    }
  }

  /* ------------------------------------------------------------ Lookup --- */

  function ticketDetailCard(t, headline) {
    const slaNote = t.severity === 'Critical' ? '1 hour' : t.severity === 'High' ? '4 hours' : '1 business day';
    return '<div class="sag-panel p-4">' +
      (headline ? '<p class="text-sm font-semibold mb-3 m-0" style="color:var(--sag-emerald)">' +
        SAG.escapeHtml(headline) + '</p>' : '') +
      '<div class="flex flex-wrap items-center justify-between gap-2 mb-3">' +
        '<strong class="text-base">' + SAG.escapeHtml(t.ticket_ref) + '</strong>' +
        '<div class="flex gap-2">' + SAG.badge(t.severity) + SAG.badge(t.status) + '</div>' +
      '</div>' +
      '<div class="grid gap-2 text-sm">' +
        '<div class="flex justify-between gap-3"><span class="sag-muted">Requester</span><span>' + SAG.escapeHtml(t.requester_name) + '</span></div>' +
        '<div class="flex justify-between gap-3"><span class="sag-muted">Category</span><span>' + SAG.escapeHtml(t.category) + '</span></div>' +
        '<div class="flex justify-between gap-3"><span class="sag-muted">Environment</span><span>' + SAG.escapeHtml(t.environment || '—') + '</span></div>' +
        '<div class="flex justify-between gap-3"><span class="sag-muted">Assigned to</span><span>' + SAG.escapeHtml(t.assigned_to || 'Unassigned') + '</span></div>' +
        '<div class="flex justify-between gap-3"><span class="sag-muted">Raised</span><span>' + SAG.fmtDate(t.created_at) + '</span></div>' +
        '<div class="flex justify-between gap-3"><span class="sag-muted">Target response</span><span>' + slaNote + '</span></div>' +
      '</div>' +
      '<hr class="sag-divider my-3">' +
      '<p class="sag-metric-label mb-1">Issue</p>' +
      '<p class="text-sm mb-3">' + SAG.escapeHtml(t.description) + '</p>' +
      '<p class="sag-metric-label mb-1">Resolution notes</p>' +
      '<p class="text-sm m-0">' + (t.resolution_notes ? SAG.escapeHtml(t.resolution_notes) : '<span class="sag-muted">No notes recorded yet.</span>') + '</p>' +
    '</div>';
  }

  function lookup() {
    const host = SAG.byId('lookup-result');
    const raw = (SAG.byId('lookup-ref').value || '').trim();
    if (!raw) {
      host.innerHTML = '<p class="sag-help m-0">Enter a ticket reference to search.</p>';
      return;
    }
    const needle = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    const t = TICKETS.find((x) =>
      String(x.ticket_ref || '').toLowerCase().replace(/[^a-z0-9]/g, '') === needle);

    host.innerHTML = t
      ? ticketDetailCard(t, 'Ticket found in the support queue.')
      : '<div class="sag-empty"><i class="fa-regular fa-circle-question"></i>' +
        '<p class="mt-2 mb-1 font-semibold">No ticket found for “' + SAG.escapeHtml(raw) + '”</p>' +
        '<p class="text-sm m-0">Check the reference format (e.g. SAG-3001) or submit a new ticket.</p></div>';
  }

  /* ------------------------------------------------------------- Queue --- */

  function queueRow(t) {
    return '<tr>' +
      '<td><strong>' + SAG.escapeHtml(t.ticket_ref) + '</strong></td>' +
      '<td>' + SAG.escapeHtml(t.requester_name) +
        '<div class="text-xs sag-muted">' + SAG.escapeHtml(t.contact_email || '') + '</div></td>' +
      '<td><span class="sag-badge sag-badge-neutral"><i class="fa-solid ' +
        (CATEGORY_ICON[t.category] || 'fa-circle-question') + '"></i> ' + SAG.escapeHtml(t.category) + '</span></td>' +
      '<td>' + SAG.badge(t.severity) + '</td>' +
      '<td>' + SAG.escapeHtml(t.environment || '—') + '</td>' +
      '<td>' + SAG.badge(t.status) + '</td>' +
      '<td>' + SAG.escapeHtml(t.assigned_to || 'Unassigned') + '</td>' +
      '<td class="whitespace-nowrap">' + SAG.fmtDate(t.created_at) + '</td>' +
      '<td class="sag-no-print"><button class="sag-btn sag-btn-ghost" style="padding:.35rem .6rem" type="button" ' +
        'data-action="update" data-id="' + SAG.escapeHtml(t.id) + '" title="Update ticket">' +
        '<i class="fa-solid fa-pen-to-square"></i></button></td>' +
    '</tr>';
  }

  function renderQueue() {
    const status = SAG.byId('board-status').value;
    const rows = TICKETS
      .filter((t) => !status || t.status === status)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    SAG.byId('ticket-tbody').innerHTML = rows.length
      ? rows.map(queueRow).join('')
      : '<tr><td colspan="9">' + SAG.emptyBlock('No tickets in this view') + '</td></tr>';
    SAG.byId('board-count').textContent = rows.length + ' ticket' + (rows.length === 1 ? '' : 's');
  }

  /* ------------------------------------------------------- Update modal --- */

  function openUpdate(id) {
    const t = TICKETS.find((x) => String(x.id) === String(id));
    if (!t) return;
    const form = SAG.byId('ticket-update-form');
    form.querySelector('[name="id"]').value = t.id;
    SAG.byId('uf-status').value = t.status || 'Open';
    SAG.byId('uf-severity').value = t.severity || 'Medium';
    SAG.byId('uf-assignee').value = t.assigned_to || '';
    SAG.byId('uf-notes').value = t.resolution_notes || '';
    SAG.byId('ticket-modal-sub').textContent = t.ticket_ref + ' · ' + t.requester_name + ' · ' + t.category;
    SAG.openModal('ticket-modal');
  }

  async function saveUpdate(ev) {
    ev.preventDefault();
    const form = ev.target;
    const id = form.querySelector('[name="id"]').value;
    const btn = SAG.byId('ticket-update-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="sag-spinner"></span> Saving…';
    try {
      await SAG.api.patch(TABLE, id, {
        status: SAG.byId('uf-status').value,
        severity: SAG.byId('uf-severity').value,
        assigned_to: SAG.byId('uf-assignee').value.trim() || 'Unassigned',
        resolution_notes: SAG.byId('uf-notes').value.trim()
      });
      SAG.toast('Ticket updated.', 'success');
      SAG.closeModal('ticket-modal');
      await reload();
    } catch (err) {
      SAG.toast('Update failed: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Update';
    }
  }

  /* -------------------------------------------------------------- Wiring --- */

  function wire() {
    SAG.byId('ticket-form').addEventListener('submit', submitTicket);
    SAG.byId('ticket-form').addEventListener('reset', () => {
      SAG.showErrors(SAG.byId('ticket-form-errors'), []);
      SAG.byId('ticket-confirmation').style.display = 'none';
    });
    SAG.byId('btn-lookup').addEventListener('click', lookup);
    SAG.byId('lookup-ref').addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); lookup(); }
    });
    SAG.byId('board-status').addEventListener('change', renderQueue);
    SAG.byId('ticket-update-form').addEventListener('submit', saveUpdate);
    SAG.byId('ticket-tbody').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-action="update"]');
      if (btn) openUpdate(btn.getAttribute('data-id'));
    });
  }

  async function reload() {
    const { data } = await SAG.listAll(TABLE);
    TICKETS = data;
    renderQueue();
  }

  async function boot() {
    SAG.fillSelect(SAG.byId('tf-category'), CATEGORIES, 'Select a category…');
    SAG.fillSelect(SAG.byId('tf-severity'), SEVERITIES);
    SAG.fillSelect(SAG.byId('tf-environment'), ENVIRONMENTS);
    SAG.fillSelect(SAG.byId('uf-status'), STATUSES);
    SAG.fillSelect(SAG.byId('uf-severity'), SEVERITIES);
    SAG.byId('tf-category').value = 'Software Troubleshooting';
    SAG.byId('tf-severity').value = 'Medium';
    SAG.byId('tf-environment').value = 'On-Premise';
    wire();

    try {
      await Promise.all([loadTiles(), reload()]);
      /* Deep link support: support.html?ref=SAG-3001 */
      const ref = SAG.queryParam('ref');
      if (ref) { SAG.byId('lookup-ref').value = ref; lookup(); }
    } catch (err) {
      SAG.byId('ticket-tbody').innerHTML =
        '<tr><td colspan="9">' + SAG.errorBlock('Could not load the support queue: ' + err.message) + '</td></tr>';
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
