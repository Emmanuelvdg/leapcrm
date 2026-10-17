# Prospecting engine: architecture proposal

Phase 0 deliverable. Builds on `REPOSITORY_AUDIT.md`. Decisions marked **Needs approval** are listed again in `IMPLEMENTATION_PLAN.md`.

Status: draft for review. Nothing here is implemented yet.

## 1. Summary of decisions

1. **Placement: a core server module plus fork standard objects**, the same pattern as the fork's `conversation` and WhatsApp work. Not a Twenty app. (**Needs approval**)
2. **User-facing records are workspace objects.** Campaigns and candidates (later evidence, contacts, enrollments) live in each workspace's own schema, so they inherit per-workspace isolation, object permissions, views and the generic record pages.
3. **Operational state is core tables.** A job ledger (and later a usage ledger and provider credentials) in the `core` schema with `workspaceId`, because it needs atomic claims, unique idempotency keys and a cross-workspace reconciler.
4. **Execution on the existing BullMQ worker**, with the Postgres job ledger as the source of truth. No Temporal, no new queue technology. Redis already exists. (Redis persistence: **Needs approval**)
5. **Deterministic first.** Discovery, identity resolution, state transitions, budgets and (later) policy and sending are plain services. AI is only used for ICP drafting in Phase 1 and for research and writing from Phase 2.
6. **Discovery is multi-market.** Any public source whose terms permit commercial use can be a provider: global datasets, national company registries, web search and customer data. Providers declare the markets they cover, and the engine is not tied to one country. Outreach eligibility stays jurisdiction-specific (section 9).
7. **Gated** by a new feature flag `IS_PROSPECTING_ENABLED` and a new permission flag `PROSPECTING`. (**Needs approval**)
8. **A hidden, shared company directory and network signal across tenants.** Company-level facts from public sources are stored once in an instance-wide directory, and every company a tenant qualifies adds an anonymised contribution to a network signal. New campaigns for any tenant draw on both through a hidden internal provider. Tenants never see or query the directory; its matches arrive as ordinary candidates credited to their real public sources plus a generic "Leap insight" marker. Tenant-specific data stays in the tenant's workspace. This is a deliberate, narrow exception to per-workspace scoping (section 7.5). (Approved by the product owner, no tenant opt-out; customer terms must be updated before the network signal goes live.)

## 2. Why not a Twenty app

Apps are the fork's usual extension mechanism (Deal health, Data hygiene, Last contact), and an app would give per-workspace installation for free. It is the wrong host for this engine:

- Apps cannot create core tables (`packages/twenty-shared/src/application/manifestType.ts`), so there is no place for a job ledger, idempotency keys or a usage ledger with transactional guarantees.
- App logic functions run unsandboxed in a child process on the production host (`LOGIC_FUNCTION_TYPE=LOCAL`), with a 900 second limit and a per-workspace throttle. Long campaigns, provider calls and outbound sending need tighter control than that.
- The engine needs direct access to server services the SDK does not expose: the AI model registry and billing, the outbound mail pipeline, the suppression service, the secure HTTP client and the encryption service.

Apps remain useful later for optional, per-tenant add-ons, for example an extra discovery provider exposed as a tool.

## 3. Module layout

```
packages/twenty-shared/src/
  metadata/constants/standard-object.constant.ts      # add prospectingCampaign, prospectCandidate ids
  types/FeatureFlagKey.ts                              # IS_PROSPECTING_ENABLED
  constants/PermissionFlagType.ts, SystemPermissionFlag.ts   # PROSPECTING

packages/twenty-server/src/
  modules/prospecting/
    prospecting.module.ts
    standard-objects/                  # type classes for the new workspace objects
    campaign/                          # campaign service, campaign state machine
    candidate/                         # candidate lifecycle state machine and service
    discovery/
      providers/                       # DiscoveryProvider interface, registry, adapters
      services/                        # discovery orchestration
      jobs/                            # discovery job processor
    identity-resolution/               # normalisers and matcher
    icp/                               # ICP schema (zod) and ICP drafting service
    resolvers/                         # custom mutations (start, cancel, import)
    crons/                             # ledger reconciler
  engine/core-modules/prospecting-job/ # core entity + ledger service (core tables must live under
                                       # engine/core-modules or engine/metadata-modules to be discovered)
  engine/workspace-manager/twenty-standard-application/utils/...   # metadata builders for the new objects
  database/commands/upgrade-version-command/2-33/                  # instance command (core table) and
                                                                   # workspace command (sync new objects)

packages/twenty-front/src/modules/prospecting/
  components/ hooks/ graphql/         # campaign actions, import dialog, discovery status
```

