# NCGCL Editorial Studio

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jamal715/ncgcl-editorial-studio)

Repository: https://github.com/jamal715/ncgcl-editorial-studio

The Supabase schema has been applied to the existing project. Hosting and first-time password setup remain pending. Cloudflare can import this repository from **Workers & Pages → Create application → Connect GitHub**. Use `npm run build` as the build command and `npm run deploy` as the deploy command. The button above may create a separate copy; use Connect GitHub to keep this exact repository as the source.

The Supabase URL is preconfigured. Add `SUPABASE_SERVICE_ROLE_KEY` and a new random `SETUP_TOKEN` privately in Cloudflare’s runtime secrets. Both are blank in the example file intentionally.

An independent, editor-managed studio that produces **NCGCL Brand & Formatting Instructions** to append to an existing assignment prompt in ChatGPT, Claude or Gemini.

The studio does not call an AI model, store assignment content or generate Word/PowerPoint files. It packages current institutional design rules, document-specific formatting and approved asset links into a self-contained text block. No model subscription or API key is needed to run the studio.

## What is included

- Team password and a separate editor password; both chosen privately at first setup.
- Ten initial document types, including concept notes, research notes/papers, credit proposals and presentations. Add, duplicate, rename, reorder or retire types from the editor.
- Optional title, author/team, date, confidentiality label and output format. No mandatory brief, audience or length field.
- Editable colours, typefaces, logo rules, page layout, tables, charts, header/footer wording and additional instructions.
- Upload/replace logos, references and templates, or use existing public HTTPS links. Scope each asset to every document or one document type.
- Save draft, preview instructions, publish with a change note, and restore any of the last 12 published versions into draft.
- Export/import settings. Passwords are never exported. File bytes must be backed up separately.
- Browser checks for changes every 10 seconds while visible and on window focus. Copy/download always requests the current published version directly from the server. No offline or stale fallback on copy.
- Concurrent saves are rejected rather than overwriting another editor session; the conflict message offers a download of unsaved edits.

## Supplied content and defaults

The initial public assets are the supplied colour and white NCGCL logo images, NCGCL Brand Guidelines v5 and the energy-transition benchmark PDF. The benchmark is linked to research notes, research papers and concept notes. Its content is a visual reference, not evidence to copy into unrelated assignments.

The palette and specified fonts come from the supplied brand material. Page dimensions, sizes and footer wording are explicitly labelled **proposed house defaults** for the editor to refine. Sharp Sans and Satoshi font binaries were not supplied; the block requires disclosure of an Arial fallback. Upload licensed fonts through the studio if appropriate. Uploaded brand/reference files retain their owners' rights; the code package does not grant a licence to redistribute third-party material.

The app interface uses system Arial. Document font instructions are independently editable.

## Run locally

Requires **Node.js 24 or later**. There are no runtime npm dependencies and no install step for local use.

```sh
npm run setup:local
npm start
```

Open `http://localhost:4173`. The setup command stores a private random key in `.data/setup-key`. Enter that key on the first-time setup page, then choose different team and editor passwords of at least 12 characters. This key is not a team password. Do not send passwords or keys in chat, commit them or include them in screenshots.

Local settings and uploads persist in `.data/`. Back up that directory if using the local server for ongoing development. Local storage is a development adapter and does not automatically transfer to the production database.

```sh
npm run check
npm test
```

## Deploy under your own accounts

The production target is **Cloudflare Workers with Static Assets**, plus **Supabase Postgres and Storage**. This is not a GitHub Pages application: the password gate, editor writes and shared state need a backend. The GitHub repository belongs to you; host all accounts under your control.

### 1. Repository

Create a dedicated repository, for example `ncgcl-editorial-studio`, and put this package at its root. A private repository is appropriate if you do not want to publish the source or supplied reference PDFs. The public file URLs remain intentionally public regardless of repository visibility.

Never commit `.data`, `.dev.vars`, `.env`, setup keys or database service credentials. They are excluded by `.gitignore`.

### 2. Database and asset bucket

Choose a Supabase project. A separate project makes ownership, quotas and backup easiest to understand; an existing project can work with the isolated `ncgcl_studio_` table names.

For this connected project, the schema is already installed. For a fresh deployment to a different project, run `supabase/schema.sql` in that project's SQL editor. It creates three tables, rate-limit/password functions and the `ncgcl-studio-assets` public bucket. It enables row-level security and grants no anonymous/authenticated table access. Only the server service role accesses records or writes files.

Keep the project URL and the **legacy service_role key** ready in your private hosting settings. This adapter currently uses that JWT key, rather than Supabase's newer secret-key format, for the server's Authorization header. Never expose it to the browser or place it in public JavaScript.

### 3. Cloudflare

The included `wrangler.jsonc` configures the Worker and public static assets. It has no account-specific identifiers or secrets.

Using the official Wrangler CLI (version 4.92.0 was used for the packaging dry run):

```sh
npx wrangler@4.92.0 login
npx wrangler@4.92.0 secret put SUPABASE_URL
npx wrangler@4.92.0 secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler@4.92.0 secret put SETUP_TOKEN
npx wrangler@4.92.0 deploy
```

`SETUP_TOKEN` must be a new cryptographically random secret, at least 32 characters. A password manager can generate and store one. Do not reuse a demonstration/local-test key. Secret prompts run in your own terminal; do not put literal secrets in source files or deployment commands. The Supabase URL is not confidential, but it is configured alongside the other runtime values.

If Wrangler asks to create the named Worker while setting a secret, use the Worker name in the included configuration. Alternatively create the Worker in your Cloudflare dashboard and add its runtime variables/secrets there. Cloudflare's Git integration can deploy subsequent repository changes; editor publications do **not** require code deployments.

