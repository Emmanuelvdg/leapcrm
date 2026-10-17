# Prospecting engine: repository audit

Phase 0 deliverable for the AI Prospecting and Qualification Engine. It records what the Leap CRM fork actually contains today, verified against the code, so the design builds on real services rather than upstream Twenty documentation.

Status: draft for review. Audited at commit `52ed7076b` (October 2026).

## 1. Method and baseline

- The fork has no shared git history with upstream Twenty. The first commit is `34d66be57 LeapCRM: initial commit`, and the server reports `TWENTY_CURRENT_VERSION = '2.33.0'` (`packages/twenty-server/src/engine/core-modules/upgrade/constants/twenty-current-version.constant.ts`). Upstream `main` is around 2.40.
- "Fork-only" labels below were checked by diffing against `upstream/main`. That diff over-reports anything upstream deleted after 2.33, so a label is only stated as fork-only where the evidence is clear.
- Runtime facts about production come from `docker-compose.yml`, `deploy.sh`, `Caddyfile` and the Dockerfile in this repo. No production database or API was queried for this audit.

Paths are relative to the repository root. `server/` means `packages/twenty-server/src/`.

## 2. Platform summary

| Area | Implementation |
| --- | --- |
| Monorepo | Nx with Yarn 4 (always `corepack yarn` on the maintainer's machine) |
| Backend | NestJS, TypeORM, PostgreSQL 16, Redis, GraphQL (core and metadata schemas), REST, MCP |
| Frontend | React 18, Jotai, Linaria, Vite, Lingui |
| Shared | `packages/twenty-shared` (types, enums, constants used by both sides) |
| Extension SDK | `packages/twenty-sdk`, `packages/twenty-client-sdk`, apps in `packages/twenty-apps` |
| Jobs | BullMQ on Redis, separate `worker` container |
| AI | Vercel AI SDK `ai@6` with 8 provider packages |
| Deploy | Single Hostinger VPS, `docker compose` (server, worker, postgres, redis, caddy), manual `deploy.sh` |

## 3. Compatibility matrix

Decision key: **Reuse** as is, **Extend** with new code inside the existing mechanism, **Build** new.

| Capability | Existing implementation | Decision | Evidence |
| --- | --- | --- | --- |
| Workspace isolation (records) | One Postgres schema per workspace, `workspace_<base36(id)>`. ORM resolves the workspace from AsyncLocalStorage. | Reuse | `server/engine/workspace-datasource/utils/get-workspace-schema-name.util.ts`, `server/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager.ts` |
| Workspace isolation (platform tables) | Shared `core` schema with a `workspaceId` column. Enforced in application code by `WorkspaceScopedRepository`; lint rules push its use. No Postgres row-level security. | Reuse, plus tests | `server/engine/workspace-manager/types/workspace-related-entity.ts`, `server/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository.ts`, `packages/twenty-oxlint-rules/rules/prefer-workspace-scoped-repository.ts` |
| Request auth context | Middleware validates the token, binds workspace, user, API key or application, and stores a typed `WorkspaceAuthContext`. | Reuse | `server/engine/middlewares/middleware.service.ts:119-183`, `server/engine/core-modules/auth/types/workspace-auth-context.type.ts` |
| Job tenant context | Jobs carry `workspaceId` in the payload and call `executeInWorkspaceContext(fn, buildSystemAuthContext(workspaceId))`. The queue explorer does not set the ORM context automatically. | Reuse (pattern) | `server/engine/twenty-orm/utils/build-system-auth-context.util.ts`, `server/engine/core-modules/message-queue/message-queue.explorer.ts:213-230` |
| Permission flags | Enum plus fixed UUID per flag, label definitions, seeding, front config. Compiler forces each new flag to be added everywhere. | Extend (new `PROSPECTING` flag) | `packages/twenty-shared/src/constants/PermissionFlagType.ts`, `SystemPermissionFlag.ts`, `server/engine/metadata-modules/permission-flag/constants/standard-permission-flag-definitions.constant.ts` |
| Object, field and row permissions | Object and field permissions per role; row-level predicates (enterprise entitlement only). | Reuse | `server/engine/metadata-modules/object-permission/`, `server/engine/metadata-modules/row-level-permission-predicate/` |
| Feature flags | `FeatureFlagKey` enum in shared, core `featureFlag` table, `FeatureFlagGuard` + `@RequireFeatureFlag` server side, `useIsFeatureEnabled` front side. A new key needs GraphQL codegen. | Extend (new `IS_PROSPECTING_ENABLED`) | `packages/twenty-shared/src/types/FeatureFlagKey.ts`, `server/engine/guards/feature-flag.guard.ts`, `packages/twenty-front/src/modules/workspace/hooks/useIsFeatureEnabled.ts` |
| Company, person, opportunity | Standard objects defined by metadata builders, not decorators. | Reuse (system of record) | `server/engine/workspace-manager/twenty-standard-application/utils/object-metadata/create-standard-flat-object-metadata.util.ts` (company L279, person L953, opportunity L911) |
| Lead object | Does not exist. | Do not assume; candidates are a new staging object | Search of `STANDARD_OBJECTS` in `packages/twenty-shared/src/metadata/constants/standard-object.constant.ts` |
| Tasks, notes, timeline | Standard objects `task`, `note`, `timelineActivity`. | Reuse for CRM activities | same builder file (task L992, note L836, timelineActivity L1067) |
| Fork-only standard objects | `conversation`, `conversationMessage`, `conversationParticipant`, backfilled to existing workspaces by a 2.33 workspace command. | Reuse as the precedent for new standard objects | `server/modules/conversation/standard-objects/`, `server/database/commands/upgrade-version-command/2-33/2-33-workspace-command-1789100000000-sync-conversation-standard-objects.command.ts` |
| Custom objects and fields at runtime | Metadata services build flat entities and run workspace migrations (raw DDL per workspace schema). Non-standard objects get a `_` table prefix. | Reuse (indirectly) | `server/engine/metadata-modules/object-metadata/object-metadata.service.ts` L450, `server/engine/workspace-manager/workspace-migration/` |
| Core tables | `@Entity({ schema: 'core' })` extending `WorkspaceRelatedEntity`, discovered by glob, created by generated "instance commands". Raw TypeORM migrations are frozen. | Extend (new operational tables) | `server/database/typeorm/core/core.datasource.ts` L45-54, `packages/twenty-server/docs/UPGRADE_COMMANDS.md`, precedent `server/engine/metadata-modules/whatsapp-channel/entities/whatsapp-channel.entity.ts` |
| Apps SDK | Apps can define objects, fields, logic functions (DB event, cron, HTTP route, tool, workflow action triggers), front components, views, nav items, roles, skills, agents. Apps cannot create core tables. | Not the host for the engine (see architecture) | `packages/twenty-shared/src/application/manifestType.ts`, `packages/twenty-sdk/src/sdk/define/index.ts`, fork apps in `packages/twenty-apps/internal/` |
| Background jobs | BullMQ 5.78, 17 queues in an enum, per-queue worker config (concurrency mostly 1), `@Processor`/`@Process`, `MessageQueueService.add` with `retryLimit`, `backoff`, `delay`. Default is no retry. | Extend (new `prospectingQueue`) | `server/engine/core-modules/message-queue/message-queue.constants.ts:5-23`, `message-queue-worker-config.constant.ts`, `drivers/bullmq.driver.ts:332-362` |
| Crons | `addCron` maps to BullMQ `upsertJobScheduler`; registered by `cron:register:all` from the entrypoint. | Reuse | `server/database/commands/cron-register-all.command.ts`, `packages/twenty-docker/twenty/entrypoint.sh` |
| Dead-letter handling | None. Failed jobs stay in Redis for 7 days; admin panel can list, retry and delete. | Build (job ledger with failed state) | `server/engine/core-modules/message-queue/drivers/bullmq.driver.ts:246-272`, `server/engine/core-modules/admin-panel/admin-panel-queue.service.ts` |
| Idempotency | Job `id` dedup only compares waiting jobs (a uuid is appended to every id). No outbox, no idempotency-key table. App-level status guards exist. | Build | `server/engine/core-modules/message-queue/drivers/bullmq.driver.ts:341,376-387` |
| Locks | Redis lock (`@WithLock`, `CacheLockService`) and Postgres advisory locks. | Reuse | `server/engine/core-modules/cache-lock/`, `server/database/typeorm/postgres-advisory-lock.service.ts` |
| Event bus | In-process `EventEmitter2`; ORM query builders emit `object.action` batch events right after execute. Events can fire before a surrounding transaction commits. | Reuse with care (no broad CRM triggers) | `server/engine/twenty-orm/repository/workspace-insert-query-builder.ts:231-273`, `server/engine/api/graphql/workspace-query-runner/listeners/entity-events-to-db.listener.ts` |
| Workflow engine | Actions include CODE, LOGIC_FUNCTION, SEND_EMAIL, DRAFT_EMAIL, CREATE_CALENDAR_EVENT, HTTP_REQUEST, MCP_TOOL_CALL, AI_AGENT, DELAY. Runs persisted in `workflowRun.state`; failed steps are not retried automatically. | Reuse for user automations only, not as the campaign engine | `server/modules/workflow/`, `packages/twenty-shared/src/workflow/types/WorkflowActionType.ts` |
| Rate limiting | Redis token bucket (read then write, can race). Used for API limits, workflows, logic functions, People Data Labs enrichment. | Reuse for soft limits; hard quotas need DB counters | `server/engine/core-modules/throttler/throttler.service.ts`, `server/engine/core-modules/company-enrichment/services/enrichment-throttle.service.ts` |
| AI model access | Model registry with built-in catalog, `AI_PROVIDERS` config and per-workspace providers (`core.workspaceAiProvider`, encrypted keys). | Reuse | `server/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service.ts`, `sdk-provider-factory.service.ts` |
| Structured output | `generateText({ output: Output.object(...) })` used for agent JSON responses; zod-based tool call repair. No `generateObject`. | Reuse (pattern) | `server/engine/metadata-modules/ai/ai-agent-execution/services/agent-async-executor.service.ts:505-557`, `server/engine/metadata-modules/ai/ai-agent/utils/repair-tool-call.util.ts` |
| Agents and tools | Agent entity (prompt, model, response format, web search toggle), role-scoped tool registry with 11 providers, step logs with usage and cost. No per-agent tool allowlist. | Reuse services, add explicit allowlists | `server/engine/metadata-modules/ai/ai-agent/entities/agent.entity.ts`, `server/engine/core-modules/tool-provider/services/tool-registry.service.ts` |
| MCP server | Hand-written JSON-RPC at `POST /mcp`, API key or OAuth, exposes a small meta-tool set that reaches the full registry. | Reuse (expose prospecting tools later) | `server/engine/api/mcp/controllers/mcp-core.controller.ts`, `server/engine/api/mcp/services/mcp-protocol.service.ts:194-278` |
| MCP client | Connects to external MCP servers (OAuth or API key), tools named per connection. Permission is all or nothing per `MCP_SERVERS` flag. | Reuse later for providers, with care | `server/engine/core-modules/mcp-connection/` |
| Web access | `http_request` tool with SSRF-safe agent (private ranges blocked after DNS); native web search for Anthropic, OpenAI, xAI; Exa app. No domain allowlist, no usage caps. | Reuse with budgets and caps | `server/engine/core-modules/secure-http-client/secure-http-client.service.ts`, `server/engine/metadata-modules/ai/ai-models/services/ai-model-config.service.ts:40-90`, `packages/twenty-apps/public/exa/` |
| AI cost metering | Per-step credit decrement and `USAGE_RECORDED` events. Credits only enforced when `IS_BILLING_ENABLED` (off in prod). Usage events go to ClickHouse, which prod does not run, so they are dropped. | Build (prospecting cost ledger) | `server/engine/metadata-modules/ai/ai-billing/services/ai-billing.service.ts`, `server/engine/core-modules/usage/listeners/usage-event.listener.ts` |
| Company enrichment | People Data Labs enrichment module with throttling; PDL and Exa apps exist. | Reuse as a candidate enrichment provider | `server/engine/core-modules/company-enrichment/`, `packages/twenty-apps/public/people-data-labs/` |
| Connected mail accounts | Core `connectedAccount` with encrypted tokens; Google and Microsoft OAuth; IMAP/SMTP/CalDAV. Gmail, Microsoft and calendar providers default to off; IMAP/SMTP defaults to on. | Reuse | `server/engine/metadata-modules/connected-account/entities/connected-account.entity.ts`, config variables in `server/engine/core-modules/twenty-config/config-variables.ts` |
| Sending from a rep mailbox | `sendEmail` mutation, AI tool and workflow action. Dispatch via Gmail API, Microsoft Graph or SMTP; sent mail is persisted to message tables. No custom headers, no suppression check, no scheduling. | Extend (Phase 4) | `server/modules/messaging/message-outbound-manager/`, `server/engine/core-modules/tool/tools/email-tool/email-composer.service.ts:336-450` |
| Domain sending and campaigns | `messageCampaign`, `messageList`, per-recipient statuses, SES/Resend/LOG drivers, behind `IS_EMAIL_GROUP_ENABLED`. | Reuse selectively (suppression, unsubscribe); not the cold outreach path | `server/modules/emailing/`, `server/engine/core-modules/emailing-domain/` |
| Suppression and unsubscribe | Core `messageSuppression` (BOUNCE, COMPLAINT, UNSUBSCRIBE), signed unsubscribe tokens, one-click `List-Unsubscribe` headers, unsubscribe controller. Only applied on the SES/Resend path. | Extend to the rep-mailbox path | `server/engine/core-modules/emailing-domain/message-suppression.entity.ts`, `server/engine/core-modules/emailing-domain/services/unsubscribe-content.service.ts`, `server/modules/emailing/controllers/unsubscribe.controller.ts` |
| Bounces and complaints | Webhooks for SES and Resend only. No DSN parsing for Gmail, Microsoft or SMTP sends. | Build (Phase 4) | `server/modules/messaging-webhooks/messaging-webhooks.controller.ts` |
| Inbound sync and threading | Message import crons (every 1 to 5 minutes), provider thread ids, `headerMessageId` dedup, participant to person matching. | Reuse | `server/modules/messaging/message-import-manager/`, `server/modules/match-participant/match-participant.service.ts` |
| Reply detection | No reply event. `message.created` DB events fire but nothing listens on `message`. A reply must be derived: incoming message in a thread that contains our outgoing message. | Build (Phase 4) | `server/engine/twenty-orm/repository/workspace-insert-query-builder.ts:262` |
| Calendar and meetings | Calendar sync; `createCalendarEvent` with invitations and conferencing. No availability or booking slots. | Reuse event creation; booking is out of MVP | `server/modules/calendar/calendar-event-creation-manager/` |
| Credential storage | `SecretEncryptionService` (`enc:v2`, AES-256-GCM, per-workspace HKDF key) plus DB CHECK constraints. | Reuse for provider credentials | `server/engine/core-modules/secret-encryption/`, `server/engine/metadata-modules/whatsapp-channel/services/whatsapp-channel-token-encryption.service.ts` |
| Frontend extension | Signed-in routes in `useCreateWorkspaceAppRouter`; generic record index and show pages render any object; nav sections driven by navigation-menu-item metadata; page layouts. | Reuse generic record pages; add custom pages where needed | `packages/twenty-front/src/modules/app/hooks/useCreateWorkspaceAppRouter.tsx`, `packages/twenty-front/src/pages/object-record/RecordIndexPage.tsx`, `RecordShowPage.tsx` |
| Testing | Jest unit tests per package; server integration tests on a reset seeded DB with fixed tokens; Storybook tests; Playwright e2e. Two seeded workspaces (Apple, YCombinator) but no cross-tenant isolation suite. | Reuse, add tenant isolation tests | `packages/twenty-server/jest-integration.config.ts`, `packages/twenty-server/test/integration/`, `server/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant.ts` |
| Deployment | Manual `deploy.sh`; entrypoint runs `upgrade` then `cron:register:all`; an upgrade failure only logs a warning. Redis has no volume. | Reuse; harden Redis | `docker-compose.yml`, `deploy.sh`, `packages/twenty-docker/twenty/entrypoint.sh` |

## 4. MCP tool inventory

Derived from code. The live list depends on the caller's role and installed apps, so no fixed total exists.

The MCP endpoint exposes a fixed set of meta-tools (`server/engine/api/mcp/services/mcp-protocol.service.ts:194-278`): `search_help_center`, `get_tool_catalog`, `learn_tools`, `execute_tool`, `load_skills`, `list_skills`, `list_object_metadata_names`. The rest of the registry is reached through `get_tool_catalog` and `execute_tool`. `MCP_EXCLUDED_TOOL_NAMES` blocks `code_interpreter`, `http_request`, `extract_json_paths` and `search_output` from MCP.

Registry categories (`server/engine/core-modules/tool-provider/`):

| Category | Gate | Tools |
| --- | --- | --- |
| DATABASE_CRUD | Object permissions | Per object: `find_many_<plural>`, `find_one_<singular>`, `group_by_<plural>`, `create_one_`, `create_many_`, `update_one_`, `update_many_`, `upsert_many_`, `delete_one_`, `delete_many_`. Up to 10 per object. |
| ACTION | Tool permission flags for email, calendar, HTTP and code | `http_request`, `send_email`, `draft_email`, `create_calendar_event`, `search_help_center`, `navigate_app`, `extract_json_paths`, `search_output`, `save_campaign`, `code_interpreter` |
| METADATA | `DATA_MODEL` | object and field metadata CRUD, `create_many_relation_fields` |
| VIEW | `VIEWS` for writes | view, view field, filter and sort CRUD |
| DASHBOARD | `LAYOUTS` | dashboard and widget tools |
| WORKFLOW | `WORKFLOWS` | 22 tools in `server/modules/workflow/workflow-tools/tools/` |
| ROLE | `ROLES` | role CRUD, assignment, object and row-level permission tools |
| WEBHOOK | `API_KEYS_AND_WEBHOOKS` | webhook CRUD |
| NAVIGATION_MENU_ITEM | none | navigation menu item CRUD |
| LOGIC_FUNCTION | none (gap) | `app_<function>` for every app function with a tool trigger, for example `app_exa_web_search`, `app_enrich_company`, `app_enrich_person` |
| MCP_SERVER | `MCP_SERVERS` | tools from connected external servers, named `<slug>_<tool>_<id8>` |

To capture the runtime list for a given workspace, call `tools/list` and then `get_tool_catalog` on `https://<workspace>.leapcrm.tech/mcp` with that workspace's API key.

## 5. Gaps and risks

1. **No outbox, events before commit.** ORM events are emitted right after `execute()`, not after commit, and enqueueing to Redis is not transactional. Prospecting must not rely on CRM events for its own state changes.
2. **Job dedup is weak.** BullMQ ids get a fresh uuid; dedup only checks waiting jobs. Idempotency needs a database ledger with unique keys.
3. **Redis is not persisted in production.** A recreated `redis` container loses queued and delayed jobs, including workflow DELAY steps. A database ledger plus a reconciler makes this recoverable; a Redis volume with AOF reduces it.
4. **No dead-letter queue.** Failures are only visible in the admin panel queue view.
5. **Rep-mailbox sending has no compliance controls.** No suppression check, no unsubscribe header (custom headers are not supported), no rate limit, no bounce parsing.
6. **Gmail and Microsoft sending are off in production.** Provider flags default to false and the maintainer has deferred Google and Microsoft sign-in. IMAP/SMTP accounts are available.
7. **Usage events are dropped in production.** No ClickHouse, so `USAGE_RECORDED` goes nowhere and AI credits are not enforced (`IS_BILLING_ENABLED` off).
8. **App logic functions run unsandboxed.** `LOGIC_FUNCTION_TYPE=LOCAL` in production runs app code in a child process on the host. The engine should not depend on app logic functions for core execution.
9. **Tool permission gaps.** No per-agent tool allowlist; app logic-function tools and some action tools are ungated; external MCP tools are all or nothing.
10. **No cross-tenant test suite.** Isolation is enforced in code but not covered by a dedicated test.
11. **Upgrade failures do not stop the server.** A failed instance command only logs a warning. New instance commands added to the 2.33.0 folder are skipped in production because 2.33 workspace commands already ran; they must be applied with `yarn command:prod run-instance-commands`.
12. **Web search is uncapped.** Native web search has no `maxUses` or domain filter, so research cost must be bounded by the engine.

## 6. Open questions

- Licence terms, refresh cadence and API limits for each candidate public source (GLEIF, Wikidata, national registries such as ACRA and Companies House, OpenCorporates, OpenStreetMap, search APIs). None were verified in this audit.
- Whether workflow database-event triggers can target the `message` object (relevant to reply detection).
- The production workspace "test-account" shows UEN, SSIC code, incorporation date and registration status on companies. These are not defined in code, so they are probably custom fields in that workspace. Confirm before relying on them.
- Whether the upstream enterprise billing module works without an `ENTERPRISE_KEY`, if it is ever needed for metering.
