# Prospecting engine: implementation plan

Phase 0 deliverable. Read with `REPOSITORY_AUDIT.md` and `ARCHITECTURE.md`.

Status: draft for review. No implementation starts until the decisions in section 1 are approved.

## 1. Decisions requiring approval

| # | Decision | Recommendation | Blocks |
| --- | --- | --- | --- |
| D1 | Placement | Core server module plus fork standard objects plus core operational tables (not a Twenty app) | Phase 1 |
| D2 | Phase 1 discovery sources (multi-market) | Customer import, fixture, GLEIF and Wikidata (global, free) in 1.5a; first national registries (Singapore ACRA, UK Companies House) and one web search provider in 1.5b; each source's terms checked before its adapter ships | Milestone 1.5 |
| D3 | New core table `core.prospectingJob` via an instance command in the 2.33.0 folder | Yes, with the manual `run-instance-commands` deploy step | Milestone 1.3 |
| D4 | Feature flag `IS_PROSPECTING_ENABLED` and permission flag `PROSPECTING` | Yes; enable per workspace, starting with the test workspace | Milestone 1.1 |
| D5 | Redis persistence in production (`redis` volume plus `appendonly yes`) | Recommended, independent of this feature | Not blocking |
| D6 | Navigation entry | Fixed "Prospecting" section in the main navigation, shown only when the flag and permission allow it, linking to the generic record pages | Milestone 1.8 |
| D7 | First jurisdictions approved for outreach, and their rules | Discovery stays global; outreach enabled per jurisdiction once counsel confirms its rules | Phase 3 |
| D8 | Outbound mail path | Rep connected mailbox (IMAP/SMTP now, Gmail and Microsoft when their OAuth is enabled), not SES or Resend | Phase 4 |
| D9 | Hidden shared company directory and network signal | Approved, no tenant opt-out. Directory of public facts in Phase 1; anonymised network qualification signal and the internal `leap-network` provider in Phase 2, enabled in production only after the terms of service, privacy policy and DPA permit cross-customer use of de-identified data. Defaults: 3 distinct contributors, 30-day lag | Milestone 1.6b, Phase 2 |

## 2. Phase 1: campaign and discovery MVP

Exit criterion (from the spec): a user can create a campaign and discover real candidate companies without creating duplicate canonical CRM records.

Each milestone ends with lint (`npx oxlint` on changed files, since `nx lint:diff-with-main` fails on Windows), typecheck (`npx tsgo -p tsconfig.json --noEmit` in each touched package) and the relevant tests. Each is a separate commit.

### 1.1 Flags

- Add `IS_PROSPECTING_ENABLED` to `FeatureFlagKey`, and `PROSPECTING` to `PermissionFlagType`, `SystemPermissionFlag` and the standard permission flag definitions, plus the front role-permission config.
- Run `twenty-front:graphql:generate` for the metadata schema.
- Acceptance: the flag can be enabled for one workspace; the permission appears in role settings; nothing else changes for other workspaces.
- Tests: existing permission flag tests still pass; unit test that the new flag has a definition.

### 1.2 Standard objects

- Add `prospectingCampaign` and `prospectCandidate` (fields in `ARCHITECTURE.md` section 4.1) to the standard object constants and metadata builders, with indexes on `campaign`, `identityKey`, `lifecycleStage`, and a composite unique index if supported.
- Add a 2.33 workspace command that syncs the new objects into existing workspaces, modelled on `2-33-workspace-command-1789100000000-sync-conversation-standard-objects.command.ts`, with a real epoch-ms timestamp later than every existing one in the folder.
- Acceptance: a fresh workspace and an upgraded workspace both show the two objects with correct fields and relations; existing data is untouched.
- Tests: metadata builder unit tests; integration test that seeds a workspace and reads both objects through the core GraphQL API.

### 1.3 Job ledger