Folder and file naming follow the adjacent code in each area.

## 4. Data model

### 4.1 Phase 1 workspace objects

**`prospectingCampaign`** (label identifier `name`)

| Field | Type | Notes |
| --- | --- | --- |
| name | text | |
| objective | text | Natural-language goal, optional |
| status | select | DRAFT, RUNNING, PAUSED, COMPLETED, CANCELLED, FAILED |
| targetGeographies | array | ISO country codes, optionally with regions; any market |
| targetIndustries | array | Free-text industry labels |
| industryCodes | array | SSIC codes where known |
| employeeCountMin, employeeCountMax | number | Optional; many sources will not have it |
| keywords | array | |
| discoverySources | multi-select | Provider ids enabled for this campaign |
| targetCandidateCount | number | Stop condition and budget guard |
| icp | raw JSON | Versioned ICP document validated by a zod schema (inclusion and exclusion rules, personas, scoring weights for Phase 2) |
| icpVersion | number | Incremented on every ICP change |
| lastRunAt | date time | |
| candidates | relation | One-to-many to `prospectCandidate` |

Phase 1 keeps the ICP inside the campaign. A separate reusable ICP object is deferred until campaigns need to share one.

**`prospectCandidate`** (label identifier `name`)

| Field | Type | Notes |
| --- | --- | --- |
| name | text | Company name as returned by the source |
| domain | links | Canonical domain when known |
| registrationNumber | text | Registry id in its home jurisdiction (UEN, Companies House number, SIREN, ABN, ...) |
| registrationAuthority | text | Which registry issued `registrationNumber`, so ids from different countries never collide |
| lei | text | Legal Entity Identifier when known; the one id that is valid across markets |
| country, region | text | |
| industry, industryCode | text | |
| employeeCount | number | Null when unknown, never estimated |
| description | text | Source-provided only |
| lifecycleStage | select | See section 5 |
| matchStatus | select | CONFIRMED_MATCH, PROBABLE_MATCH, DISTINCT, INSUFFICIENT_INFORMATION |
| identityKey | text | Deterministic key, unique per campaign (for example `lei:5493001KJTIIGC8Y1R12`, `reg:SG:201912345K`, `reg:GB:01234567`, `domain:acme.com.sg`) |
| sources | raw JSON | List of `{ providerId, externalId, sourceUrl, discoveredAt }` |
| attributes | raw JSON | Normalised provider attributes; raw payloads are not stored |
| campaign | relation | Many-to-one to `prospectingCampaign` |
| matchedCompany | relation | Many-to-one to `company`, set when an existing CRM company matches; never created automatically |
| globalCompanyId | uuid (text) | Reference to the shared directory entry (section 7.5); not a foreign key because it crosses schemas |

Composite uniqueness on `(campaign, identityKey)` is the target. Whether standard index metadata supports a composite unique index on a relation column must be confirmed in milestone 1.2; if not, uniqueness is enforced by the job ledger plus a lookup inside the discovery transaction.

### 4.2 Phase 1 core table

**`core.prospectingJob`** (extends `WorkspaceRelatedEntity`)

