# Notion-like Editor — Multi-Vendor Email Template Platform

A block editor (Notion-style, built on Tiptap) that has grown into a
**multi-tenant email-template platform**. Each *vendor* gets branded email
templates authored in a rich editor, stored as ProseMirror JSON, rendered to
inbox-ready HTML, and served to a send pipeline by `vendor_id` + `trigger`.

> The original editor README lives at [`../README.md`](../README.md). This
> document explains the platform that wraps it: auth, vendors, templates,
> variables, analytics, and the APIs that tie them together.

---

## 1. The big picture

```
                          ┌───────────────────────────────────────────┐
                          │                 BROWSER                     │
                          │                                             │
                          │   Login ──▶ Dashboard ──▶ Vendor workspace  │
                          │                              │              │
                          │           ┌──────────────────┼───────────┐  │
                          │           ▼        ▼         ▼        ▼   │  │
                          │      Templates  Users   Header/Footer Settings│
                          │           │                                │  │
                          │           ▼                                │  │
                          │     Tiptap block editor (authoring)        │  │
                          └───────────────┬─────────────────────────────┘
                                          │  HTTP (JSON)
                          ┌───────────────▼─────────────────────────────┐
                          │            NEXT.JS APP (app router)          │
                          │                                              │
                          │   Auth.js (session)   ──▶  authz guards      │
                          │        │                                     │
                          │        ▼                                     │
                          │   /api/* route handlers (Node runtime)       │
                          │        │                                     │
                          │        ▼                                     │
                          │   lib/*  (data + render + compose)           │
                          └───────────────┬─────────────────────────────┘
                                          │  SQL (pg Pool)
                          ┌───────────────▼─────────────────────────────┐
                          │              PostgreSQL                       │
                          │                                              │
                          │  vendor · user · email_templates · variables │
                          │              · documents                     │
                          └──────────────────────────────────────────────┘
                                          │
                                          ▼  (downstream — not in this repo)
                                   Email send pipeline
                              GET /api/email-templates/body
                                ?vendor_id=..&trigger=..
```

**One-line summary:** authenticated users edit per-vendor email bodies in a
block editor; the platform stores JSON, compiles inbox-safe HTML, and hands the
finished body to a send system keyed by *(vendor, trigger)*.

---

## 2. Core domain model

```
        ┌──────────────────┐        ┌──────────────────────┐
        │   notion_sam_     │        │    notion_sam_user    │
        │     vendor        │◀───────│                       │
        │──────────────────│  1    ∞ │──────────────────────│
        │ id (PK)          │        │ id (PK)               │
        │ name             │        │ vendor_id (FK)        │
        │ vendor_name (UQ) │        │ email (UQ)            │
        │ status           │        │ role                  │  SUPER_ADMIN
        │ primary_color    │        │ status                │  ADMIN
        │ favicon_url      │        │ must_change_password  │  MEMBER
        │ header_html      │        │ password_hash         │
        │ footer_html      │        └──────────────────────┘
        └────────┬─────────┘
                 │ 1
                 │
                 │ ∞
        ┌────────▼─────────────────────┐        ┌───────────────────────┐
        │ notion_sam_email_templates    │        │  notion_sam_variables  │
        │───────────────────────────────│        │───────────────────────│
        │ id (PK)                       │        │ id (PK)               │
        │ vendor_name (UQ)  ← was slug  │        │ vendor_id (nullable)  │ ← null = global
        │ vendor_id (FK, indexed)       │        │ group_name            │
        │ trigger           ← event key │        │ token  (#TOKEN#)      │
        │ name                          │        │ label                 │
        │ body_html                     │        │ dummy_value           │
        │ body_json  (ProseMirror JSON) │        └───────────────────────┘
        │ final_body (inbox-ready HTML) │
        │ head_html / footer_html       │        ┌───────────────────────┐
        │ config (JSONB)                │        │ notion_sam_documents   │
        │ is_active ('Y' / 'N')         │        │ (standalone editor docs)│
        └───────────────────────────────┘        └───────────────────────┘
```

### Key relationships

| Relationship | Meaning |
|---|---|
| `vendor 1—∞ user` | Every user belongs to one vendor (except platform super-admins). |
| `vendor 1—∞ email_templates` | A vendor owns many templates, one per `trigger`. |
| `variables.vendor_id NULL` | Global variable shared by all vendors. |
| `variables.vendor_id = N` | Variable scoped to a single vendor. |
| `vendor.header_html / footer_html` | Shared chrome wrapped around every template body. |