- Core entity `prospectingJob` under `engine/core-modules/prospecting-job/`, generated instance command (`npx nx run twenty-server:database:migrate:generate --name add-prospecting-job --type fast`), ledger service with create (idempotent insert), claim, complete, fail with backoff, and cancel.
- Add `prospectingQueue` to the message queue enum and worker config.
- Reconciler cron registered through `cron:register:all`.
- The queue processor that claims a row and dispatches by operation lands with the first operation handler in 1.7; until then nothing creates jobs.
- Acceptance: duplicate creates produce one row; concurrent claims produce one runner; a crashed run is retried after its lease expires; a job past `maxAttempts` is `DEAD`.
- Tests: unit tests for backoff and key building; integration tests for idempotent insert, single claim under concurrency, lease expiry and cancellation.

### 1.4 Campaign service and state machines

- Campaign and candidate transition tables and services; campaign start, pause, resume and cancel; ICP zod schema and validation.
- Custom mutations `startProspectingCampaign`, `pauseProspectingCampaign`, `resumeProspectingCampaign`, `cancelProspectingCampaign`, guarded by workspace auth (a signed-in user, not an API key), the permission flag and the feature flag. Status changes use the caller's role-scoped repository and a conditional update on the previous status. Pause holds the campaign's pending jobs in the ledger, resume releases them, cancel cancels pending and running jobs.
- Acceptance: invalid transitions are rejected with a clear error; starting a campaign with an invalid ICP fails; cancelling stops pending jobs.
- Tests: unit tests covering every allowed and a sample of disallowed transitions; resolver integration tests including the permission and flag guards.

### 1.5a Provider framework and global sources

- `DiscoveryProvider` type with declared capabilities (markets, filters, fields, cost model, licence, credential need), provider registry, and deterministic provider selection from the campaign's geographies and criteria.
- Providers: `fixture`, `customer-import`, `gleif` (LEI search by country, name and registration authority), `wikidata` (SPARQL by country, industry and size where recorded).
- Licence and attribution stored with each record's provenance.
- As built: GLEIF and Wikidata terms checked (both CC0; GLEIF requires access through its official API and no implied endorsement; Wikidata requires a descriptive User-Agent, at most 5 parallel queries and backing off on HTTP 429). GLEIF registration authority codes (for example RA000523 for ACRA, RA000585 to RA000587 for Companies House) are the shared authority namespace for every provider. Wikidata only runs with an industry or keyword term, because country-only queries time out for large countries; country-only campaigns use GLEIF. Selection requires a provider to cover the market and honour at least one of the ICP's topic criteria (industry, industry code, keyword); size and region are not required. An empty source list on a campaign is resolved and saved at start. The `fixture` provider is never auto-selected and is not registered in production. The `customer-import` row normaliser moves to 1.7 with the import mutation that uses it.
- Acceptance: a campaign targeting any country gets an automatic source selection the user can change; each provider returns normalised records with unknown fields left null; provider failures surface as retryable job errors.
- Tests: unit tests per provider against recorded responses (no live network calls in tests); selection tests for single-country, multi-country and global campaigns.

### 1.5b National registries and web search