| Column | Notes |
| --- | --- |
| id, workspaceId | `workspaceId` FK to `core.workspace`, cascade delete |
| campaignId, candidateId | uuid references into the workspace schema (not FKs, different schema) |
| operation | `DISCOVER_PAGE`, `RESOLVE_CANDIDATE`, later `RESEARCH`, `SEND`, ... |
| idempotencyKey | Unique together with `workspaceId`. Format `campaignId:operation:target:version` |
| status | PENDING, RUNNING, SUCCEEDED, FAILED, DEAD, CANCELLED |
| attempts, maxAttempts, nextRunAt | Exponential backoff schedule |
| lockedAt, lockedBy | Lease for the running worker |
| input, result | jsonb, small; cursors and counters only |
| lastErrorCode, lastErrorMessage | Redacted, no personal data |
| correlationId | Carried into logs |
| createdAt, updatedAt | |

Indexes: `(status, nextRunAt)` for the reconciler, `(workspaceId, campaignId)`, unique `(workspaceId, idempotencyKey)`.

### 4.3 Phase 1 shared directory tables

These are instance-wide and have **no** `workspaceId`. Rules for what may be written are in section 7.5.

**`core.globalCompany`**: id, name, normalisedName, country, region, canonicalDomain, lei, registrationAuthority, registrationNumber, industry, industryCode, industryCodeScheme, employeeCount, status (active, dissolved, unknown), firstSeenAt, lastVerifiedAt, createdAt, updatedAt. Unique indexes on `lei`, on `(registrationAuthority, registrationNumber)` and on `(canonicalDomain, country)`, each where not null.

**`core.globalCompanySource`**: id, globalCompanyId, providerId, externalId, sourceUrl, licence, retrievedAt, fieldsProvided (which fields this source supplied). Unique on `(providerId, externalId)`. This keeps per-field provenance so a value can always be traced to a public source and removed if that source's terms change.

From Phase 2, **`core.globalCompanyEvidence`** holds ICP-independent research facts (what the company does, products, markets served, size evidence, public announcements), each with a public source URL, retrieval date, confidence and verification status, and **`core.globalCompanyQualification`** holds the anonymised network contributions described in section 7.5.

### 4.4 Later phases (outline)

| Phase | Workspace objects | Core tables |
| --- | --- | --- |
| 2 | `researchEvidence`, `prospectSignal`; score, confidence and explanation fields on `prospectCandidate` | `prospectingUsage` (provider and AI cost ledger), `prospectingAgentExecution` |
| 3 | `prospectContact`, `outreachSequence`, `outreachEnrollment`, `outreachMessage` (with approval status) | `prospectingContactPolicy` decisions, provider credentials (encrypted) |
| 4 | delivery and reply fields on `outreachMessage` | send intent records in the job ledger |

`LeadScore` from the spec becomes score fields plus a JSON explanation on the candidate and contact, with history kept in evidence and job results, rather than a separate object.

## 5. State machines

### 5.1 Candidate lifecycle

Phase 1 uses `DISCOVERED`, `HUMAN_REVIEW`, `DISQUALIFIED`, `INSUFFICIENT_EVIDENCE` and `CANCELLED`. The full set from the spec is defined up front so later phases only add transitions.

```
DISCOVERED -> RESEARCHING -> QUALIFIED -> CONTACT_RESEARCH -> READY_FOR_REVIEW
  -> APPROVED -> READY_FOR_OUTREACH -> ACTIVE_OUTREACH -> ENGAGED -> MEETING_BOOKED -> HANDED_OFF
```

Side states: `DISQUALIFIED`, `INSUFFICIENT_EVIDENCE`, `HUMAN_REVIEW`, `SUPPRESSED`, `NURTURE`, `FAILED`, `CANCELLED`.

The transition table is a typed constant (`from -> allowed to[]`) in `modules/prospecting/candidate/`. A single service method performs every transition and rejects anything not in the table. Lifecycle stage stays separate from score, approval, policy status and delivery status, which are their own fields.

### 5.2 Campaign status

`DRAFT -> RUNNING`, `RUNNING <-> PAUSED`, `RUNNING -> COMPLETED | FAILED`, and any non-terminal state to `CANCELLED`. Same pattern: typed table plus one transition method.

## 6. Durable execution

The ledger row, not the Redis job, is the unit of work.

