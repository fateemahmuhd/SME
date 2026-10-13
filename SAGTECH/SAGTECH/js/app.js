/* ==========================================================================
   SAGTECH IT SOLUTION — Shared application core
   Provides: RESTful Table API client, nav/footer injection, toasts, modals,
   formatting helpers, validation and status-badge mapping.
   Loaded by every page before page-specific scripts.
   ========================================================================== */

const SAG = (() => {
  'use strict';

  /* ---------------------------------------------------------------- API ---
     The platform exposes a RESTful Table API at relative paths.
     PHP/MySQL equivalent mapping is documented in README.md:
       GET    tables/{t}?page&limit&search&sort  ->  SELECT ... LIMIT/OFFSET
       GET    tables/{t}/{id}                    ->  SELECT ... WHERE id=?
       POST   tables/{t}                         ->  INSERT INTO {t}
       PUT    tables/{t}/{id}                    ->  UPDATE {t} SET ... WHERE id=?
       PATCH  tables/{t}/{id}                    ->  UPDATE (partial)
       DELETE tables/{t}/{id}                    ->  DELETE FROM {t} WHERE id=?
  ---------------------------------------------------------------------- */

  async function apiRequest(path, options = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (res.status === 204) return null;
    const text = await res.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); } catch (e) { payload = { raw: text }; }
    }
    if (!res.ok) {
      const detail = payload && (payload.error || payload.message);
      throw new Error(detail || ('Request failed with status ' + res.status));
    }
    return payload;
  }

  /** List rows. Returns { data, total }. */
  async function list(table, { page = 1, limit = 100, search = '', sort = '' } = {}) {
    const qs = new URLSearchParams({ page, limit });
    if (search) qs.set('search', search);
    if (sort) qs.set('sort', sort);
    const out = await apiRequest('tables/' + table + '?' + qs.toString());
    if (Array.isArray(out)) return { data: out, total: out.length };
    return { data: (out && out.data) || [], total: (out && out.total) || 0 };
  }

  const get    = (table, id)       => apiRequest('tables/' + table + '/' + encodeURIComponent(id));
  const create = (table, row)      => apiRequest('tables/' + table, { method: 'POST', body: JSON.stringify(row) });
  const replace = (table, id, row) => apiRequest('tables/' + table + '/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(row) });
  const patch  = (table, id, row)  => apiRequest('tables/' + table + '/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(row) });
  const remove = (table, id)       => apiRequest('tables/' + table + '/' + encodeURIComponent(id), { method: 'DELETE' });

  /** Loads every page (limit 500) — fine for HUB-scale datasets. */
  async function listAll(table) {
    return list(table, { page: 1, limit: 500 });
  }

  /* ------------------------------------------------------------ Helpers --- */

  const escapeHtml = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const fmtMoney = (n, currency = 'USD') => {
    const num = Number(n || 0);
    if (!num) return '—';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency, maximumFractionDigits: 0
      }).format(num);
    } catch (e) {
      return currency + ' ' + num.toLocaleString();
    }
  };

  const fmtNumber = (n) => Number(n || 0).toLocaleString();

  const fmtDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return escapeHtml(value);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const todayISO = () => new Date().toISOString().slice(0, 10);

  /** Stable short id generator (client-side PK, mirrors an AUTO_INCREMENT/UIID). */
  const makeId = (prefix) =>
    prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

  const byId = (id) => document.getElementById(id);

  /* ------------------------------------------------------- Status badges --- */

  const STATUS_TONE = {
    /* projects */
    'Discovery': 'neutral', 'In Design': 'cyan', 'In Review': 'violet',
    'Delivered': 'green', 'On Hold': 'amber',
    /* proposals */
    'Draft': 'neutral', 'Submitted': 'cyan', 'Under Review': 'violet',
    'Revisions Requested': 'amber', 'Approved': 'green', 'Rejected': 'rose',
    /* tickets */
    'Open': 'rose', 'In Progress': 'cyan', 'Awaiting Client': 'amber',
    'Resolved': 'green', 'Closed': 'neutral',
    /* inquiries */
    'New': 'cyan', 'Contacted': 'violet', 'Qualified': 'green', 'Archived': 'neutral',
    /* priority / severity */
    'Low': 'neutral', 'Medium': 'cyan', 'High': 'amber', 'Critical': 'rose',
    /* pillars */
    'Enterprise & System Architecture': 'cyan',
    'Technical Support & Infrastructure': 'green',
    'Business & Academic Proposals': 'violet',
    'General Enquiry': 'neutral'
  };

  function badge(text) {
    if (!text) return '<span class="sag-badge sag-badge-neutral">—</span>';
    const tone = STATUS_TONE[text] || 'neutral';
    return '<span class="sag-badge sag-badge-' + tone + '">' + escapeHtml(text) + '</span>';
  }

  function stars(rating) {
    const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    let out = '';
    for (let i = 0; i < 5; i++) {
      out += '<i class="fa-solid fa-star' + (i < r ? ' sag-star' : '') +
             '" style="' + (i < r ? '' : 'color:rgba(148,190,255,.28)') + '"></i>';
    }
    return out;
  }

  /* ------------------------------------------------------------- Toasts --- */

  function toastHost() {
    let host = byId('sag-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'sag-toast-host';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(message, type = 'info', ms = 4200) {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = 'sag-toast is-' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><span>' +
                   escapeHtml(message) + '</span>';
    toastHost().appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, ms);
  }

  /* ------------------------------------------------------------- Modals --- */

  function openModal(id) {
    const el = byId(id);
    if (!el) return;
    el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    const focusable = el.querySelector('input, select, textarea, button');
    if (focusable) setTimeout(() => focusable.focus(), 60);
  }

  function closeModal(id) {
    const el = byId(id);
    if (!el) return;
    el.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* --------------------------------------------------------- Validation --- */

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

  /**
   * Validates fields described as { name, label, required, type }.
   * Highlights invalid controls and returns { valid, errors[], values{} }.
   */
  function validate(form, fields) {
    const errors = [];
    const values = {};
    fields.forEach((f) => {
      const el = form.querySelector('[name="' + f.name + '"]');
      if (!el) return;
      el.classList.remove('sag-field-error');
      let value = el.value;
      if (f.type === 'number') {
        value = value === '' ? '' : Number(value);
      } else {
        value = String(value || '').trim();
      }
      values[f.name] = value;
      const empty = value === '' || value === null;
      if (f.required && empty) {
        errors.push(f.label + ' is required.');
        el.classList.add('sag-field-error');
      } else if (!empty && f.type === 'email' && !isEmail(value)) {
        errors.push(f.label + ' must be a valid email address.');
        el.classList.add('sag-field-error');
      } else if (!empty && f.type === 'number' && (isNaN(value) || value < 0)) {
        errors.push(f.label + ' must be a non-negative number.');
        el.classList.add('sag-field-error');
      }
    });
    return { valid: errors.length === 0, errors, values };
  }

  /** Renders a validation error summary into a container element. */
  function showErrors(container, errors) {
    if (!container) return;
    if (!errors.length) { container.innerHTML = ''; container.style.display = 'none'; return; }
    container.style.display = 'block';
    container.className = 'sag-error-box';
    container.innerHTML = '<strong><i class="fa-solid fa-triangle-exclamation"></i> Please fix the following:</strong><ul style="margin:.5rem 0 0 1.1rem;padding:0">' +
      errors.map((e) => '<li>' + escapeHtml(e) + '</li>').join('') + '</ul>';
  }

  /* --------------------------------------------------- Shared UI parts --- */

  const NAV_ITEMS = [
    { href: 'index.html', label: 'Home' },
    { href: 'services.html', label: 'Services' },
    { href: 'architecture.html', label: 'Architecture' },
    { href: 'support.html', label: 'Support Hub' },
    { href: 'proposals.html', label: 'Proposals' },
    { href: 'dashboard.html', label: 'Dashboard' },
    { href: 'about.html', label: 'About' },
    { href: 'contact.html', label: 'Contact' }
  ];

  function currentPage() {
    const file = window.location.pathname.split('/').pop();
    return file && file.length ? file : 'index.html';
  }

  function renderHeader() {
    const mount = byId('sag-header');
    if (!mount) return;
    const page = currentPage();
    const links = NAV_ITEMS.map((item) =>
      '<a class="sag-nav-link' + (item.href === page ? ' is-active' : '') +
      '" href="' + item.href + '"' + (item.href === page ? ' aria-current="page"' : '') + '>' +
      item.label + '</a>').join('');

    mount.className = 'sag-header';
    mount.innerHTML =
      '<div class="max-w-7xl mx-auto px-4 sm:px-6">' +
        '<div class="flex items-center justify-between gap-3 h-16">' +
          '<a href="index.html" class="flex items-center gap-2.5 no-underline shrink-0" aria-label="SAGTECH IT SOLUTION home">' +
            '<span class="sag-icon-badge" style="width:38px;height:38px;border-radius:10px"><i class="fa-solid fa-cubes-stacked"></i></span>' +
            '<span class="leading-tight">' +
              '<span class="block font-extrabold tracking-tight text-[1.02rem]" style="color:var(--sag-ink)">SAGTECH</span>' +
              '<span class="block text-[0.62rem] font-semibold tracking-[0.2em] sag-muted">IT SOLUTION</span>' +
            '</span>' +
          '</a>' +
          '<nav class="sag-desktop-nav flex items-center gap-0.5" aria-label="Primary">' + links + '</nav>' +
          '<div class="flex items-center gap-2">' +
            '<a class="sag-btn sag-btn-primary hidden md:inline-flex" href="contact.html"><i class="fa-solid fa-paper-plane"></i> Request a Quote</a>' +
            '<button type="button" class="sag-nav-toggle sag-btn sag-btn-ghost md:hidden" id="sag-nav-toggle" aria-expanded="false" aria-controls="sag-mobile-nav" style="display:none">' +
              '<i class="fa-solid fa-bars" aria-hidden="true"></i><span class="sag-sr-only">Toggle navigation</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<nav id="sag-mobile-nav" class="sag-mobile-panel pb-4" aria-label="Mobile">' +
          '<div class="flex flex-col gap-1">' + links +
          '<a class="sag-btn sag-btn-primary mt-2 justify-center" href="contact.html"><i class="fa-solid fa-paper-plane"></i> Request a Quote</a>' +
          '</div>' +
        '</nav>' +
      '</div>';

    const toggle = byId('sag-nav-toggle');
    const panel = byId('sag-mobile-nav');
    if (toggle && panel) {
      toggle.addEventListener('click', () => {
        const open = panel.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      panel.addEventListener('click', (ev) => {
        if (ev.target.closest('a')) panel.classList.remove('is-open');
      });
    }
  }

  function renderFooter() {
    const mount = byId('sag-footer');
    if (!mount) return;
    mount.className = 'sag-footer';
    mount.innerHTML =
      '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-12">' +
        '<div class="grid gap-8 md:grid-cols-4">' +
          '<div class="md:col-span-2">' +
            '<div class="flex items-center gap-2.5 mb-3">' +
              '<span class="sag-icon-badge" style="width:36px;height:36px;border-radius:10px"><i class="fa-solid fa-cubes-stacked"></i></span>' +
              '<strong class="text-lg">SAGTECH <span class="sag-muted font-medium">IT SOLUTION</span></strong>' +
            '</div>' +
            '<p class="sag-muted text-sm max-w-md">An IT Solution HUB delivering enterprise &amp; system architecture, technical support &amp; infrastructure, and business &amp; academic proposals for organisations and researchers.</p>' +
          '</div>' +
          '<div>' +
            '<h3 class="text-sm font-semibold mb-3">Service Pillars</h3>' +
            '<ul class="space-y-2 list-none p-0 m-0">' +
              '<li><a href="architecture.html">Enterprise &amp; System Architecture</a></li>' +
              '<li><a href="support.html">Technical Support &amp; Infrastructure</a></li>' +
              '<li><a href="proposals.html">Business &amp; Academic Proposals</a></li>' +
              '<li><a href="services.html">Full Service Catalogue</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<h3 class="text-sm font-semibold mb-3">Hub</h3>' +
            '<ul class="space-y-2 list-none p-0 m-0">' +
              '<li><a href="dashboard.html">Delivery Dashboard</a></li>' +
              '<li><a href="support.html#ticket-lookup">Track a Ticket</a></li>' +
              '<li><a href="proposals.html#proposal-tracker">Proposal Tracker</a></li>' +
              '<li><a href="about.html">About SAGTECH</a></li>' +
              '<li><a href="contact.html">Contact &amp; Enquiries</a></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<hr class="sag-divider my-8">' +
        '<div class="flex flex-col sm:flex-row justify-between gap-3 text-xs sag-muted">' +
          '<p class="m-0">&copy; ' + new Date().getFullYear() + ' SAGTECH IT SOLUTION. All rights reserved.</p>' +
          '<p class="m-0">Demo HUB &middot; data persisted through the platform table API</p>' +
        '</div>' +
      '</div>';
  }

  /** Standard loading / empty / error blocks. */
  const loadingBlock = (label = 'Loading data…') =>
    '<div class="sag-loading"><span class="sag-spinner"></span><span>' + escapeHtml(label) + '</span></div>';

  const emptyBlock = (title, hint = '') =>
    '<div class="sag-empty"><i class="fa-regular fa-folder-open"></i>' +
    '<p class="mt-2 mb-1 font-semibold">' + escapeHtml(title) + '</p>' +
    (hint ? '<p class="text-sm m-0">' + escapeHtml(hint) + '</p>' : '') + '</div>';

  const errorBlock = (message) =>
    '<div class="sag-error-box"><i class="fa-solid fa-plug-circle-xmark"></i> ' +
    escapeHtml(message || 'Unable to reach the data service.') + '</div>';

  /** Binds every element with [data-close-modal] to close its parent modal. */
  function wireModalClosers() {
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close-modal')));
    });
    document.querySelectorAll('.sag-modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (ev) => {
        if (ev.target === backdrop) closeModal(backdrop.id);
      });
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      document.querySelectorAll('.sag-modal-backdrop.is-open').forEach((m) => closeModal(m.id));
    });
  }

  /** Fills a <select> from an array of option strings. */
  function fillSelect(selectEl, options, placeholder) {
    if (!selectEl) return;
    const head = placeholder ? '<option value="">' + escapeHtml(placeholder) + '</option>' : '';
    selectEl.innerHTML = head + options.map((o) =>
      '<option value="' + escapeHtml(o) + '">' + escapeHtml(o) + '</option>').join('');
  }

  /** Sum helper used by dashboards. */
  const sum = (arr, fn) => arr.reduce((acc, item) => acc + (Number(fn(item)) || 0), 0);

  /** Groups rows by a key -> { key: count }. */
  function countBy(rows, keyFn) {
    return rows.reduce((acc, row) => {
      const k = keyFn(row) || 'Unspecified';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
  }

  /** Reads ?key=value from the URL (deep links into modules). */
  function queryParam(key) {
    return new URLSearchParams(window.location.search).get(key) || '';
  }

  function init() {
    renderHeader();
    renderFooter();
    wireModalClosers();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    api: { list, listAll, get, create, replace, patch, remove },
    /* listAll / list also exposed at top level for convenience */
    listAll, list,
    escapeHtml, fmtMoney, fmtNumber, fmtDate, todayISO, makeId, byId,
    badge, stars, toast, openModal, closeModal,
    validate, showErrors, isEmail,
    loadingBlock, emptyBlock, errorBlock,
    fillSelect, sum, countBy, queryParam,
    NAV_ITEMS, STATUS_TONE
  };
})();