### 4. First setup and launch checks

Visit the deployed HTTPS URL. The setup page requires the private `SETUP_TOKEN`. Choose your actual team/editor passwords there. Setup is rejected once ownership is established. Remove the setup secret from Cloudflare after successful setup; existing logins no longer use it.

Before distributing the team link:

1. Sign in as team in a separate browser session; confirm there is no Editor view.
2. As editor, save an obvious footer change to draft; confirm the team still sees the old footer.
3. Publish it; confirm the team updates within the next visible-tab check and Copy returns the new version immediately.
4. Upload and publish a replacement logo. Check its direct link in a signed-out browser and check that the old link still resolves.
5. Copy a prompt into each model you use. Check whether it can fetch the asset and create the requested output file. If not, download and attach the asset from Reference materials.
6. Confirm private tables cannot be read with a public/anonymous Supabase key and that browser network responses contain no service key or password hashes.
7. Check Cloudflare request/CPU metrics for login and publication under your expected usage, and Supabase quota usage.

The repository is populated and the schema has been provisioned in the selected Supabase project. Table RLS/grants, server-only function access and correct/incorrect password checks were verified against the live database. Hosting, runtime secret entry and the end-to-end production browser checks are pending.

## Costs and practical limits

The stack is designed for free tiers and has no AI API charges. Free hosting is a quota-limited service, not a promise of permanent zero-cost availability.

At the time of preparation, Cloudflare Workers Free lists 100,000 dynamic requests per day and 10 ms CPU time per invocation; static asset delivery is separate. Supabase Free lists 500 MB database storage, 1 GB file storage and 5 GB egress, and free projects may pause after inactivity. Verify the current account limits before launch. Do not enable a paid plan automatically.

A 10-second polling interval uses approximately 2,880 small checks per continuously visible 8-hour workday per person. Hidden tabs pause polling; polling requests return only version/revision metadata unless something changes. Large PDF downloads and repeated AI retrievals may consume file-delivery quota. New uploaded assets consume Supabase storage; bundled initial PDFs are served as Cloudflare static assets. Replaced files are deliberately retained so old prompts remain usable; removing a file from the draft is not deletion of the underlying public file.

Sources:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://supabase.com/pricing
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/buckets/creating-buckets

## What synchronisation means

Publishing atomically stores the entire standards set and its asset links. Team browsers observe the published version on the next check; the copy button always reads fresh server data. If the database is unreachable, copying fails visibly rather than silently using old instructions.

Previously pasted prompts, downloaded blocks and generated documents do not update retrospectively. Public links do not give the studio control of an external model. A model may lack browsing, download or file-creation tools, and may not follow every formatting instruction. The prompt explicitly requests successful retrieval, embedded assets, disclosure of limitations and attachment fallback. Prompt-only branding cannot guarantee pixel-identical Word, HTML and PowerPoint output. Deterministic templates/rendering could be a separate later phase.

## Security and ownership

- Real server-side password checks; there is no password embedded in the static page.
- Production password hashing runs in Postgres using bcrypt cost 12 over a SHA-256/base64 prehash, avoiding bcrypt's password-length truncation and keeping expensive password work outside the free Worker's CPU budget. Only the service role can call these functions. Local development uses PBKDF2-SHA256 with random salts and 100,000 iterations. Both enforce a long-password minimum and persisted attempt limits.
- Random 256-bit session cookies; stored session tokens are hashed. Cookies are HttpOnly, SameSite=Strict and Secure on HTTPS. Sessions expire after 8 hours.
- Password rotation revokes existing sessions for that role. Team/editor passwords must differ.
- Same-origin checks on mutations, restricted upload extensions/signatures, upload size limits and no SVG/HTML upload support.
- Editor drafts and history are protected. Asset bytes are public immediately upon upload, including before publication; do not upload confidential documents. Publication only controls whether the link is distributed in the branding block.
- This is shared-password access, not named-person audit logging. The publication log records versions/notes, not individual staff identities.
- Settings export contains links, not file binaries. Keep asset backups. Removing links does not revoke already-downloaded copies.

## Source map

| File | Responsibility |
|---|---|
| `public/app.js` | Team/editor interface, editing, publishing and sync |
| `public/prompt.js` | Portable prompt-block assembly |
| `public/style.css` | Responsive NCGCL interface |
| `server/core.mjs` | Authentication, validation and shared API behaviour |
| `server/seed.mjs` | First-setup standards and document catalogue |
| `server/worker.mjs` | Cloudflare entry point |
| `server/supabase.mjs` | Production Postgres/Storage adapter |
| `server/local.mjs`, `server/sqlite.mjs` | Local server and persistent development database |
| `supabase/schema.sql` | Production database bootstrap |
| `tests/studio.test.mjs` | Authentication, publication, concurrency and asset checks |

The production frontend needs only your own `/api/*` endpoints. Replacing the database/hosting adapter does not require rewriting the editor or prompt assembly.

## Verification completed for this package

Eight local backend tests passed, covering permissions/CSRF, draft isolation and fresh copy, concurrent writes, password revocation/logout, asset uploads, malformed settings/URLs, login throttling and model-independent prompt output. JavaScript syntax checks and the Cloudflare Worker bundling dry run passed. The sign-in page was rendered and visually checked in a browser. Live Supabase SQL, RLS/grants and password functions were subsequently verified when connecting this repository. Authenticated browser workflows and hosted model asset retrieval still require the launch checks above.

The large brand guide is stored in three binary source chunks under `asset-source/` to preserve the original file through the repository transfer. `npm run build`, `npm start` and `npm run deploy` automatically reassemble it and verify its SHA-256 checksum. The deployed PDF is byte-for-byte identical to the supplied file. Do not edit the chunks individually.