1. **Create**: insert a ledger row with `ON CONFLICT (workspaceId, idempotencyKey) DO NOTHING`. Only when a row was inserted, enqueue a BullMQ job on a new `prospectingQueue` carrying the ledger id and `workspaceId`.
2. **Claim**: the processor runs `UPDATE ... SET status = 'RUNNING', lockedAt = now(), attempts = attempts + 1 WHERE id = $1 AND status = 'PENDING' AND nextRunAt <= now() RETURNING *`. Zero rows means a duplicate delivery or a cancelled job, and the processor exits.
3. **Run** inside `executeInWorkspaceContext(..., buildSystemAuthContext(workspaceId))`. The processor re-reads the campaign and stops if it is no longer `RUNNING`.
4. **Finish**: mark `SUCCEEDED` and insert follow-up rows (for example the next discovery page) in the same transaction. On error, set `nextRunAt` with exponential backoff and jitter and return to `PENDING`, or `DEAD` after `maxAttempts`.
5. **Reconcile**: a cron every minute re-enqueues `PENDING` rows whose `nextRunAt` has passed and resets `RUNNING` rows whose lease expired. This also recovers from Redis losing jobs.

Every operation must be safe to repeat. External side effects that cannot be repeated (sending email, from Phase 4) get their own intent record with a `SENDING` state so a crash between the provider call and the result write is reconciled by checking the provider (for example the sent folder by Message-ID) rather than resending.

Limits: queue concurrency from the worker config, a per-workspace cap on `RUNNING` rows checked at claim time, provider rate limits through the existing throttler for soft limits, and ledger counts for hard caps.

## 7. Discovery

### 7.1 Provider interface

```ts
export type DiscoveryProvider = {
  id: string;
  getCapabilities: () => DiscoveryCapabilities;
  search: (
    request: DiscoveryRequest,
    context: ProspectingExecutionContext,
  ) => Promise<DiscoveryPage>;
};
```

`DiscoveryPage` returns normalised `CompanyDiscoveryRecord`s plus an opaque `nextCursor`. Records keep unknown fields as `null`. Providers are plain Nest providers registered in a provider registry keyed by id, so adding one does not touch the orchestration.

`DiscoveryCapabilities` declares, per provider:

- `markets`: ISO country codes covered, or `GLOBAL`.
- `filters`: which request fields it honours (industry codes and which scheme, keywords, size, status, location).
- `fields`: which record fields it can return (website, size, registration id, LEI, description).
- `costModel`: free, metered per request or per record, and the unit price for the usage ledger.
- `licence`: the licence id and any attribution or share-alike obligation, shown in the source list and stored with each record's provenance.
- `requiresCredential`: whether a workspace or instance API key is needed.

### 7.2 Provider selection

For each campaign the planner picks providers whose `markets` cover the campaign's `targetGeographies` and whose `filters` cover its criteria, preferring free and higher-precision sources first (registry and global identifiers), then search. The user sees and can change the selection before starting. In Phase 1 this is deterministic; from Phase 2 the discovery planning service can suggest queries and source mixes, but every candidate still comes from a provider response.

### 7.3 Provider catalogue

Any public source can become a provider if three checks pass: its terms allow commercial use and automated retrieval, access is through an official API or published bulk download (no scraping around access controls), and only company-level data is kept at discovery time.

| Tier | Source | Markets | Notes |
| --- | --- | --- | --- |
| Customer data | `customer-import` (CSV or paste through the spreadsheet import UI) | Any | No external terms |
| Global identifiers | GLEIF LEI records (API and golden copy files) | Global | Legal name, jurisdiction, registration authority and id, addresses; licence believed CC0 |
| Global open knowledge | Wikidata (SPARQL) | Global | Industry, country, website, employee count where recorded; licence believed CC0; coverage skews to larger companies |
| National registries | Singapore ACRA (data.gov.sg), UK Companies House, France SIRENE, Australia ABN Lookup, New Zealand Companies Office, Norway Brønnøysund, and others | One market each | Usually free with a key; each needs its own adapter, legal-suffix rules and registration id format |
| Aggregated registries | OpenCorporates | Many jurisdictions | Broad coverage; commercial use needs a paid licence and the data carries attribution and share-alike terms |
| Public company filings | SEC EDGAR and similar | Listed companies | Free; strong for larger targets |
| Places and listings | OpenStreetMap (Overpass or extracts) | Global | Small and local businesses with websites; open data licence with share-alike and strict API usage limits, so extracts are preferred |
| Web search | A search API (the existing Exa app, or another provider) | Global | Finds companies by description; metered; results become candidates only after a website or registry record confirms them |
| Test | `fixture` | Any | Deterministic records for tests and local development |
| Internal | `leap-network` (from Phase 2) | Any | Hidden provider over the shared directory, ranked by the network qualification signal (section 7.5); never named to tenants |

