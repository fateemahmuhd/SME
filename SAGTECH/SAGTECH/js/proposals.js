/* ==========================================================================
   SAGTECH — Business & Academic Proposal Desk
   Proposal submission, filtering, detail view and a review workflow that
   advances status through Draft -> Submitted -> Under Review -> Approved.

   PHP/MySQL equivalents:
     submit    -> INSERT INTO proposals (...) VALUES (...)
     workflow  -> UPDATE proposals SET status = ? WHERE id = ?
     detail    -> SELECT * FROM proposals WHERE id = ?
   ========================================================================== */

(function () {
  'use strict';

  const TABLE = 'proposals';

  const TYPES = ['Business Proposal', 'Academic Proposal', 'Technical Specification', 'Problem Statement'];
  const STATUSES = ['Draft', 'Submitted', 'Under Review', 'Revisions Requested', 'Approved', 'Rejected'];
  const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'INR'];

  /* Next step in the review pipeline, used by the workflow button. */
  const NEXT_STATUS = {
    'Draft': 'Submitted',
    'Submitted': 'Under Review',
    'Under Review': 'Approved',
    'Revisions Requested': 'Submitted',
    'Approved': null,
    'Rejected': 'Under Review'
  };

  let PROPOSALS = [];

  /* ------------------------------------------------------------ KPI cards --- */

  function renderKpis(rows) {
    const total = rows.length;
    const approved = rows.filter((r) => r.status === 'Approved').length;
    const review = rows.filter((r) => ['Submitted', 'Under Review', 'Revisions Requested'].includes(r.status)).length;
    const pipeline = SAG.sum(rows.filter((r) => r.status !== 'Rejected'), (r) => r.budget);

    const card = (label, value, icon, color, hint) =>
      '<div class="sag-card p-4">' +
        '<div class="flex items-center gap-2 mb-2">' +
          '<i class="fa-solid ' + icon + '" style="color:' + color + '"></i>' +
          '<span class="sag-metric-label">' + SAG.escapeHtml(label) + '</span>' +
        '</div>' +
        '<p class="sag-metric-value m-0">' + value + '</p>' +
        '<p class="sag-help m-0">' + SAG.escapeHtml(hint) + '</p>' +
      '</div>';

    SAG.byId('prop-kpis').innerHTML =
      card('Total Proposals', total, 'fa-file-lines', 'var(--sag-violet)', 'All documents in the desk') +
      card('In Review', review, 'fa-magnifying-glass-chart', 'var(--sag-amber)', 'Awaiting panel decision') +
      card('Approved', approved, 'fa-file-circle-check', 'var(--sag-emerald)', 'Cleared for delivery') +
      card('Indicative Pipeline', SAG.fmtMoney(pipeline, 'USD'), 'fa-sack-dollar', 'var(--sag-cyan)', 'Sum of budgets (mixed currencies shown in USD)');
  }

  /* --------------------------------------------------------------- Table --- */

  function rowMarkup(p) {
    const next = NEXT_STATUS[p.status];
    return '<tr>' +
      '<td><strong>' + SAG.escapeHtml(p.title) + '</strong>' +
        '<div class="text-xs sag-muted">' + SAG.escapeHtml(p.organization || '—') + '</div></td>' +
      '<td><span class="sag-badge sag-badge-violet">' + SAG.escapeHtml(p.proposal_type) + '</span></td>' +
      '<td>' + SAG.escapeHtml(p.submitted_by) +
        '<div class="text-xs sag-muted">' + SAG.escapeHtml(p.contact_email || '') + '</div></td>' +
      '<td class="whitespace-nowrap">' + SAG.fmtMoney(p.budget, p.currency || 'USD') + '</td>' +
      '<td class="whitespace-nowrap">' + SAG.fmtDate(p.deadline) + '</td>' +
      '<td>' + SAG.badge(p.status) + '</td>' +
      '<td class="sag-no-print whitespace-nowrap">' +
        '<button class="sag-btn sag-btn-ghost" style="padding:.35rem .6rem" type="button" data-action="view" data-id="' + SAG.escapeHtml(p.id) + '" title="View proposal"><i class="fa-solid fa-eye"></i></button> ' +
        (next ? '<button class="sag-btn sag-btn-ghost" style="padding:.35rem .6rem" type="button" data-action="advance" data-id="' + SAG.escapeHtml(p.id) + '" title="Move to ' + SAG.escapeHtml(next) + '"><i class="fa-solid fa-forward-step"></i></button> ' : '') +
        '<button class="sag-btn sag-btn-ghost" style="padding:.35rem .6rem" type="button" data-action="edit" data-id="' + SAG.escapeHtml(p.id) + '" title="Edit"><i class="fa-solid fa-pen"></i></button> ' +
        '<button class="sag-btn sag-btn-danger" style="padding:.35rem .6rem" type="button" data-action="delete" data-id="' + SAG.escapeHtml(p.id) + '" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }

  function renderTable() {
    const term = (SAG.byId('prop-search').value || '').toLowerCase().trim();
    const type = SAG.byId('prop-type-filter').value;
    const status = SAG.byId('prop-status-filter').value;

    const rows = PROPOSALS.filter((p) => {
      if (type && p.proposal_type !== type) return false;
      if (status && p.status !== status) return false;
      if (!term) return true;
      return [p.title, p.submitted_by, p.organization, p.problem_statement, p.scope]
        .join(' ').toLowerCase().includes(term);
    }).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    SAG.byId('prop-tbody').innerHTML = rows.length
      ? rows.map(rowMarkup).join('')
      : '<tr><td colspan="7">' + SAG.emptyBlock('No proposals match the current filters') + '</td></tr>';
    SAG.byId('prop-count').textContent = rows.length + ' of ' + PROPOSALS.length + ' proposals';
  }

  /* -------------------------------------------------------------- Detail --- */

  function openDetail(id) {
    const p = PROPOSALS.find((x) => String(x.id) === String(id));
    if (!p) return;
    SAG.byId('pd-title').textContent = p.title;
    SAG.byId('pd-sub').textContent = p.proposal_type + ' · ' + (p.organization || 'Independent') + ' · ' + (p.status || 'Draft');

    const facts = [
      ['Submitted by', SAG.escapeHtml(p.submitted_by)],
      ['Contact email', SAG.escapeHtml(p.contact_email || '—')],
      ['Budget', SAG.fmtMoney(p.budget, p.currency || 'USD')],
      ['Deadline', SAG.fmtDate(p.deadline)],
      ['Status', SAG.badge(p.status)],
      ['Logged on', SAG.fmtDate(p.created_at)]
    ].map(([k, v]) =>
      '<div class="flex justify-between gap-4 py-2" style="border-bottom:1px solid var(--sag-line)">' +
        '<span class="sag-muted text-sm">' + k + '</span><span class="text-sm text-right">' + v + '</span></div>').join('');

    SAG.byId('pd-body').innerHTML =
      '<div class="mb-5">' + facts + '</div>' +
      '<h3 class="text-sm font-semibold uppercase tracking-wider sag-muted mb-2">Problem statement</h3>' +
      '<p class="text-sm mb-5">' + SAG.escapeHtml(p.problem_statement || '—') + '</p>' +
      '<h3 class="text-sm font-semibold uppercase tracking-wider sag-muted mb-2">Scope of work</h3>' +
      '<p class="text-sm mb-5">' + SAG.escapeHtml(p.scope || '—') + '</p>' +
      '<div class="flex flex-wrap justify-end gap-3 sag-no-print">' +
        '<button class="sag-btn sag-btn-ghost" type="button" data-close-modal="proposal-detail-modal">Close</button>' +
      '</div>';

    SAG.openModal('proposal-detail-modal');
  }

  /* ------------------------------------------------------------ Workflow --- */

  async function advance(id) {
    const p = PROPOSALS.find((x) => String(x.id) === String(id));
    if (!p) return;
    const next = NEXT_STATUS[p.status];
    if (!next) return;
    try {
      await SAG.api.patch(TABLE, id, { status: next });
      SAG.toast('“' + p.title.slice(0, 40) + (p.title.length > 40 ? '…' : '') + '” moved to ' + next + '.', 'success');
      await reload();
    } catch (err) {
      SAG.toast('Workflow update failed: ' + err.message, 'error');
    }
  }

  async function deleteProposal(id) {
    const p = PROPOSALS.find((x) => String(x.id) === String(id));
    if (!p) return;
    if (!window.confirm('Delete proposal “' + p.title + '”? This cannot be undone.')) return;
    try {
      await SAG.api.remove(TABLE, id);
      SAG.toast('Proposal deleted.', 'success');
      await reload();
    } catch (err) {
      SAG.toast('Delete failed: ' + err.message, 'error');
    }
  }

  /* ---------------------------------------------------------------- Form --- */

  const FORM_FIELDS = [
    { name: 'title', label: 'Proposal title', required: true },
    { name: 'proposal_type', label: 'Document type', required: true },
    { name: 'submitted_by', label: 'Submitted by', required: true },
    { name: 'contact_email', label: 'Contact email', required: true, type: 'email' },
    { name: 'problem_statement', label: 'Problem statement', required: true },
    { name: 'scope', label: 'Scope of work', required: true },
    { name: 'budget', label: 'Budget', type: 'number' }
  ];

  function resetForm() {
    const form = SAG.byId('proposal-form');
    form.reset();
    form.querySelector('[name="id"]').value = '';
    form.querySelectorAll('.sag-field-error').forEach((el) => el.classList.remove('sag-field-error'));
    SAG.showErrors(SAG.byId('proposal-form-errors'), []);
    SAG.byId('prf-type').value = 'Business Proposal';
    SAG.byId('prf-currency').value = 'USD';
    SAG.byId('prf-status').value = 'Submitted';
    SAG.byId('proposal-modal-title').textContent = 'Submit a Proposal';
  }

  function fillForm(p) {
    const form = SAG.byId('proposal-form');
    ['id', 'title', 'proposal_type', 'submitted_by', 'organization', 'contact_email',
     'budget', 'currency', 'deadline', 'status', 'problem_statement', 'scope']
      .forEach((f) => {
        const el = form.querySelector('[name="' + f + '"]');
        if (el) el.value = p[f] == null ? '' : p[f];
      });
    SAG.showErrors(SAG.byId('proposal-form-errors'), []);
    SAG.byId('proposal-modal-title').textContent = 'Edit Proposal';
    SAG.openModal('proposal-modal');
  }

  async function submitForm(ev) {
    ev.preventDefault();
    const form = ev.target;
    const check = SAG.validate(form, FORM_FIELDS);
    SAG.showErrors(SAG.byId('proposal-form-errors'), check.errors);
    if (!check.valid) {
      SAG.toast('Please correct the highlighted fields.', 'error');
      return;
    }

    const v = check.values;
    const existingId = form.querySelector('[name="id"]').value;
    const payload = {
      title: v.title,
      proposal_type: v.proposal_type,
      submitted_by: v.submitted_by,
      organization: form.querySelector('[name="organization"]').value.trim(),
      contact_email: v.contact_email,
      problem_statement: v.problem_statement,
      scope: v.scope,
      budget: Number(v.budget) || 0,
      currency: form.querySelector('[name="currency"]').value || 'USD',
      deadline: form.querySelector('[name="deadline"]').value || '',
      status: form.querySelector('[name="status"]').value || 'Submitted',
      created_at: existingId
        ? (PROPOSALS.find((p) => String(p.id) === String(existingId)) || {}).created_at || new Date().toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    };

    const btn = SAG.byId('proposal-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="sag-spinner"></span> Saving…';

    try {
      if (existingId) {
        await SAG.api.replace(TABLE, existingId, Object.assign({ id: existingId }, payload));
        SAG.toast('Proposal updated.', 'success');
      } else {
        await SAG.api.create(TABLE, Object.assign({ id: SAG.makeId('prop') }, payload));
        SAG.toast('Proposal submitted to the desk.', 'success');
      }
      SAG.closeModal('proposal-modal');
      await reload();
    } catch (err) {
      SAG.toast('Save failed: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Save Proposal';
    }
  }

  /* -------------------------------------------------------------- Wiring --- */

  function wire() {
    ['prop-search', 'prop-type-filter', 'prop-status-filter'].forEach((id) => {
      const el = SAG.byId(id);
      el.addEventListener(id === 'prop-search' ? 'input' : 'change', renderTable);
    });

    SAG.byId('btn-new-proposal').addEventListener('click', () => {
      resetForm();
      SAG.openModal('proposal-modal');
    });

    SAG.byId('proposal-form').addEventListener('submit', submitForm);

    SAG.byId('prop-tbody').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      if (action === 'view') openDetail(id);
      if (action === 'advance') advance(id);
      if (action === 'delete') deleteProposal(id);
      if (action === 'edit') {
        const p = PROPOSALS.find((x) => String(x.id) === String(id));
        if (p) fillForm(p);
      }
    });
  }

  async function reload() {
    const { data } = await SAG.listAll(TABLE);
    PROPOSALS = data;
    renderKpis(PROPOSALS);
    renderTable();
  }

  async function boot() {
    SAG.fillSelect(SAG.byId('prf-type'), TYPES);
    SAG.fillSelect(SAG.byId('prf-currency'), CURRENCIES);
    SAG.fillSelect(SAG.byId('prf-status'), STATUSES);
    SAG.byId('prf-type').value = 'Business Proposal';
    SAG.byId('prf-currency').value = 'USD';
    SAG.byId('prf-status').value = 'Submitted';
    wire();

    try {
      await reload();
    } catch (err) {
      SAG.byId('prop-tbody').innerHTML =
        '<tr><td colspan="7">' + SAG.errorBlock('Could not load proposals: ' + err.message) + '</td></tr>';
      SAG.byId('prop-kpis').innerHTML = SAG.errorBlock('Metrics unavailable.');
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