> **Naming note:** in `email_templates`, the unique text column was renamed
> `slug → vendor_name`. It is *not* the same concept as `vendor.vendor_name`
> (which is the vendor code). It holds a per-template unique key.

---

## 3. Roles & authorization

```
   SUPER_ADMIN ─────────────────────────────▶ every vendor, every action
        │                                      (create/delete vendors, global variables)
        │
   ADMIN ───────────────────────────────────▶ own vendor only
        │                                      (manage users + templates + branding)
        │
   MEMBER ──────────────────────────────────▶ own vendor only
                                               (edit templates, no user management)
```

Enforced centrally in [`lib/authz.ts`](../lib/authz.ts):

- `isSuperAdmin(session)` — platform owner check.
- `canAccessVendor(session, vendorId)` — super-admin always true; others must
  match `session.vendorId`.
- `canManageUsers(session)` — `SUPER_ADMIN` or `ADMIN`.

Every `/api/*` handler follows the same guard order:

```
getSession() ──▶ 401 if none
      │
      ▼
canAccessVendor / canManageUsers ──▶ 403 if not allowed
      │
      ▼
validate body / params ──▶ 400 on bad input
      │
      ▼
initXxxTable() ──▶ run query ──▶ 200 | 404 | 500
```

---

## 4. The authoring → sending data flow

```
 1. AUTHOR                 2. STORE                3. COMPILE              4. SERVE
 ─────────                 ────────                ─────────              ────────

 Tiptap editor    ──▶  body_json (JSONB)   ──▶  composeFinalBody()  ──▶  GET /api/
 (getJSON /            body_html (HTML)          strips email             email-templates
  getHTML)             on the template row       chrome, joins            /body
                                                 header+body+footer       ?vendor_id&trigger
       │                     │                        │                        │
       │  source of truth    │  header/footer from    │  final_body =          │  returns full
       │  = ProseMirror JSON  │  the vendor            │  inbox-ready HTML      │  body payload
       ▼                     ▼                        ▼                        ▼
   never store HTML      JSON + HTML both        clients strip           downstream send
   as the truth          persisted               <head>,<style>,...      system renders
```

- **JSON is the source of truth** — HTML is always regenerable from it.
- **`composeFinalBody(header, body, footer)`**
  ([`lib/compose-email.ts`](../lib/compose-email.ts)) strips document chrome
  (`<!doctype>`, `<head>`, `<style>`, MSO conditionals) that email clients
  discard, then concatenates the surviving inner markup.
- **Variables** (`#TOKEN#`) are placeholders resolved by the send pipeline
  using each vendor's registry.

---

## 5. Directory map

```
app/
  page.tsx                         Landing / redirect
  layout.tsx                       Root layout (per-vendor accent + favicon)
  dashboard/
    page.tsx                       Super-admin: all vendors
    [vendorId]/page.tsx            Vendor workspace (tabbed: Templates,
                                   Users, Header&Footer, Settings)
  editor/[id]/                     Template body editor
  api/
    auth/[...nextauth]/            Auth.js handler
    dashboard/[vendorId]/route.ts  PUT shell · PATCH branding · DELETE vendor
    dashboard/body/                Body persistence
    email-templates/route.ts       GET list of shells
    email-templates/body/route.ts  GET body by vendor_id + trigger   ★
    variables/                     GET/POST vendor + global variables
    users/                         User CRUD
    render/route.ts                POST { json } -> composed HTML
    upload/                        S3 presigned upload

components/
  VendorSectionNav.tsx             Tabbed workspace shell
  VendorTemplatesTable.tsx         Template list per vendor
  VendorSettings.tsx               Branding (accent + favicon) card
  VendorUsersTable.tsx             User management
  CreateVendorButton.tsx           New-vendor dialog
  editor/                          Tiptap editor + extensions (see README)

lib/
  auth-db.ts                       vendor + user persistence, initAuthDB()
  email-templates.ts               template persistence, initTemplatesTable()
  variables.ts                     variable registry
  compose-email.ts                 final-body compiler (chrome stripping)
  email-shell.ts                   header/footer HTML builder
  render-html.ts / html-export.ts  ProseMirror JSON -> HTML
  authz.ts / session.ts            authorization + session mapping
  db.ts                            standalone document store

scripts/                          seed/verify tooling (tsx, --env-file)
feedback.sql                      original MySQL schema (source of truth for
                                  the domain: VENDOR, USER, API_KEY, ...)
```