Licences and terms in this table are from general knowledge and must be confirmed per source before its adapter ships. Registry data rarely has websites, employee counts or contacts, so those fields come from other providers or Phase 2 research, never from guesses.

### 7.4 Identity resolution

Deterministic, in `modules/prospecting/identity-resolution/`:

- **Normalisers**: registration number per authority (trim, upper case, authority-specific format checks), LEI (ISO 17442 checksum), canonical domain (scheme, `www.` and path removed, lower case, punycode), company name (case folded, punctuation and diacritics normalised, whitespace collapsed, legal suffixes stripped using a per-country table, for example `PTE LTD` and `PRIVATE LIMITED` in Singapore, `LTD` and `PLC` in the UK, `SAS` and `SARL` in France, `PTY LTD` in Australia, `GMBH` in Germany).
- **Outcomes**:
  - `CONFIRMED_MATCH`: same LEI, same registration number from the same authority, or same canonical domain and same country.
  - `PROBABLE_MATCH`: same normalised name and country with no conflicting registration number or domain. Goes to `HUMAN_REVIEW`.
  - `DISTINCT`: no match.
  - `INSUFFICIENT_INFORMATION`: name only, with nothing to compare.
- Names alone never cause an automatic merge.
- Scope: the shared directory (link `globalCompanyId`), other candidates in the same campaign (merge sources into one candidate), and existing CRM companies in the workspace (link `matchedCompany`, never create a company).

### 7.5 Shared company directory

Purpose: when one tenant's campaign discovers or researches a company from public sources, the facts are stored once and every tenant benefits. Later campaigns check the directory before calling providers, which cuts provider and AI cost and improves coverage over time.

**What may be written to the directory**

- Company-level facts that came from a public provider response (GLEIF, Wikidata, registries, filings, listings, search results confirmed by a website or registry record), with the source, licence and retrieval date.
- From Phase 2, ICP-independent research facts derived only from public sources, each with a public source URL.

**What never leaves the tenant's workspace**

- Customer-imported rows and anything derived only from them. A tenant's own list is confidential, and imported data is unverified, so it could otherwise be used to plant fake companies in the shared directory.
- Individual ICP fit scores, qualification decisions, priorities, campaign membership, timing and any notes. Only the anonymised, thresholded network signal described below is derived from qualification outcomes.
- Contacts and any personal data. Sharing personal data across tenants raises controller and lawful-basis questions in most jurisdictions, so the directory is company-level only unless this is separately approved.
- Outreach activity, replies and engagement.
- Data from sources whose terms forbid redistribution or impose share-alike obligations, until those terms are reviewed.

**Hidden from tenants**

- The directory is internal infrastructure, not a product feature. No UI, core or metadata GraphQL field, REST route, MCP tool or app SDK surface exposes it, and it does not appear in the data model settings.
- It is used as an internal discovery and research source: matches appear to tenants as ordinary candidates, credited to the original public source (for example "GLEIF" or "Companies House"), never as "shared" or "from another customer".
- Only instance operators can inspect, re-verify or quarantine entries, through the admin panel behind `AdminPanelGuard`.
- Hidden in the product does not mean undisclosed: the terms of service and privacy policy still describe the storage and reuse of public company information.

**How it works**

