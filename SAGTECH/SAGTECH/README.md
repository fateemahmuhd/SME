# SAGTECH IT SOLUTION — IT Solution HUB

An IT Solution HUB web application covering three service pillars:

1. **Enterprise & System Architecture** — designing and documenting system components (class diagrams, database schemas, ERDs, flowcharts, full platform architecture).
2. **Technical Support & Infrastructure** — troubleshooting software/hardware, network configuration, cloud deployment and cybersecurity frameworks.
3. **Business & Academic Proposals** — project proposals, problem statements and technical specifications for IT solution platforms.

---

## ⚠️ Important note on the requested stack (PHP + MySQL)

The original brief asked for **PHP and MySQL**. This project is delivered on a **static-site platform**, which has
**no PHP runtime and no MySQL server** available. Rather than deliver something that cannot run, the hub was built as a
static front-end (HTML + CSS + JavaScript) with persistence through the platform's **RESTful Table API**, which is a
real SQL-backed data service.

**Every database operation in this hub maps 1:1 onto the SQL you would write in PHP/MySQL**, and the full mapping is
documented below so the application can be re-implemented on a LAMP/WAMP stack (PHP 8 + PDO + MySQL 8) without any
redesign of the data model or screens.

### PHP/MySQL → this implementation

| Operation | PHP / MySQL (intended production) | This hub (implemented) |
|---|---|---|
| List rows | `SELECT * FROM services WHERE active = 1 ORDER BY pillar;` | `GET tables/services?page=1&limit=500` |
| Read one | `SELECT * FROM proposals WHERE id = :id;` | `GET tables/proposals/{id}` |
| Create | `INSERT INTO support_tickets (ticket_ref, ...) VALUES (?, ...);` | `POST tables/support_tickets` |
| Update (full) | `UPDATE proposals SET title = ?, ... WHERE id = ?;` | `PUT tables/proposals/{id}` |
| Update (partial) | `UPDATE support_tickets SET status = ? WHERE id = ?;` | `PATCH tables/support_tickets/{id}` |
| Delete | `DELETE FROM architecture_projects WHERE id = ?;` | `DELETE tables/architecture_projects/{id}` |
| Aggregate report | `SELECT status, COUNT(*) FROM proposals GROUP BY status;` | Fetched via `GET` then grouped client-side in `js/dashboard.js` |
| Search | `WHERE name LIKE '%' || ? || '%'` | Client-side filter over the fetched page |

`id`, `created_at` and `updated_at` are managed as system fields by the table API — the direct analogue of a
`BIGINT AUTO_INCREMENT PRIMARY KEY` plus `DEFAULT CURRENT_TIMESTAMP` / `ON UPDATE CURRENT_TIMESTAMP` columns.

### If you move this to real PHP + MySQL