★ = the send-path lookup endpoint.

---

## 6. Key API endpoints

| Method & path | Purpose | Guard |
|---|---|---|
| `GET /api/email-templates` | List shells (metadata + config) | public* |
| `GET /api/email-templates/body?vendor_id=&trigger=` | **Full body for a vendor+trigger** | public* |
| `POST /api/render` | Render ProseMirror JSON → HTML | public* |
| `PUT /api/dashboard/{vendorId}` | Save shared header/footer | vendor access |
| `PATCH /api/dashboard/{vendorId}` | Save accent color + favicon | manage rights |
| `DELETE /api/dashboard/{vendorId}` | Delete vendor (cascade) | super admin |
| `GET/POST /api/variables` | List/create variables | session + scope |
| `POST /api/users` … | User management | manage rights |

\* Marked routes only transform request/stored content and touch no per-user
data. Add auth + a body-size limit before exposing publicly (see caveats).

### Example: the send-path lookup

```
GET /api/email-templates/body?vendor_id=3&trigger=welcome

200 OK
{
  "id": 42,
  "vendor_id": 3,
  "vendor_name": "connect2excel-welcome-l9x2",
  "name": "welcome",
  "trigger": "welcome",
  "is_active": "Y",
  "body_html":  "<h1>Welcome …</h1>",
  "body_json":  { "type": "doc", "content": [ … ] },
  "final_body": "<h1>Welcome …</h1>…footer…"
}
```

Returns `400` for a missing/invalid `vendor_id` or `trigger`, `404` when no
template matches the pair (newest row wins when several share a trigger).

---

## 7. Persistence & migrations

Tables are created and evolved lazily by `init*` functions — there is no
separate migration runner. Each handler calls the relevant initializer before
querying, so a fresh database self-provisions on first use.

```
initAuthDB()          → vendor, user tables + rename code→vendor_name migration
initTemplatesTable()  → email_templates + additive columns + slug→vendor_name
initVariablesTable()  → variables
initDB()              → documents
```

Migrations are written to be **idempotent** (guarded `DO $$ … RENAME`,
`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`), so re-running them is
safe.

All libs share the same `pg.Pool` config from `DATABASE_*` env vars.

---

## 8. Local development

```bash
npm install
npm run dev            # http://localhost:3000

# seed data (needs .env.local with DATABASE_* set)
npm run seed:auth      # vendors + users
npm run seed:dashboard # per-vendor templates
npm run seed:variables # variable registry

# verification
npm run build          # production build + type-check
npm run verify:render  # asserts Tailwind classes survive server render
npm run verify:shell   # header/footer round-trip check
```

`.env.local` must define: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`,
`DATABASE_USER`, `DATABASE_PASSWORD`, plus Auth.js and (optional) S3 upload vars.

---

## 9. Caveats

- **Unauthenticated render/list endpoints.** `/api/render`,
  `/api/email-templates`, and `/api/email-templates/body` transform content only,
  but add auth + body-size limits before public exposure.
- **`vendor_name` is overloaded.** It means "vendor code" on the vendor table
  and "template key" on the templates table. Consider `template_slug` if the
  ambiguity bites.
- **No upload pipeline for media by default** — images/video are embedded by
  URL unless you wire S3 (`lib/upload.ts`).
- **Send pipeline is downstream.** This repo authors, stores, compiles, and
  serves bodies; delivery and variable substitution happen in a separate system
  that calls the body endpoint.

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **Vendor** | A tenant. Owns users, templates, branding, and variables. |
| **Trigger** | The event name a template responds to (e.g. `welcome`). The send-path key alongside `vendor_id`. |
| **Shell / chrome** | The header + footer HTML wrapped around a body. |
| **Final body** | Inbox-ready HTML: header + body + footer with document chrome stripped. |
| **Variable** | A `#TOKEN#` placeholder resolved at send time; global or vendor-scoped. |
| **ProseMirror JSON** | The editor's native document format; the source of truth. |
```