- Discovery and research write public facts through a single `GlobalCompanyDirectoryService`. It upserts by LEI, by registration authority and number, or by domain and country, merges new sources into existing entries, and never overwrites a field with a lower-confidence or older value.
- Every read from a tenant goes through the same service and returns directory fields only. There is no API that lists which tenants hold a given company.
- Tenants never edit directory entries directly. A tenant's corrections stay on its own candidate and company records. Directory entries can be re-verified from their sources and quarantined by an operator.
- Directory entries carry `lastVerifiedAt`, and stale entries are refreshed from their sources before reuse in a new campaign when a freshness window is exceeded.

**Network qualification signal (from Phase 2)**

Every tenant runs its own prospecting. When a tenant qualifies a company, the platform records an anonymised contribution so that future campaigns, for any tenant, can start from companies the network has already found worth pursuing.

- Each qualification writes one row to `core.globalCompanyQualification`: `globalCompanyId`, `contributorKey` (an HMAC of the workspace id with a server-side secret, so contributions can be counted per tenant without storing the workspace id), `marketSegment` (country plus industry code bucket), `qualifiedMonth`, and nothing else. No score, no ICP, no campaign, no contact, no timing finer than a month.
- The signal for a company is the number of distinct contributors per segment. It is only used once it reaches a minimum of distinct contributors (default 3) and once the latest contribution is older than a lag window (default 30 days). Both are instance configuration. This stops a single tenant's pipeline from being exposed to a competitor in the same niche.
- An internal `leap-network` discovery provider returns directory companies that match the campaign's public criteria (country, industry, size) and pass the threshold, ranked by the signal. It is selected automatically like any other provider and never listed by name to tenants.
- Candidates found this way show their facts credited to the real public sources, plus a generic "Leap insight" marker. Provenance is never falsified.
- A tenant's own existing CRM companies and customer-imported rows are never contributed; only companies qualified inside a prospecting campaign from public-source data are.
- When a workspace is deleted, its contributions are deleted (the HMAC lets the platform find them).

**Product and legal prerequisites**

- Contributing to the directory and the network signal is not optional for tenants (product decision).
- The terms of service, privacy policy and data processing agreement must permit storing public company information and using de-identified, aggregated qualification data across customers to improve the service. The wording does not need to describe the mechanism. This must be in place before the network signal is enabled in production (**Needs legal review**).
- Deletion: a directory entry is removed when all of its sources are removed or their terms no longer permit storage.

## 8. AI services

Phase 1 has one optional AI step: drafting a structured ICP from the campaign objective.

- Model access through `AiModelRegistryService` with the workspace's configured providers.
- Structured output with `generateText({ output: Output.object({ schema }) })` and a zod schema shared with the campaign `icp` validation, following `agent-async-executor.service.ts`. Invalid output is rejected, never patched by hand.
- The draft is shown to the user, who can edit it before the campaign starts. The model never produces companies.

From Phase 2, research and writing services follow the same rules:

- Each service has an explicit tool allowlist rather than inheriting a role's full registry.
- Retrieved web content is passed as quoted, delimited data with an instruction that it is untrusted. Outputs that would trigger actions are validated by deterministic code.
- Every material claim must reference an evidence id; claims without evidence are dropped.
- Each call is recorded in `prospectingAgentExecution` (model, tokens, cost, status), with cost computed from the existing model price catalog.

## 9. Compliance and outreach (Phases 3 and 4)

- A deterministic `OutreachPolicyService` decides eligibility before enrolment, before approval and immediately before sending. It fails closed when inputs are missing. An LLM never makes the decision.
- Suppression reuses the existing `messageSuppression` table and unsubscribe token and controller, extended to the rep-mailbox send path. The pipeline needs custom header support for `List-Unsubscribe`.
- Discovery covers any market, but outreach is only enabled per jurisdiction once its rules are encoded and confirmed by counsel. Cold B2B email rules differ widely (for example Singapore's Spam Control Act and PDPA business contact exclusion, UK PECR and GDPR, Germany's stricter consent expectations, Canada's CASL, Australia's Spam Act, US CAN-SPAM). Contacts in a jurisdiction without approved rules fail the policy check and cannot be enrolled. The first jurisdictions to approve are a product decision (**Needs approval** before Phase 3).
- Outbound path: the rep's connected mailbox (IMAP/SMTP available today; Gmail and Microsoft need their OAuth enabled in production) with per-mailbox quotas and a send intent ledger. The existing SES and Resend domain sending is not used for cold outreach because both providers restrict unsolicited email. (**Needs approval** before Phase 4)
- Human approval before every send in the MVP.

