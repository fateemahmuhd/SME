/* ==========================================================================
   SAGTECH — Enterprise & System Architecture module
   Full CRUD over the architecture_projects table plus KPI aggregation and a
   starter-DDL preview generator for schema/ERD engagements.

   PHP/MySQL equivalents performed by this controller:
     CREATE  -> INSERT INTO architecture_projects (...) VALUES (...)
     UPDATE  -> UPDATE architecture_projects SET ... WHERE id = ?
     DELETE  -> DELETE FROM architecture_projects WHERE id = ?
   ========================================================================== */

(function () {
  'use strict';

  const TABLE = 'architecture_projects';

  const ARTIFACT_TYPES = ['Class Diagram', 'ERD', 'Database Schema', 'Flowchart',
    'System Architecture', 'UML Use Case', 'Sequence Diagram', 'API Specification'];
  const STATUSES = ['Discovery', 'In Design', 'In Review', 'Delivered', 'On Hold'];
  const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
  const PRIORITY_WEIGHT = { Critical: 4, High: 3, Medium: 2, Low: 1 };

  let PROJECTS = [];

  /* ------------------------------------------------------------- KPI cards --- */

  function renderKpis(rows) {
    const total = rows.length;
    const delivered = rows.filter((r) => r.status === 'Delivered').length;
    const active = rows.filter((r) => r.status !== 'Delivered' && r.status !== 'On Hold').length;
    const avg = total ? Math.round(SAG.sum(rows, (r) => r.progress) / total) : 0;

    const card = (label, value, icon, color, hint) =>
      '<div class="sag-card p-4">' +
        '<div class="flex items-center gap-2 mb-2">' +
          '<i class="fa-solid ' + icon + '" style="color:' + color + '"></i>' +
          '<span class="sag-metric-label">' + SAG.escapeHtml(label) + '</span>' +
        '</div>' +
        '<p class="sag-metric-value m-0">' + value + '</p>' +
        '<p class="sag-help m-0">' + SAG.escapeHtml(hint) + '</p>' +
      '</div>';

    SAG.byId('arch-kpis').innerHTML =
      card('Total Engagements', total, 'fa-diagram-project', 'var(--sag-cyan)', 'All logged architecture work') +
      card('In Flight', active, 'fa-person-digging', 'var(--sag-violet)', 'Excludes delivered & on hold') +
      card('Delivered', delivered, 'fa-circle-check', 'var(--sag-emerald)', 'Signed-off artifacts') +
      card('Avg. Progress', avg + '%', 'fa-gauge-simple-high', 'var(--sag-amber)', 'Mean completion across all work');
  }

  /* ---------------------------------------------------------------- Table --- */

  function progressCell(p) {
    const v = Math.max(0, Math.min(100, Number(p.progress) || 0));
    return '<div style="min-width:96px">' +
      '<div class="flex justify-between text-xs mb-1"><span>' + v + '%</span></div>' +
      '<div class="sag-progress-track"><div class="sag-progress-fill" style="width:' + v + '%"></div></div>' +
    '</div>';
  }

  function rowMarkup(p) {
    return '<tr>' +
      '<td><strong>' + SAG.escapeHtml(p.project_name) + '</strong>' +
        '<div class="text-xs sag-muted">' + SAG.escapeHtml(p.domain || '—') + ' &middot; ' + SAG.escapeHtml(p.lead_architect || 'Unassigned') + '</div></td>' +
      '<td>' + SAG.escapeHtml(p.client || '—') + '</td>' +
      '<td><span class="sag-badge sag-badge-neutral">' + SAG.escapeHtml(p.artifact_type || '—') + '</span></td>' +
      '<td>' + SAG.badge(p.status) + '</td>' +
      '<td>' + SAG.badge(p.priority) + '</td>' +
      '<td>' + progressCell(p) + '</td>' +
      '<td class="whitespace-nowrap">' + SAG.fmtDate(p.due_date) + '</td>' +
      '<td class="sag-no-print whitespace-nowrap">' +
        '<button class="sag-btn sag-btn-ghost" style="padding:.35rem .6rem" type="button" data-action="view" data-id="' + SAG.escapeHtml(p.id) + '" title="View detail"><i class="fa-solid fa-eye"></i></button> ' +
        '<button class="sag-btn sag-btn-ghost" style="padding:.35rem .6rem" type="button" data-action="edit" data-id="' + SAG.escapeHtml(p.id) + '" title="Edit"><i class="fa-solid fa-pen"></i></button> ' +
        '<button class="sag-btn sag-btn-danger" style="padding:.35rem .6rem" type="button" data-action="delete" data-id="' + SAG.escapeHtml(p.id) + '" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }

  function currentView() {
    const term = (SAG.byId('arch-search').value || '').toLowerCase().trim();
    const status = SAG.byId('arch-status').value;
    const artifact = SAG.byId('arch-artifact').value;
    const sort = SAG.byId('arch-sort').value;

    let rows = PROJECTS.filter((p) => {
      if (status && p.status !== status) return false;
      if (artifact && p.artifact_type !== artifact) return false;
      if (!term) return true;
      return [p.project_name, p.client, p.domain, p.tech_stack, p.lead_architect, p.description]
        .join(' ').toLowerCase().includes(term);
    });

    rows.sort((a, b) => {
      if (sort === 'progress') return (Number(b.progress) || 0) - (Number(a.progress) || 0);
      if (sort === 'priority') return (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
      if (sort === 'name') return String(a.project_name).localeCompare(String(b.project_name));
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return da - db;
    });

    return rows;
  }

  function renderTable() {
    const rows = currentView();
    const tbody = SAG.byId('arch-tbody');
    tbody.innerHTML = rows.length
      ? rows.map(rowMarkup).join('')
      : '<tr><td colspan="8">' + SAG.emptyBlock('No engagements match the current filters') + '</td></tr>';
    SAG.byId('arch-count').textContent = rows.length + ' of ' + PROJECTS.length + ' engagements';
  }

  /* --------------------------------------------------------- DDL preview --- */

  /**
   * Generates an illustrative starter DDL from the free-text description.
   * Detects capitalised entity nouns and emits one CREATE TABLE per entity.
   * This is a demonstration helper — real schemas are delivered as artifacts.
   */
  function buildDdlPreview(project) {
    const text = String(project.description || '');
    const stop = new Set(['The', 'This', 'A', 'An', 'It', 'We', 'They', 'With', 'For', 'And', 'Each',
      'All', 'Our', 'Client', 'System', 'Design', 'Full', 'Layered', 'Includes', 'Covering',
      'Model', 'Entity', 'Table', 'Schema', 'Diagram', 'Architecture', 'Layer', 'Service',
      'Presentation', 'Domain', 'Persistence', 'Integration', 'Gateway', 'Boundary']);
    const found = text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
    const entities = [...new Set(found)].filter((w) => !stop.has(w)).slice(0, 6);

    if (!entities.length) {
      return '-- No entity names detected in the description.\n' +
        '-- Add capitalised entity nouns (e.g. "Student, Course, Enrollment")\n' +
        '-- to generate an illustrative starter DDL preview.';
    }

    /* Snake-case the entity and pluralise it sensibly for a MySQL table name.
       Order matters: already-plural forms are left alone before suffix rules. */
    const tableName = (e) => {
      const snake = e.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
      if (/ies$/.test(snake)) return snake;                       // Entities -> entities
      if (/(ss|x|z|ch|sh)$/.test(snake)) return snake + 'es';     // Class -> classes
      if (/[^aeiou]y$/.test(snake)) return snake.slice(0, -1) + 'ies'; // Category -> categories
      if (/s$/.test(snake)) return snake;                         // already plural
      return snake + 's';
    };
    return entities.map((e) => {
      const t = tableName(e);
      return [
        'CREATE TABLE ' + t + ' (',
        '  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,',
        '  name          VARCHAR(150)    NOT NULL,',
        '  status        VARCHAR(32)     NOT NULL DEFAULT \'active\',',
        '  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,',
        '  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,',
        '  PRIMARY KEY (id),',
        '  KEY idx_' + t + '_status (status)',
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;'
      ].join('\n');
    }).join('\n\n');
  }

  /* ------------------------------------------------------------- Detail --- */

  function openDetail(id) {
    const p = PROJECTS.find((x) => String(x.id) === String(id));
    if (!p) return;
    SAG.byId('detail-modal-title').textContent = p.project_name || 'Engagement Detail';
    SAG.byId('detail-modal-sub').textContent = (p.client || '—') + ' · ' + (p.artifact_type || '—');

    const rows = [
      ['Status', SAG.badge(p.status)],
      ['Priority', SAG.badge(p.priority)],
      ['Domain / sector', SAG.escapeHtml(p.domain || '—')],
      ['Technology stack', SAG.escapeHtml(p.tech_stack || '—')],
      ['Lead architect', SAG.escapeHtml(p.lead_architect || 'Unassigned')],
      ['Progress', (Number(p.progress) || 0) + '%'],
      ['Due date', SAG.fmtDate(p.due_date)],
      ['Logged on', SAG.fmtDate(p.created_at)],
      ['Record id', '<code style="font-size:.78rem">' + SAG.escapeHtml(p.id) + '</code>']
    ].map(([k, v]) =>
      '<div class="flex justify-between gap-4 py-2" style="border-bottom:1px solid var(--sag-line)">' +
        '<span class="sag-muted text-sm">' + k + '</span>' +
        '<span class="text-sm text-right">' + v + '</span>' +
      '</div>').join('');

    const showDdl = ['ERD', 'Database Schema'].includes(p.artifact_type);

    SAG.byId('detail-body').innerHTML =
      '<div class="mb-5">' + rows + '</div>' +
      '<h3 class="text-sm font-semibold uppercase tracking-wider sag-muted mb-2">Design description</h3>' +
      '<p class="text-sm mb-5">' + SAG.escapeHtml(p.description || '—') + '</p>' +
      (showDdl ? (
        '<div class="flex items-center justify-between gap-3 mb-2">' +
          '<h3 class="text-sm font-semibold uppercase tracking-wider sag-muted m-0">Illustrative starter DDL</h3>' +
          '<button class="sag-btn sag-btn-ghost sag-no-print" style="padding:.3rem .6rem" type="button" id="btn-copy-ddl">' +
            '<i class="fa-solid fa-copy"></i> Copy</button>' +
        '</div>' +
        '<pre class="sag-code" id="ddl-preview"></pre>'
      ) : '') +
      '<div class="flex justify-end mt-5 sag-no-print">' +
        '<button class="sag-btn sag-btn-ghost" type="button" data-close-modal="detail-modal">Close</button>' +
      '</div>';

    if (showDdl) {
      const ddl = buildDdlPreview(p);
      const pre = SAG.byId('ddl-preview');
      pre.textContent = ddl;
      SAG.byId('btn-copy-ddl').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(ddl);
          SAG.toast('DDL preview copied to clipboard.', 'success');
        } catch (e) {
          SAG.toast('Clipboard blocked by the browser — select the code manually.', 'info');
        }
      });
    }

    SAG.openModal('detail-modal');
  }

  /* --------------------------------------------------------------- Form --- */

  function resetForm() {
    const form = SAG.byId('project-form');
    form.reset();
    form.querySelector('[name="id"]').value = '';
    form.querySelectorAll('.sag-field-error').forEach((el) => el.classList.remove('sag-field-error'));
    SAG.showErrors(SAG.byId('project-form-errors'), []);
    SAG.byId('pf-progress').value = '0';
    SAG.byId('pf-due').value = SAG.todayISO();
    SAG.byId('project-modal-title').textContent = 'Log Architecture Engagement';
  }

  function fillForm(p) {
    const form = SAG.byId('project-form');
    ['id', 'project_name', 'client', 'domain', 'artifact_type', 'tech_stack',
     'status', 'priority', 'progress', 'lead_architect', 'due_date', 'description']
      .forEach((f) => {
        const el = form.querySelector('[name="' + f + '"]');
        if (el) el.value = p[f] == null ? '' : p[f];
      });
    SAG.showErrors(SAG.byId('project-form-errors'), []);
    SAG.byId('project-modal-title').textContent = 'Edit Engagement';
    SAG.openModal('project-modal');
  }

  const FORM_FIELDS = [
    { name: 'project_name', label: 'Project name', required: true },
    { name: 'client', label: 'Client / organisation', required: true },
    { name: 'artifact_type', label: 'Artifact type', required: true },
    { name: 'description', label: 'Design description', required: true },
    { name: 'progress', label: 'Progress', type: 'number' }
  ];

  async function submitForm(ev) {
    ev.preventDefault();
    const form = ev.target;
    const check = SAG.validate(form, FORM_FIELDS);
    SAG.showErrors(SAG.byId('project-form-errors'), check.errors);
    if (!check.valid) {
      SAG.toast('Please correct the highlighted fields.', 'error');
      return;
    }

    const v = check.values;
    const existingId = form.querySelector('[name="id"]').value;
    const payload = {
      project_name: v.project_name,
      client: v.client,
      domain: form.querySelector('[name="domain"]').value.trim(),
      artifact_type: v.artifact_type,
      description: v.description,
      tech_stack: form.querySelector('[name="tech_stack"]').value.trim(),
      status: form.querySelector('[name="status"]').value || 'Discovery',
      priority: form.querySelector('[name="priority"]').value || 'Medium',
      progress: Math.max(0, Math.min(100, Number(v.progress) || 0)),
      lead_architect: form.querySelector('[name="lead_architect"]').value.trim(),
      due_date: form.querySelector('[name="due_date"]').value || '',
      created_at: existingId
        ? (PROJECTS.find((p) => String(p.id) === String(existingId)) || {}).created_at || new Date().toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    };

    const btn = SAG.byId('project-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="sag-spinner"></span> Saving…';

    try {
      if (existingId) {
        await SAG.api.replace(TABLE, existingId, Object.assign({ id: existingId }, payload));
        SAG.toast('Engagement updated.', 'success');
      } else {
        await SAG.api.create(TABLE, Object.assign({ id: SAG.makeId('prj') }, payload));
        SAG.toast('Engagement logged to the hub.', 'success');
      }
      SAG.closeModal('project-modal');
      await reload();
    } catch (err) {
      SAG.toast('Save failed: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Engagement';
    }
  }

  async function deleteProject(id) {
    const p = PROJECTS.find((x) => String(x.id) === String(id));
    if (!p) return;
    if (!window.confirm('Delete engagement “' + p.project_name + '”? This removes the record from the hub.')) return;
    try {
      await SAG.api.remove(TABLE, id);
      SAG.toast('Engagement deleted.', 'success');
      await reload();
    } catch (err) {
      SAG.toast('Delete failed: ' + err.message, 'error');
    }
  }

  /* ------------------------------------------------------------- Wiring --- */

  function wire() {
    ['arch-search', 'arch-status', 'arch-artifact', 'arch-sort'].forEach((id) => {
      const el = SAG.byId(id);
      el.addEventListener(id === 'arch-search' ? 'input' : 'change', renderTable);
    });

    SAG.byId('btn-new-project').addEventListener('click', () => {
      resetForm();
      SAG.openModal('project-modal');
    });

    SAG.byId('project-form').addEventListener('submit', submitForm);

    SAG.byId('arch-tbody').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      if (action === 'view') openDetail(id);
      if (action === 'edit') {
        const p = PROJECTS.find((x) => String(x.id) === String(id));
        if (p) fillForm(p);
      }
      if (action === 'delete') deleteProject(id);
    });
  }

  async function reload() {
    const { data } = await SAG.listAll(TABLE);
    PROJECTS = data;
    renderKpis(PROJECTS);
    renderTable();
  }

  async function boot() {
    SAG.fillSelect(SAG.byId('pf-artifact'), ARTIFACT_TYPES, 'Select artifact type…');
    SAG.fillSelect(SAG.byId('pf-status'), STATUSES);
    SAG.fillSelect(SAG.byId('pf-priority'), PRIORITIES);
    SAG.byId('pf-status').value = 'Discovery';
    SAG.byId('pf-priority').value = 'Medium';
    SAG.byId('pf-due').value = SAG.todayISO();
    wire();

    try {
      await reload();
    } catch (err) {
      SAG.byId('arch-tbody').innerHTML =
        '<tr><td colspan="8">' + SAG.errorBlock('Could not load engagements: ' + err.message) + '</td></tr>';
      SAG.byId('arch-kpis').innerHTML = SAG.errorBlock('Metrics unavailable.');
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
