# Deploying tonight's work to production

This covers what's needed to ship the WhatsApp integration (inbound/outbound
messaging, Conversations UI, Timeline linking) and the rebrand pass to the
live Hostinger VPS. It assumes you already know the general deploy flow
(`deploy.sh`, `docker-compose.yml`, `Caddyfile` at the repo root) — this is
the delta for *this* release, not a from-scratch runbook.

The live deployment directory on the VPS is `/root/leapcrm` (confirmed via
`docker compose ls` — that's the one backing the running `leapcrm` project,
not any other `docker-compose.yml` that might exist elsewhere on the box).
Run every `docker compose ...` command in this doc from there.

**Confirmed before writing this**: `https://leapcrm.tech/webhooks/whatsapp`
currently returns the frontend's `index.html` (falls through to the SPA
catch-all), not a WhatsApp response. The WhatsApp module has never been
deployed to production — its code is still sitting uncommitted locally (see
step 1). There is nothing to "fix" on the Meta side until after the deploy;
don't touch the Meta App Dashboard until step 4.

## 1. Get the work into git

Everything below is currently uncommitted in the working tree (`git status`
— ~87 modified files, ~30 new files/directories). Nothing has leaked into
git yet (`.env` files are confirmed gitignored and untracked).

1. Review the diff. Two things to specifically exclude from the commit:
   - Any `.po`/generated i18n catalog changes, if `lingui extract`/`compile`
     ever got run (per this repo's own CLAUDE.md — thousands of lines of
     unrelated churn). Check with
     `git status | grep -E "locales/(generated/)?.*\.(po|json)$"`.
   - Nothing else stray — the log files created during tonight's debugging
     (`.ngrok.log`, `.twenty-front.log`, `.upgrade-run.log`) have already
     been deleted.