1. Create a MySQL 8 database and run the `CREATE TABLE` statements in the [Data model](#data-model) section below
   (add `FOREIGN KEY` constraints where noted).
2. Replace the `apiRequest()` function in `js/app.js` with `fetch()` calls to PHP endpoints
   (e.g. `api/tickets.php?action=create`) that use **PDO prepared statements**.
3. Keep all rendering code (`js/*.js`) unchanged — it only depends on the JSON shape returned by `apiRequest()`.
4. Add session-based authentication before exposing the write endpoints publicly.

---

## Currently completed features

### Public marketing / information pages
- **Home** (`index.html`) — hero with live KPI counters, a "Live HUB Snapshot" panel (active engagements, open tickets,
  proposals in review, new enquiries), architecture-artifact mix bars, the three service pillars, a four-stage
  engagement process, featured engagements, testimonials and a CTA.
- **Service Catalogue** (`services.html`) — filterable card grid plus a full deliverable matrix table. Filters: keyword
  search, pillar filter, reset. Counts update live ("Showing X of Y service lines").
- **About** (`about.html`) — mandate, approach, capability depth per pillar, practice-lead structure and a technology
  note explaining the intended PHP/MySQL production stack.
- **Contact** (`contact.html`) — enquiry form writing to the `inquiries` table, contact channels, response targets, and
  a "Recently received" panel.

### Working modules (full CRUD against the table API)
- **Architecture module** (`architecture.html`)
  - KPI cards: total engagements, in flight, delivered, average progress.
  - Engagement register with search, status filter, artifact-type filter and four sort modes.
  - Create / edit engagement modal with field validation.
  - Detail modal including an **illustrative starter DDL generator** for `ERD` and `Database Schema` artifacts, which
    reads capitalised entity nouns from the description and emits MySQL `CREATE TABLE` statements (with a copy button).
  - Delete with confirmation.
- **Support Hub** (`support.html`)
  - Capability tiles pulled from the `services` table (support pillar only).
  - **Ticket intake form** with severity-based response targets; auto-generates the next `SAG-nnnn` reference.
  - **Ticket lookup** by reference (accepts `SAG-3001` or `sag3001`), with an SLA note and resolution notes.
  - Support queue table with status filter; triage update modal (status, severity, assigned team, resolution notes).
- **Proposal Desk** (`proposals.html`)
  - KPI cards: total, in review, approved, indicative pipeline value.
  - Proposal tracker with keyword, document-type and status filters.
  - Submission form for business proposals, academic proposals, technical specifications and problem statements.
  - **Review workflow** button that advances status along the pipeline
    (`Draft → Submitted → Under Review → Approved`, with `Revisions Requested → Submitted`).
  - Detail modal showing the full problem statement and scope.
- **Delivery Dashboard** (`dashboard.html`)
  - Four live KPI cards and four Chart.js visualisations: engagements by status (horizontal bar), tickets by category
    (doughnut), proposal pipeline by status (bar), ticket severity mix (polar area).
  - "Needs attention" table (open Critical/High tickets) and a recent-enquiries table.
  - Manual refresh button.

### Cross-cutting
- Shared design system (`css/style.css`) — dark "infrastructure" theme, responsive breakpoints at 900px and 640px.
- Shared JS core (`js/app.js`) — API client, auto-injected header/nav (with mobile hamburger) and footer, toast
  notifications, modal system with Escape/backdrop close, HTML escaping on all rendered values, form validation, and
  status→badge-colour mapping.
- Accessibility: semantic landmarks, `aria-*` on interactive controls, labelled form fields, table `caption`s,
  `role="img"` + `aria-label` on canvases, and an `aria-live` toast host.
- Print stylesheet that strips chrome for printable ticket/proposal summaries.

---

## Functional entry URIs

| Page | Path | Parameters |
|---|---|---|
| Home | `index.html` | — |
| Service catalogue | `services.html` | — |
| Architecture module | `architecture.html` | — |
| Support Hub | `support.html` | `?ref=SAG-3001` pre-fills the ticket lookup |
| Proposal Desk | `proposals.html` | `#proposal-tracker` anchor |
| Delivery dashboard | `dashboard.html` | — |
| About | `about.html` | — |
| Contact | `contact.html` | `?service=<pillar name>` pre-selects the service-of-interest dropdown |

### Data API endpoints used by the front end

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `tables/{table}?page&limit&search&sort` | List rows with pagination |
| GET | `tables/{table}/{id}` | Read a single row |
| POST | `tables/{table}` | Insert a row |
| PUT | `tables/{table}/{id}` | Full-row update |
| PATCH | `tables/{table}/{id}` | Partial update (status changes, triage) |
| DELETE | `tables/{table}/{id}` | Delete a row |

Tables: `services`, `architecture_projects`, `proposals`, `support_tickets`, `inquiries`, `testimonials`.

---

## Data model

All tables carry an `id` field. `created_at` / `updated_at` are system-managed by the table API.

### `services`
`id`, `name`, `pillar` (enum: Enterprise & System Architecture | Technical Support & Infrastructure | Business &
Academic Proposals), `summary` (rich text), `deliverables` (pipe-delimited list), `icon`, `price_from` (number),
`turnaround_days` (number), `active` (bool).

### `architecture_projects`
`id`, `project_name`, `client`, `domain`, `artifact_type` (Class Diagram | ERD | Database Schema | Flowchart | System
Architecture | UML Use Case | Sequence Diagram | API Specification), `description` (rich text), `tech_stack`, `status`
(Discovery | In Design | In Review | Delivered | On Hold), `priority` (Low | Medium | High | Critical), `progress`
(0–100), `lead_architect`, `due_date`, `created_at`.

### `proposals`
`id`, `title`, `proposal_type` (Business Proposal | Academic Proposal | Technical Specification | Problem Statement),
`submitted_by`, `organization`, `contact_email`, `problem_statement` (rich text), `scope` (rich text), `budget`,
`currency` (USD | EUR | GBP | NGN | KES | GHS | ZAR | INR), `deadline`, `status` (Draft | Submitted | Under Review |
Revisions Requested | Approved | Rejected), `created_at`.

### `support_tickets`
`id`, `ticket_ref`, `requester_name`, `contact_email`, `category` (Software Troubleshooting | Hardware Setup | Network
Configuration | Cloud Deployment | Cybersecurity | Database / Backend | Other), `severity` (Low | Medium | High |
Critical), `environment` (On-Premise | Cloud | Hybrid | Remote / Field), `description` (rich text), `status` (Open | In
Progress | Awaiting Client | Resolved | Closed), `assigned_to`, `resolution_notes` (rich text), `created_at`.

### `inquiries`
`id`, `name`, `email`, `company`, `phone`, `service_interest` (three pillars + General Enquiry), `message` (rich text),
`status` (New | Contacted | Qualified | Archived), `created_at`.

### `testimonials`
`id`, `client_name`, `organization`, `role`, `quote` (rich text), `rating` (1–5), `pillar`.

### Equivalent MySQL DDL (for the PHP port)

```sql
CREATE TABLE services (
  id              VARCHAR(64)   NOT NULL,
  name            VARCHAR(150)  NOT NULL,
  pillar          VARCHAR(64)   NOT NULL,
  summary         TEXT,
  deliverables    TEXT,
  icon            VARCHAR(64),
  price_from      DECIMAL(12,2) DEFAULT 0,
  turnaround_days INT           DEFAULT 0,
  active          TINYINT(1)    DEFAULT 1,
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_services_pillar (pillar)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE architecture_projects (
  id            VARCHAR(64)  NOT NULL,
  project_name  VARCHAR(200) NOT NULL,
  client        VARCHAR(200),
  domain        VARCHAR(120),
  artifact_type VARCHAR(64),
  description   TEXT,
  tech_stack    VARCHAR(255),
  status        VARCHAR(32)  NOT NULL DEFAULT 'Discovery',
  priority      VARCHAR(16)  NOT NULL DEFAULT 'Medium',
  progress      TINYINT UNSIGNED DEFAULT 0,
  lead_architect VARCHAR(120),
  due_date      DATE,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE proposals (
  id                VARCHAR(64)   NOT NULL,
  title             VARCHAR(250)  NOT NULL,
  proposal_type     VARCHAR(64)   NOT NULL,
  submitted_by      VARCHAR(150)  NOT NULL,
  organization      VARCHAR(200),
  contact_email     VARCHAR(190),
  problem_statement TEXT,
  scope             TEXT,
  budget            DECIMAL(14,2) DEFAULT 0,
  currency          CHAR(3)       DEFAULT 'USD',
  deadline          DATE,
  status            VARCHAR(32)   NOT NULL DEFAULT 'Submitted',
  created_at        DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_proposals_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE support_tickets (
  id               VARCHAR(64)  NOT NULL,
  ticket_ref       VARCHAR(32)  NOT NULL,
  requester_name   VARCHAR(150) NOT NULL,
  contact_email    VARCHAR(190),
  category         VARCHAR(64)  NOT NULL,
  severity         VARCHAR(16)  NOT NULL DEFAULT 'Medium',
  environment      VARCHAR(32),
  description      TEXT,
  status           VARCHAR(32)  NOT NULL DEFAULT 'Open',
  assigned_to      VARCHAR(120) DEFAULT 'Unassigned',
  resolution_notes TEXT,
  created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ticket_ref (ticket_ref),
  KEY idx_tickets_status (status),
  KEY idx_tickets_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inquiries (
  id               VARCHAR(64)  NOT NULL,
  name             VARCHAR(150) NOT NULL,
  email            VARCHAR(190) NOT NULL,
  company          VARCHAR(200),
  phone            VARCHAR(64),
  service_interest VARCHAR(64),
  message          TEXT,
  status           VARCHAR(32)  NOT NULL DEFAULT 'New',
  created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_inquiries_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE testimonials (
  id           VARCHAR(64)  NOT NULL,
  client_name  VARCHAR(150) NOT NULL,
  organization VARCHAR(200),
  role         VARCHAR(150),
  quote        TEXT,
  rating       TINYINT UNSIGNED DEFAULT 5,
  pillar       VARCHAR(64),
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Project structure

```
index.html              Home
services.html           Service catalogue
architecture.html       Pillar 1 module (CRUD + DDL preview)
support.html            Pillar 2 module (intake + lookup + triage)
proposals.html          Pillar 3 module (submission + review workflow)
dashboard.html          Aggregated delivery dashboard (Chart.js)
about.html              Company / capability / tech note
contact.html            Enquiry intake
css/style.css           Shared design system
js/app.js               API client, header/footer, toasts, modals, validation
js/home.js              Home page controller
js/services.js          Catalogue controller
js/architecture.js      Architecture module controller
js/support.js           Support module controller
js/proposals.js         Proposal desk controller
js/dashboard.js         Dashboard controller
js/contact.js           Contact controller
```

Third-party assets are loaded from CDN: Tailwind CSS, Font Awesome 6, Inter (Google Fonts) and Chart.js.

---

## Features not yet implemented

- **No server-side authentication.** There is no login, session or role system. Anyone who can reach the page can
  create, edit and delete records. This is a static site — a client-side password check would be cosmetic only and
  readable in the page source, so it was deliberately not added. Real access control requires the PHP/MySQL port plus
  session auth, or the platform's route-admission rules.
- **No real diagram rendering.** The architecture module stores and describes artifacts but does not draw ERDs, class
  diagrams or flowcharts. The DDL preview is illustrative text, not a validated schema generator.
- **No file uploads or attachments.** Proposals, tickets and artifacts cannot carry attached documents.
- **No email notification.** Ticket confirmations and proposal acknowledgements are shown in-page only; no mail is sent.
- **No server-side search/pagination.** All rows are fetched (up to 500) and filtered in the browser. This is fine at
  hub scale but will need server-side filtering at volume.
- **Mixed-currency totals.** The proposal pipeline KPI sums budgets across currencies and labels the result in USD,
  which is an approximation.
- **No audit trail.** Edits overwrite values with no history of previous states.
- **No automated tests** in the repository (verification was performed manually during development).

## Recommended next steps

1. **Decide on the production stack.** If PHP/MySQL is required, port the write endpoints to PHP 8 + PDO using the DDL
   above, then swap `apiRequest()` in `js/app.js` to call those endpoints.
2. **Add authentication and roles** (client / support agent / admin) with session-based login, and scope every write
   endpoint to the caller's role. Move authorization server-side — never rely on the UI hiding buttons.
3. **Add file attachments** for proposals (PDF/DOCX) and tickets (screenshots), stored outside the web root with
   validated MIME types.
4. **Send real notifications** — transactional email on ticket creation, status change and proposal decisions.
5. **Replace the illustrative DDL preview** with a proper diagram tool (e.g. Mermaid or a schema-designer library) so
   ERDs are generated as real, exportable diagrams.
6. **Move filtering and pagination server-side** once record counts exceed a few hundred per table.
7. **Add an audit log table** capturing actor, timestamp, field and old/new value for every mutation.
8. **Replace the demo contact details** on `contact.html` with real channels before publishing.
9. **Normalise currency** — store a base-currency equivalent alongside the original amount for accurate pipeline totals.

---

## Public URLs

- **Production site:** publish via the platform's **Publish tab** (or Hosted Deploy) to obtain the live URL.
- **Data API:** served relative to the site root at `tables/{table}` — see the endpoint table above.

## Data storage services used

- **Platform RESTful Table API** (SQL-backed) for all six tables. Schema definitions live in `.tables/schema.json`;
  preview rows live in the platform data store, and a Hosted Deploy provisions a separate live database for real
  visitor data.
- No external database, API key or third-party service is required — the hub runs entirely on the static host plus the
  table API.