## 10. Security and tenancy

- All custom resolvers use `WorkspaceAuthGuard`, `SettingsPermissionGuard(PROSPECTING)` or an object permission check, and `@RequireFeatureFlag(IS_PROSPECTING_ENABLED)`. Workspace identity always comes from the authenticated context, never from input.
- Workspace objects are isolated by schema. Core tables are only accessed through `WorkspaceScopedRepository`, except the shared directory tables, which have no `workspaceId` and are only read and written through `GlobalCompanyDirectoryService` (section 7.5). A lint-visible exception and dedicated tests cover that boundary.
- Jobs carry `workspaceId`, rebuild their context, and re-check that the campaign belongs to that workspace before doing any work.
- Provider credentials, when needed, are encrypted with the per-workspace `enc:v2` envelope and a database CHECK constraint, following `whatsapp-channel-token-encryption.service.ts`.
- Logs carry correlation ids and avoid personal data.
- A cross-tenant integration test suite (Apple and YCombinator seeded workspaces) covers campaigns, candidates, jobs and mutations.

## 11. Cost control

Phase 1 uses free and customer-provided sources by default. Metered providers (web search, aggregated registries) are only enabled when a campaign has a spend cap, and their requests are counted against it from Phase 1. Otherwise Phase 1 enforces `targetCandidateCount` and page caps. From Phase 2, a `prospectingUsage` ledger records every provider and AI cost, and campaign and workspace budgets are checked before each job is claimed. The existing AI billing still runs, but it does not enforce anything in production today (billing off, no ClickHouse), so the engine keeps its own ledger.

## 12. New dependencies

None for Phase 1. CSV parsing already happens in the front end's spreadsheet import, provider APIs (GLEIF, Wikidata SPARQL, registries, search) are called with `fetch` through the existing secure HTTP client, and zod and the AI SDK are already dependencies. Bulk files (for example GLEIF golden copies or OpenStreetMap extracts) are out of Phase 1; if adopted later they need a storage and refresh plan.

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| New instance command skipped in production because 2.33 workspace commands already ran | Deploy note: run `yarn command:prod run-instance-commands` after deploying, and verify the table exists |
| New standard objects need syncing to existing workspaces | Workspace command modelled on the conversation sync command; verify on a copy of production data before deploy |
| Redis loses jobs on container recreation | Ledger and reconciler; optionally a Redis volume with AOF |
| A public source's terms forbid commercial or automated use, or require share-alike | Per-source licence check before an adapter ships; licence stored with provenance; share-alike sources kept out of exported data until reviewed |
| Uneven coverage across markets (registries differ in fields and access) | Capabilities declared per provider; the planner combines registry, global and search sources; gaps shown to the user |
| Name collisions across countries | Registry ids scoped by authority; country always part of name matching |
| Shared directory leaks tenant strategy or confidential lists | Only public provider facts are written; imports, scores, campaigns, contacts and outreach never are; no endpoint reveals which tenants hold a company; cross-tenant tests |
| Shared directory poisoned by one tenant | No tenant-supplied data enters it; every value has a public source; operator quarantine |
| Network signal exposes one tenant's pipeline to a competitor | Minimum distinct contributors and a lag window before use; only month and segment granularity stored; no scores or timing |
| Network signal gamed by one actor using several workspaces | Contributor counting per workspace HMAC; operator monitoring of workspaces created in bursts; threshold tunable |
| Customer contracts do not permit cross-customer use of de-identified data | Network signal stays disabled in production until the terms, privacy policy and DPA are updated |
| Licence obligations when redistributing public data | Licence stored per source and per field; restricted sources excluded until reviewed |
| Standard objects appear in every workspace even when the flag is off | Navigation and actions hidden by the flag; objects stay empty. Accepted, same as conversations |
| Composite unique index support for workspace objects | Fallback to ledger plus in-transaction lookup |