2. Commit in whatever grouping makes sense for review (one commit is fine
   given this was one continuous feature). Do **not** add any AI-attribution
   trailer (CI rejects `@anthropic.com` co-author lines / "Generated with
   Claude Code" text — see CLAUDE.md).
3. Push `main`, then fast-forward `production`:
   ```bash
   git push origin main
   git checkout production
   git merge main   # should be a fast-forward — production has no divergent commits
   git push origin production
   ```

## 2. New environment variables

Four new config vars are read by the server (`config-variables.ts`) that
don't exist in `docker-compose.yml` or `.env.production.example` yet. Compose
only forwards env vars it explicitly lists under a service's `environment:`
block, so **without step 2a below, the container won't see these even if
they're in the VPS's `.env` file.**

| Variable | Sensitive? | Where it's used |
|---|---|---|
| `WHATSAPP_APP_ID` | No | Embedded Signup popup, app-level identification |
| `WHATSAPP_APP_SECRET` | **Yes** | HMAC verification of inbound webhook signatures |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | **Yes** | Meta's webhook GET handshake |
| `WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID` | No | Embedded Signup popup config |

Confirmed on the VPS: none of these currently exist anywhere in
`/root/leapcrm` (`docker compose exec server env | grep WHATSAPP` returns
nothing) — this is a clean first-time setup, not editing existing values.

Per-channel data (`phoneNumberId`, `accessToken`, `wabaId`) is **not** an env
var — it's written to the `WhatsappChannel` DB row per workspace when
someone connects WhatsApp via Settings → Accounts, through the Embedded
Signup OAuth flow. You don't set an access token in env for production.

Not required for this release (optional, safe to leave unset — the features
they gate simply no-op without them):
- `COMPANY_ENRICHMENT_BASE_URL`
- `WORKSPACE_LOGO_ENRICHMENT_BASE_URL`

### 2a. Add the vars to `docker-compose.yml`

Only the `server` service needs these — WhatsApp inbound/outbound processing
happens synchronously in the request path (webhook controller, GraphQL
resolver), not through the BullMQ queue, so `worker` doesn't need them.

Add to `services.server.environment` in `docker-compose.yml`:
```yaml
      WHATSAPP_APP_ID: ${WHATSAPP_APP_ID}
      WHATSAPP_APP_SECRET: ${WHATSAPP_APP_SECRET}
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: ${WHATSAPP_WEBHOOK_VERIFY_TOKEN}
      WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: ${WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID}
```

### 2b. Add the vars to `.env.production.example` (and the real `.env` on the VPS)

Append to `.env.production.example`:
```bash
# WhatsApp Business Platform (Meta) — one Meta app for this deployment.
# WHATSAPP_APP_ID and WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: from the Meta App
# Dashboard, App settings > Basic, and WhatsApp > Embedded Signup respectively.
WHATSAPP_APP_ID=replace_me
# App Secret, from the same Basic settings page. Never log or echo this.
WHATSAPP_APP_SECRET=replace_me
# A random shared secret you choose yourself (not from Meta) — paste the
# same value into the Meta webhook config's "Verify token" field in step 4.
# Generate with: openssl rand -hex 24
WHATSAPP_WEBHOOK_VERIFY_TOKEN=replace_me
WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID=replace_me
```

Then, on the VPS, in `/root/leapcrm`, edit the real `./.env` (not the
`.example` file) with real values:
- `WHATSAPP_APP_ID` / `WHATSAPP_APP_SECRET` / `WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID`:
  copy from the Meta App Dashboard.
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: generate one now (`openssl rand -hex 24`)
  — you'll paste this same value into Meta's dashboard in step 4, so keep it
  somewhere you can copy from.

## 3. Deploy

Standard flow, over SSH on the VPS, from `/root/leapcrm`:
```bash
cd /root/leapcrm
./deploy.sh
```
This checks out `production`, pulls, rebuilds the image, and does
`docker compose up -d --remove-orphans`.

What happens automatically on this boot (from
`packages/twenty-docker/twenty/entrypoint.sh`):
- `yarn command:prod upgrade` runs before the server starts accepting
  traffic. This applies every pending instance/workspace command, including
  the ones added tonight (`WhatsappChannel` core table, `CONVERSATIONS`
  widget-type enum, `SyncConversationStandardObjectsCommand`, and the
  Person → Conversations tab backfill) — across **every** workspace in the
  production database. No manual migration step is needed, unlike the local
  dev workaround used earlier tonight.
- This is synchronous and blocks the server's healthcheck from passing, so
  expect a longer-than-usual boot window on this specific deploy (schema
  changes across every workspace, not just one).

## 4. Point Meta's webhook at production (only now, after the deploy)

First confirm the route actually exists now:
```bash
curl -s "https://leapcrm.tech/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=x&hub.challenge=x"
```
Before the deploy this returned the frontend's HTML. After a successful
deploy it should return `{"message":"WhatsApp webhook verification
failed","error":"Forbidden","statusCode":403}` (403, because `x` isn't the
real token — that's the correct response, it means the route now exists).

Then, [Meta App Dashboard](https://developers.facebook.com/apps/) → your app
→ WhatsApp → Configuration →
- Callback URL: `https://leapcrm.tech/webhooks/whatsapp`
- Verify token: the value you generated for `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
  in step 2b

Click **Verify and save**.

## 5. Post-deploy checks

1. **Watch the upgrade run itself**, don't just wait for `docker compose logs
   --tail=100 server` (which `deploy.sh` runs once at the end and may miss
   it): `docker compose logs -f server | grep -i upgrade`. Confirm it
   reaches `Upgrade summary: N workspace(s) succeeded, 0 workspace(s)
   failed`. If any workspace fails, note its ID — mid-session tonight, one
   workspace failed on this exact command with `duplicate key value
   violates unique constraint "pg_type_typname_nsp_index"` (the conversation
   object already existed in a broken partial state there). If that recurs,
   re-run just that workspace once the instance-level steps have committed:
   `docker compose exec server node dist/command/command.js upgrade -w <workspaceId>`.
2. `curl -f https://leapcrm.tech/healthz` — confirm the server answers.
3. After step 4, send a real WhatsApp message to the connected business
   number and confirm it lands (`docker compose exec db psql -U postgres -d
   default -c "SELECT id, direction, body, \"createdAt\" FROM
   workspace_<schema>.\"conversationMessage\" ORDER BY \"createdAt\" DESC
   LIMIT 5;"` — get `<schema>` from `core.workspace.\"databaseSchema\"` for
   the workspace you're testing).
4. In the product UI: open a Person record with a phone number set, confirm
   the **Conversations** tab appears and the thread renders. Send a message
   from it, confirm it goes out and the reply comes back and appears on both
   the Conversations tab and the Person's Timeline.
5. Spot-check the rebrand: load the app and confirm no `twenty.com` links
   remain visible (dashboard "documentation" link, sign-in footer legal
   links, email templates). These were fixed in this release but haven't
   been checked against production before.

## 6. Known gaps — not blocking this deploy, but don't forget them

- **DPA content and legal placeholders.** `dpa-region-config.constant.ts`
  and the bulk `Twenty` → `LeapCRM` replacement in `dpa-template.constant.ts`
  / `subprocessors.json` contain `[TO BE CONFIRMED BY LEGAL]` placeholder
  text (entity name/address, governing law, signatory) per your own
  instruction to ship placeholders now and have legal review later. If any
  customer-facing flow surfaces the DPA (e.g. a "Download DPA" link in
  Settings), that flow is now live with placeholder legal text in it.
  Confirm with your legal team before anyone actually signs one.
- **`ENTERPRISE_API_URL`** in `config-variables.ts` still points at Twenty's
  own infrastructure — flagged earlier as a functional dependency, not yet
  addressed.
- **twenty-website** (the marketing/docs site) rebrand status was never
  confirmed in this session — untouched, not verified deployed.
- Five originally-seeded demo people (Brian Chesky, Dario Amodei, Patrick
  Collison, Dylan Field, Ivan Zhao) in the ACRA Demo workspace are
  soft-deleted (as of 2026-09-07, unrelated to this release) — recoverable
  if wanted, not otherwise relevant to production.

## 7. Rollback

If the deploy causes problems:
```bash
cd /root/leapcrm
git checkout production
git reset --hard <previous-good-commit>
git push origin production --force-with-lease
./deploy.sh
```
Note the `upgrade` command run by entrypoint.sh is forward-only — it does
not reverse workspace-command changes on rollback. If a bad migration
already ran against the production DB before you roll back the code, the
schema stays migrated even though the code reverts; each upgrade command in
`packages/twenty-server/src/database/commands/upgrade-version-command/`
does implement a `down()` for manual reversal if it comes to that, but this
hasn't been exercised — treat it as a last resort, not a rehearsed path.
