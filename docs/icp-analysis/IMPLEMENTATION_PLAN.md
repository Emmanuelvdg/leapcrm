# ICP analysis: implementation plan

Read with `ARCHITECTURE.md`.

Status: approved. M1 in progress.

## 1. Decisions

| # | Decision | Recommendation | Status |
| --- | --- | --- | --- |
| I1 | Placement | Core module next to prospecting, fork standard objects and fields | Approved |
| I2 | Won and lost deals | Standard `LOST` stage and `lostReason` on opportunities, plus won and lost stage mapping per model | Approved |
| I3 | Attributes | Built-in catalogue plus any eligible custom Company field | Approved |
| I4 | First release scope | Evidence, patterns, model, back-test and live scoring; alerts, nurture routing and drift review next | Approved |
| I5 | Gating | New feature flag `IS_ICP_ANALYSIS_ENABLED`; new tool permission `ICP_ANALYSIS`, on by default for Admin and Member | Approved |
| I6 | Tier names and default thresholds | `PRIORITY` 80, `TARGET` 60, `NURTURE` 40, `EXCLUDED` below, editable per model | Approved |
| I7 | Lost reasons | `PRICE`, `COMPETITOR`, `NO_DECISION`, `TIMING`, `BAD_FIT`, `OTHER` | Approved |

## 2. Release 1 milestones

Each milestone is a separate commit and ends with `npx oxlint` on changed files (`nx lint:diff-with-main` fails on Windows), `npx tsgo -p tsconfig.json --noEmit` in each touched package, and the relevant tests. Rebuild `twenty-shared` with `--skip-nx-cache` after touching it, and clear the Vite deps cache before checking the front.

Upgrade commands go in the `2-33` folder with epoch-ms timestamps greater than `1792488900000`.

### M1 Flags and lost deals

- `IS_ICP_ANALYSIS_ENABLED` in `FeatureFlagKey`; `ICP_ANALYSIS` in `PermissionFlagType`, `SystemPermissionFlag`, the standard permission flag definitions and the front role-permission config. Backfill for existing roles follows `2-33-workspace-command-1792286576249-backfill-standard-permission-flags.command.ts`.
- Opportunity `stage` gets the `LOST` option and a new `lostReason` select in the standard field metadata.
- Workspace command: append `LOST` when no option with that value exists, and create `lostReason`.
- Acceptance: a fresh workspace and an upgraded workspace both show Lost and Lost reason; a workspace with a custom `LOST` option keeps it unchanged; the flag can be enabled for one workspace.
- Tests: upgrade command unit test for the three stage cases (default options, custom options, `LOST` already present).

### M2 Shared scoring core

- `twenty-shared/src/icp-analysis/`: types, criteria and threshold zod schemas, `computeIcpScore`, `computeIcpAttributePatterns`, `suggestIcpCriterionWeights`, `runIcpBacktest`, `bucketIcpNumericValues`.
- No I/O, no server or front imports.
- Acceptance and tests: unit tests with worked fixtures for each function, including empty datasets, all-won and all-lost datasets, unknown values, multi-select values, hard exclusions, score clamping, AUC on a known ranking, holdout split by close date, and weight caps per category.

### M3 Objects and score fields

- `icpModel` standard object (fields in `ARCHITECTURE.md` 4.1) and score fields on `company` and `prospectCandidate` (4.2), with metadata builders and universal identifiers.
- Pre-update hook on `icpModel` validating `criteria` and `tierThresholds` with the shared schemas, and allowing only one `ACTIVE` model.
- Timeline: drop ICP score fields from update diffs alongside position fields.
- Workspace command syncing the new object and fields, modelled on `2-33-workspace-command-1792290000000-sync-prospecting-standard-objects.command.ts`.
- Acceptance: fresh and upgraded workspaces show the object and fields; invalid criteria are rejected with a readable error.
- Tests: metadata builder tests, hook tests, snapshot update for standard metadata ids.

### M4 Evidence and analysis service

- Attribute catalogue: built-in attributes with company and candidate extractors, custom attributes from Company object metadata, reference-date handling.
- `IcpEvidenceService`, `analyzeIcpModel`, `suggestIcpModelCriteria`, `duplicateIcpModel` mutations with guards and an exception interceptor following prospecting.
- Acceptance: analysing the seeded workspace returns the expected counts, coverage and pattern table; custom select and number fields appear as attributes; opportunities without a company are counted and excluded.
- Tests: unit tests for extractors and the catalogue; integration test against a seeded workspace; permission and flag tests.

### M5 Model page and editor

- Instance command adding the `ICP_ANALYSIS` widget type, following `2-33-instance-command-fast-1792488887030-add-prospecting-discovery-status-widget-type.ts`.
- Widget sections Evidence, Patterns, Model and Back-test; record page layout with the Insights tab; navigation entry; command menu items for Run analysis, Suggest weights, Activate and Duplicate (workspace command for existing workspaces, as in `add-prospecting-record-pages-and-actions`).
- The Model section recomputes the back-test in the browser on every change.
- Acceptance: a user can go from a new model to an edited, back-tested model without leaving the record page; strings use Lingui; layouts fit their widget size without inner scroll.
- Tests: component tests for the criteria editor, pattern table and back-test table by visible text and roles; Storybook stories for empty, low-sample and healthy datasets.

### M6 Activation and live scoring

- `activateIcpModel` mutation with the activate dialog warnings.
- Score-all job on the worker queue, skipping unchanged rows; nightly cron registered through `cron:register:all`.
- Company create and update listener filtered to fields used by the active model; candidate scoring inside the discovery pipeline write path.
- "Priority accounts" view on Company; tier column and sort on campaign candidate lists.
- Acceptance: activating scores every company and candidate in the seeded workspace; a field change rescores only that company; a second nightly run writes nothing when nothing changed; new discovery results arrive scored.
- Tests: job tests for paging and no-op runs; listener tests; integration test for activate then read scores.

### M7 Tenancy and end to end

- Extend the prospecting tenant isolation suite to ICP models, mutations, jobs and scores (Apple and YCombinator seeded workspaces).
- One Playwright flow: create a model, run analysis, suggest weights, activate, see a score on a company.
- Deploy notes: run `yarn command:prod run-instance-commands` after deploying and verify the widget type exists; enable the flag for the test workspace first.

## 3. Next release (outline)

| Item | Scope |
| --- | --- |
| Alerts | Task or notification to the account owner when a company or candidate enters `PRIORITY` |
| Nurture routing | Workflow trigger on tier change, so `NURTURE` and `EXCLUDED` accounts can be moved to sequences or suppressed |
| Drift review | Weekly digest of deals closed since activation that the model got wrong, with a one-click "Duplicate and retrain" |
| Engagement signals | Built-in intent attributes from email and calendar: distinct contacts engaged before the deal, meetings before the deal |
| Campaign link | Draft a prospecting campaign's discovery filters from the active model's green pattern |
| AI summary | Plain-language summary of the pattern table, citing the numbers it is based on |

## 4. Out of scope

Churn analysis (no churn signal in the CRM yet), web analytics ingestion, third-party technographic providers, automatic weight changes without a user activating a new version, and any use of ICP data in the shared company directory or network signal.