- One adapter per registry, starting with Singapore ACRA (data.gov.sg) and UK Companies House, each with its registration id format and legal-suffix table.
- One web search provider (the existing Exa app's API, or another search API), enabled only for campaigns with a spend cap; results kept only when a website or registry record confirms the company.
- Each adapter ships only after its terms are checked; more registries follow the same pattern without orchestration changes.
- Acceptance and tests as in 1.5a, plus usage counted against the campaign cap for the metered provider.

### 1.6 Identity resolution

- Normalisers and matcher (`ARCHITECTURE.md` section 7.4), matching against campaign candidates and existing CRM companies.
- As built: pure normalisers (LEI with ISO 17442 check digits, registry number per GLEIF authority code with format checks for ACRA and Companies House, domain via URL parsing with punycode and a shared-platform blocklist, company name with legal forms for 25 countries, country name to code) and a pure matcher. Precedence: a different LEI or a different number in the same registry is always distinct; the same LEI or same-registry number confirms; the same domain confirms only when both countries are known and equal (one unknown is probable, different countries are distinct); the same name is at most probable. A record with nothing but a name that matches nothing is `INSUFFICIENT_INFORMATION`. The candidate identity key is the strongest identifier, or the source record when there is none, so namesakes never collide on the unique index. `ProspectIdentityLookupService` loads the candidates in the campaign and the CRM companies a page of records could match; CRM companies only carry a domain, a name and an address country. Writing the outcome (merge sources, set `matchedCompany`, `HUMAN_REVIEW`) happens in the 1.7 pipeline.
- Acceptance: same LEI, same registration id from the same authority, or same domain and country merges into one candidate with all sources; same name only goes to `HUMAN_REVIEW`; the same registration number from two different authorities never merges; a match with an existing company sets `matchedCompany` and creates no company.
- Tests: table-driven unit tests for each normaliser and outcome, including legal suffix variants for each supported country, LEI checksum validation, and look-alike names that must not merge.

### 1.6b Hidden shared company directory

- Core tables `globalCompany` and `globalCompanySource` (no `workspaceId`) and `globalCompanyCandidateLink`, generated instance command, and `GlobalCompanyDirectoryService` as the only reader and writer.
- Discovery writes public provider records through the service and links candidates through `globalCompanyCandidateLink`, never through a field on the tenant object; the planner queries the directory first for the campaign's criteria and only calls providers for the gap.
- No tenant-facing surface: no GraphQL, REST, MCP or UI exposure. Operator view, re-verify and quarantine in the admin panel.
- As built: each `globalCompanySource` row keeps that source's own normalised values; the `globalCompany` row is their merge, each field taken from the most precise source (lowest rank) and then the most recent. Identifiers (LEI, registry number, domain and country) are only filled in, never replaced, and only when no other entry holds them; an observation whose identifiers contradict the entry it would join (for example a different LEI on the same domain) is not recorded. Concurrent writers converge on one entry through the unique indexes. Quarantined entries keep collecting sources but are not served. A static boundary test fails if anything outside the directory module and `modules/prospecting` imports it, or if the module declares a resolver, controller or GraphQL type. Wiring into discovery (write public records, link candidates, read the directory before calling providers) is part of 1.7; the operator view in the admin panel is part of 1.8. The `status` column from the architecture is deferred: every Phase 1 source already returns active companies only.
- Acceptance: a company discovered by workspace A from a public source is found for workspace B without a new provider call and is credited to the original source; customer-imported rows, scores and campaigns never appear in the directory; nothing in the tenant API reveals the directory or which workspaces hold a company.
- Tests: unit tests for upsert precedence and source merging; integration tests across the Apple and YCombinator workspaces for reuse, for exclusion of imported rows, and for the absence of any tenant-facing endpoint.

### 1.7 Discovery pipeline

- Discovery job: claim, fetch one page, resolve each record, upsert candidates and their sources, enqueue the next page, stop at `targetCandidateCount` or when the source is exhausted, then mark the campaign `COMPLETED`.
- Starting a campaign plans its first discovery jobs. Before doing any work the processor re-reads the campaign: if it is paused, the job is put back on hold without using an attempt; if it is cancelled, completed or failed, the job is cancelled. This also covers a pause or cancel whose ledger update failed after the status change.
- `importProspectCandidates(campaignId, rows)` mutation for the customer import provider.
- As built: a campaign is one chain of `DISCOVER_PAGE` jobs walking ordered stages: the directory for every target market first, then each selected source per market. Each job fetches one page (capped by the remaining target), drops excluded countries and domains and known sizes outside the range, resolves and writes candidates (merge on confirmed match, `HUMAN_REVIEW` on probable, link `matchedCompany` without creating a company), records public records from shareable sources in the directory and links the candidates, refreshes `candidatesFound`, and schedules the next page or stage, or finishes the campaign. A source that rejects a campaign, or still fails on its last attempt, is skipped and the next stage runs. A job whose retries run out marks the campaign `FAILED`. The runner holds jobs of paused campaigns without using an attempt and cancels jobs of ended campaigns. Import rows (up to 500 per call) go through the same matching with the caller's write permissions, get a content-derived id so re-importing the same file merges, and are never written to the directory. ICP drafting is deferred to Phase 2.
- Optional in this phase: ICP drafting from the campaign objective with structured output; can slip to Phase 2 without blocking the exit criterion.
- Acceptance: re-running the same discovery creates no duplicates; a worker restart mid-campaign resumes from the last completed page; no `company` records are created.
- Tests: end-to-end integration test with the fixture provider (campaign, discovery, dedup, link to an existing company, completion), plus failure tests (provider timeout, duplicate job delivery, worker restart simulated by lease expiry).

### 1.8 Frontend

- "Prospecting" navigation section (D6) linking to the campaigns and candidates record pages.
- On a campaign record: start, pause and cancel actions, an "Import companies" action that reuses the spreadsheet import UI, and a discovery status summary (counts by lifecycle stage and match status).
- Candidates table view with company, industry, location, size, source, match status, lifecycle stage and matched company.
- All strings through Lingui; styling through Linaria and existing components.
- Acceptance: the whole flow works in the browser in light and dark mode for a workspace with the flag on, and nothing is visible with the flag off.
- Tests: component tests for the actions and status summary using user-visible text; manual verification with screenshots.

### 1.9 Tenant isolation suite

- Integration tests using the Apple and YCombinator seeded workspaces: one workspace cannot read or mutate the other's campaigns or candidates, cannot start or cancel the other's campaign, and a job created for one workspace never writes to the other.
- Acceptance: all pass; the suite runs in the existing integration test target.

### Phase 1 deploy notes

1. Push and deploy as usual.
2. On the VPS, after the deploy finishes: `docker compose exec server yarn command:prod run-instance-commands` to create `core.prospectingJob` (new instance commands in the 2.33 folder are skipped by the normal upgrade).
3. Confirm the workspace command synced the new objects (check one workspace's schema).
4. Enable `IS_PROSPECTING_ENABLED` for the test workspace only.

## 3. Later phases (outline)

| Phase | Scope | Exit criterion |
| --- | --- | --- |
| 2. Research and qualification | Research orchestration with capped web access, `researchEvidence` and `prospectSignal`, account score and confidence with versioned weights, explanations, candidate detail view, promotion to `company` with source attribution, usage ledger and campaign budgets, shared research evidence in the directory, anonymised network qualification contributions and the hidden `leap-network` provider (behind a separate instance flag until the legal terms are updated) | Users review evidence-backed, ranked candidates and promote selected ones to the CRM; a new campaign in any tenant draws on directory and network results without revealing them |
| 3. Contacts and outreach preparation | Persona targeting, one enrichment provider (People Data Labs is already integrated), verification status, contact score, policy service, personalised drafts with evidence references, approval workflow, outreach control centre | A reviewed, policy-checked outreach queue exists and nothing is sent |
| 4. Controlled email outreach | Sequences, scheduled sends through the ledger, send-time policy checks, mailbox quotas, idempotent dispatch with send intents, custom headers and unsubscribe, reply derivation from inbound threads, stop conditions, CRM activities | Approved sequences run reliably and replies or suppressions stop further sends |
| 5. Hardening | Workspace usage limits, cost dashboards, recovery tools in the admin panel, credential management, load tests, retention and deletion | Production-readiness and multi-tenant security review passes |

Phase 6 items from the spec stay out of scope until Phase 5 is complete.

## 4. Out of scope for the MVP

Fully autonomous outbound, WhatsApp and LinkedIn automation, automatic opportunity creation, self-adjusting scoring, unbounded crawling, scraping of sources without permitted access, outreach in jurisdictions whose rules are not yet approved, new billing infrastructure, and infrastructure beyond the existing stack.

Discovery is not limited to one market: any public source whose terms permit commercial use can be added as a provider.
