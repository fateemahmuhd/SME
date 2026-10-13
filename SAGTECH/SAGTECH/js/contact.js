/* ==========================================================================
   SAGTECH — Contact & Enquiry module
   Captures inbound enquiries into the `inquiries` table and shows the most
   recent ones. Pre-fills the service dropdown from ?service= deep links
   (e.g. contact.html?service=Technical%20Support%20%26%20Infrastructure).

   PHP/MySQL equivalent:
     INSERT INTO inquiries (name, email, company, phone, service_interest,
                            message, status, created_at) VALUES (?,?,?,?,?,?,?,?)
   ========================================================================== */

(function () {
  'use strict';

  const TABLE = 'inquiries';

  const INTERESTS = ['Enterprise & System Architecture', 'Technical Support & Infrastructure',
    'Business & Academic Proposals', 'General Enquiry'];

  const FORM_FIELDS = [
    { name: 'name', label: 'Full name', required: true },
    { name: 'email', label: 'Email address', required: true, type: 'email' },
    { name: 'service_interest', label: 'Service of interest', required: true },
    { name: 'message', label: 'Message', required: true }
  ];

  /* ------------------------------------------------------------- Submit --- */

  async function submit(ev) {
    ev.preventDefault();
    const form = ev.target;
    const check = SAG.validate(form, FORM_FIELDS);
    SAG.showErrors(SAG.byId('enquiry-form-errors'), check.errors);
    if (!check.valid) {
      SAG.toast('Please correct the highlighted fields.', 'error');
      return;
    }

    const v = check.values;
    const payload = {
      id: SAG.makeId('inq'),
      name: v.name,
      email: v.email,
      company: form.querySelector('[name="company"]').value.trim(),
      phone: form.querySelector('[name="phone"]').value.trim(),
      service_interest: v.service_interest,
      message: v.message,
      status: 'New',
      created_at: new Date().toISOString().slice(0, 10)
    };

    const btn = SAG.byId('enquiry-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="sag-spinner"></span> Sending…';

    try {
      await SAG.api.create(TABLE, payload);
      form.reset();

      const conf = SAG.byId('enquiry-confirmation');
      conf.style.display = 'block';
      conf.className = 'sag-panel p-4';
      conf.innerHTML =
        '<div class="flex items-start gap-3">' +
          '<i class="fa-solid fa-circle-check" style="color:var(--sag-emerald);font-size:1.3rem"></i>' +
          '<div>' +
            '<p class="font-semibold m-0">Enquiry received</p>' +
            '<p class="text-sm sag-muted m-0">Reference <code>' + SAG.escapeHtml(payload.id) + '</code>. ' +
              'A SAGTECH lead will respond within one business day for standard enquiries, or sooner for critical work.</p>' +
          '</div>' +
        '</div>';

      SAG.toast('Enquiry submitted — it is now on the delivery dashboard.', 'success');
      await loadRecent();
    } catch (err) {
      SAG.toast('Could not send the enquiry: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Enquiry';
    }
  }

  /* -------------------------------------------------------- Recent list --- */

  async function loadRecent() {
    const host = SAG.byId('recent-enquiries');
    try {
      const { data } = await SAG.listAll(TABLE);
      const rows = data
        .slice()
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 4);

      host.innerHTML = rows.length ? rows.map((i) =>
        '<div class="pb-3 mb-3" style="border-bottom:1px solid var(--sag-line)">' +
          '<div class="flex justify-between gap-3 mb-1">' +
            '<strong class="text-sm">' + SAG.escapeHtml(i.name) + '</strong>' +
            '<span class="text-xs sag-muted whitespace-nowrap">' + SAG.fmtDate(i.created_at) + '</span>' +
          '</div>' +
          '<p class="text-xs sag-muted mb-2 m-0">' + SAG.escapeHtml(i.company || 'Independent') + '</p>' +
          '<div>' + SAG.badge(i.service_interest) + '</div>' +
        '</div>').join('') : '<p class="sag-muted text-sm m-0">No enquiries yet — yours would be the first.</p>';
    } catch (err) {
      host.innerHTML = SAG.errorBlock('Could not load recent enquiries.');
    }
  }

  /* --------------------------------------------------------------- Boot --- */

  async function boot() {
    SAG.fillSelect(SAG.byId('ef-service'), INTERESTS, 'Select a service area…');

    /* Deep link: contact.html?service=... pre-selects the interest. */
    const preselect = SAG.queryParam('service');
    if (preselect) {
      const match = INTERESTS.find((i) => i.toLowerCase() === preselect.toLowerCase());
      if (match) SAG.byId('ef-service').value = match;
    }

    SAG.byId('enquiry-form').addEventListener('submit', submit);
    SAG.byId('enquiry-form').addEventListener('reset', () => {
      SAG.showErrors(SAG.byId('enquiry-form-errors'), []);
      SAG.byId('enquiry-confirmation').style.display = 'none';
    });

    await loadRecent();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
