# ICP analysis: architecture proposal

Turns closed deals into a tested, weighted Ideal Customer Profile model and keeps a live 0-100 fit score on every company and prospect candidate.

Status: approved. Implementation follows the milestones in `IMPLEMENTATION_PLAN.md`.

## 1. Summary of decisions

1. **Placement: a core server module plus fork standard objects and fields**, next to `modules/prospecting/`. It scores prospect candidates as they are discovered and shares the worker, gating and upgrade path with prospecting. This is the "account score with versioned weights and explanations" item from prospecting Phase 2. (Approved)
2. **Closed-lost becomes first-class.** Opportunities get a standard `LOST` stage and a `lostReason` select. Each ICP model also stores which stage values mean won and lost, so workspaces with their own stages still work. (Approved)
3. **Any company field can be a criterion.** A built-in attribute catalogue (country, People Data Labs firmographics, funding as a trigger) plus any select, multi-select, boolean, number, currency, rating or date field on Company. Technographics and intent can be tracked in custom fields and used without code changes. (Approved)
4. **First release covers the whole loop**: evidence base, pattern analysis, weighted model, back-test, live scores and tiers. Alerts to account owners, nurture routing and the weekly drift review come next. (Approved)
5. **Deterministic statistics, no AI in the model.** Win rates, lift, suggested weights, scores and back-tests are plain, unit-tested functions. AI is optional and later, for summarising patterns in plain language.
6. **Scoring logic is isomorphic** (in `twenty-shared`), so the weight editor previews back-test results instantly in the browser and the server scores records with the same code.
7. **One active model per workspace.** Retraining creates a new version; activating it archives the previous one. Every score records the model version that produced it.
8. **Gated** by a new feature flag `IS_ICP_ANALYSIS_ENABLED` and a new tool permission `ICP_ANALYSIS`, on by default for Admin and Member like `PROSPECTING`. (Approved)

## 2. What the CRM can and cannot supply today

| Guide input | Available in Leap today | Plan |
| --- | --- | --- |
| Closed-won deals | Opportunities in stage `CUSTOMER` | Won stages configurable per model |
| Closed-lost deals | None: there is no lost stage | Add `LOST` stage and `lostReason` (section 4.3) |
| Firmographics | Company `address.addressCountry`, `annualRevenue`; `pdlIndustry`, `pdlEmployeeCount`, `pdlSizeRange`, `pdlFoundedYear`, `pdlNaics`, `pdlSic` when the People Data Labs app is installed and the company was enriched; `industry`, `industryCode`, `employeeCount`, `country` on prospect candidates | Built-in catalogue reads these; coverage report shows gaps and links to unenriched companies |
| Technographics | None | Custom fields on Company (for example a multi-select "Tech stack") |
| Behavioural intent (pricing page, multi-user engagement) | No web analytics. Email and calendar participation exists | Custom fields now; engagement counts from messages and calendar events in a later milestone |
| Trigger signals | `pdlLastFundingDate`, `pdlLatestFundingStage` | "Funded within N days before the deal" built-in attribute; hiring and leadership changes via custom date fields |
| Churn | None | Out of scope until there is a churn or contract-end signal |
| Customer interviews | Not data | `insights` rich text on the model for the qualitative sanity check |

## 3. Module layout

```
packages/twenty-shared/src/
  icp-analysis/                         # isomorphic, no I/O
    types/                              # IcpCriterion, IcpAttributeValue, IcpTier, IcpBacktestResult ...
    zod-schemas/                        # criteria and tier threshold schemas
    utils/
      compute-icp-score.ts              # criteria + attribute values -> score, tier, reasons, coverage
      compute-icp-attribute-patterns.ts # win rate, lift, Wilson interval per bucket
      suggest-icp-criterion-weights.ts  # shrunk log-odds -> weights within category caps
      run-icp-backtest.ts               # tier table, AUC, misses, holdout split
      bucket-icp-numeric-values.ts      # quantile bands for number, currency and date fields
  types/FeatureFlagKey.ts               # IS_ICP_ANALYSIS_ENABLED
  constants/PermissionFlagType.ts ...   # ICP_ANALYSIS

packages/twenty-server/src/modules/icp-analysis/
  icp-analysis.module.ts
  standard-objects/                     # icpModel workspace entity
  attributes/                           # attribute catalogue and value extraction per source object
  evidence/                             # loads closed deals and their company attributes
  scoring/                              # score writer, score-all job, nightly cron, change listeners
  services/                             # analyse, suggest, activate, duplicate
  resolvers/                            # custom mutations
  constants/ types/ utils/ exceptions/

packages/twenty-front/src/modules/icp-analysis/
  widgets/                              # one ICP analysis widget, four sections
  components/ hooks/ graphql/           # criteria editor, back-test table, actions
```

Folder and file naming follow the adjacent code in each area.

## 4. Data model

### 4.1 `icpModel` workspace object (label identifier `name`)

| Field | Type | Notes |
| --- | --- | --- |
| name | text | |
| status | select | `DRAFT`, `ACTIVE`, `ARCHIVED` |
| version | number | Incremented when duplicated for retraining |
| wonStages, lostStages | raw JSON | Lists of opportunity stage values; default `CUSTOMER` and `LOST` |
| datasetStartDate, datasetEndDate | date time | Window of closed deals; default the last 24 months |
| criteria | raw JSON | Validated by the shared zod schema (section 6.1) |
| tierThresholds | raw JSON | Default `{ priority: 80, target: 60, nurture: 40 }` |
| analysis | raw JSON | Snapshot from the last run: dataset counts, coverage per attribute, pattern table (section 5) |
| backtest | raw JSON | Snapshot of the back-test for the saved criteria (section 7) |
| insights | rich text | Findings from customer interviews: "what was happening right before you reached out?" |
| analyzedAt, activatedAt | date time | |

Models are workspace records, so they get the generic record page, views, object permissions and the timeline for free. Status, version, analysis, back-test and the two timestamps are not editable in the UI; actions change them. A duplicated model keeps the name and gets `version + 1`, which is enough lineage, so there is no relation back to the model it came from.

### 4.2 Score fields on `company` and `prospectCandidate`

| Field | Type | Notes |
| --- | --- | --- |
| icpScore | number | 0-100, null until scored |
| icpTier | select | `PRIORITY`, `TARGET`, `NURTURE`, `EXCLUDED` |
| icpScoreReasons | text | Plain language, for example "Industry: Financial services (+20) · 51-200 employees (+15) · Uses Competitor X (-20)" |
| icpCoverage | number | Share of model weight whose attribute was known, 0-100. A score of 85 with 30% coverage is a weak signal and the UI says so |
| icpModelVersion | number | |
| icpScoredAt | date time | |

### 4.3 Opportunity changes

- Add stage option `LOST` (label "Lost", position after `CUSTOMER`, grey) to the standard `stage` field.
- Add `lostReason` select: `PRICE`, `COMPETITOR`, `NO_DECISION`, `TIMING`, `BAD_FIT`, `OTHER`. Shown in the pattern analysis next to the attribute patterns, since the reason often explains a negative pattern.
- Existing workspaces get both through a workspace command. Workspaces that customised their stages keep their options; `LOST` is only appended when no option with that value exists.

### 4.4 Why no core tables

Analysis and scoring are idempotent recomputations over workspace data, so they need no ledger, unique idempotency keys or cross-workspace state. Jobs run on the existing worker queue and can be retried freely. The only instance-level change is the widget type enum (section 9).

## 5. Steps 1 and 2: evidence and patterns

### 5.1 Evidence base

`IcpEvidenceService` builds the dataset for a model:

1. Load opportunities whose stage is in `wonStages` or `lostStages` and whose last stage change falls in the dataset window, with their company. Opportunities without a company are counted and excluded.
2. For each, extract attribute values through the attribute catalogue (5.2). Time-relative attributes (funding recency, custom date fields) are evaluated against the opportunity's `createdAt`, so "funded in the 6 months before the deal" means before the deal, not before today.
3. Return rows `{ opportunityId, companyId, outcome: WON | LOST, closedAt, amount, lostReason, values }` plus coverage per attribute.

The dataset is computed on demand and stored only as aggregates in `analysis`, not as a copy of deal data.

Known limitation: static firmographics use the company's current values. A company enriched or grown since the deal can make history look cleaner than it was. The coverage report shows when each company was last enriched.

### 5.2 Attribute catalogue

An attribute is `{ key, label, category, valueType, extract(record, referenceDate) }`.

- **Built in**: country, annual revenue band, PDL industry, employee count band, size range, company age, latest funding stage, funded within 90/180/365 days, NAICS and SIC prefix. Each maps to the matching candidate field where one exists (country, industry, industry code, employee count) so candidates can be scored with the same model.
- **Custom**: every active Company field of type `SELECT`, `MULTI_SELECT`, `BOOLEAN`, `NUMBER`, `CURRENCY`, `RATING`, `DATE` or `DATE_TIME`, read from object metadata, excluding system fields and the ICP score fields themselves.
- **Category** (firmographic, intent, technographic, trigger) is set for built-in attributes and chosen by the user for custom ones. It drives the weight caps in 6.2.
- Numbers, currency and dates are bucketed into quantile bands (at most five) computed from the dataset, so a criterion reads "51-200 employees" rather than an arbitrary threshold. Users can edit band edges.

### 5.3 Pattern analysis

For every attribute bucket, `computeIcpAttributePatterns` returns won, lost, win rate, lift against the dataset's baseline win rate and a 95% Wilson interval.

- Win rates are Laplace-smoothed so a bucket with one won deal does not show 100%.
- A bucket with fewer than 5 deals is marked low sample and never suggested as a criterion.
- **Green pattern**: buckets whose interval sits above the baseline.
- **Negative ICP**: buckets whose interval sits below it, plus the share of lost deals per `lostReason` within the bucket.
- Datasets below 20 won and 20 lost deals show a banner that the patterns are indicative only.

## 6. Step 3: the weighted model

### 6.1 Criteria

```ts
type IcpCriterion = {
  id: string;
  attributeKey: string;
  attributeLabel: string;   // for "Industry unknown" style reasons
  label: string;            // for example "Industry: Fintech"
  category: 'FIRMOGRAPHIC' | 'INTENT' | 'TECHNOGRAPHIC' | 'TRIGGER';
  match:
    | { type: 'IN'; values: string[] }                    // select, multi-select, country
    | { type: 'BETWEEN'; min: number | null; max: number | null } // min <= value < max
    | { type: 'IS'; value: boolean };
  weight: number;           // integer, -30 to +35; negative penalises
  isHardExclusion: boolean; // matches force EXCLUDED regardless of score; weight <= 0
};
```

Dates reach the scoring core as numbers: days before the reference date (deal creation for history, today for live scoring). "Funded in the 180 days before the deal" is `BETWEEN 0 and 180` on that number.

### 6.2 Suggested weights

`suggestIcpCriterionWeights` turns the pattern table into a starting model the user edits:

- Strength per bucket is the smoothed log odds ratio against the baseline, shrunk towards zero by `n / (n + 10)` so small buckets carry less.
- Positive buckets are scaled within each category's cap, matching the guide's starter split: firmographic 35, intent 30, technographic 20, trigger 20. Weights are rounded to multiples of 5.
- Negative buckets get -10 to -30; weaker negative signals are left out. The user can mark any negative criterion as a hard exclusion (wrong vertical, wrong market).
- At most one criterion per attribute bucket and three per attribute, keeping the strongest, with a default limit of 15 criteria so the model stays readable.

### 6.3 Score and tiers

`computeIcpScore(criteria, values, thresholds)`:

- `maxScore` is the sum of the best positive weight per attribute.
- `raw` adds, per attribute, the best matched positive weight and the worst matched negative weight, so overlapping bands or several multi-select values cannot stack points.
- `score = clamp(round(100 * raw / maxScore), 0, 100)`.
- Tier: any matched hard exclusion gives `EXCLUDED`; otherwise `PRIORITY` at `>= 80`, `TARGET` at `>= 60`, `NURTURE` at `>= 40`, `EXCLUDED` below.
- Unknown values add nothing and lower `icpCoverage`. They are never treated as a match or a miss.
- Reasons are structured: hard exclusions first, then matched criteria by absolute weight, then up to two unknown attributes with the largest weights. The server turns them into the `icpScoreReasons` text when it writes scores (M6).

## 7. Step 4: back-test

`runIcpBacktest(criteria, thresholds, dataset)` reports:

- Per tier: deals, won, lost, win rate and lift against the baseline.
- AUC (probability that a random won deal outscores a random lost deal).
- Misses: won deals below `TARGET` and lost deals in `PRIORITY`, each linking to the opportunity.
- **Holdout**: when the dataset has at least 40 deals, weights are suggested from the oldest 70% and evaluated on the newest 30%, and both figures are shown. Smaller datasets are evaluated in sample with an overfitting warning.
- **Non-opportunity sample**: the score distribution of up to 500 random companies that never had an opportunity. A useful model scores them below won deals.

The editor recomputes the back-test in the browser on every weight change, using the same shared function and the dataset returned by the analyse mutation. Activation is never blocked, but the activate dialog warns when `PRIORITY` does not beat the baseline win rate or AUC is below 0.6.

## 8. Step 5: live scoring

- **Activate** archives the previous active model, sets this one `ACTIVE` and enqueues a score-all job.
- **Score-all job** pages through companies and prospect candidates and writes the score fields, skipping records whose score, tier, reasons and coverage did not change, so it does not flood the timeline or rewrite rows every night (the bug fixed in Deal health in `9de59ea9e`).
- **On change**: a database event listener rescores a company when it is created or a field used by the active model changes, and the discovery pipeline scores candidates as they are written, so new campaign results arrive ranked.
- **Nightly** cron rescores everything, which picks up time-relative attributes such as funding recency.
- **Views**: "Priority accounts" on Company and a tier column and sort on candidate lists in each campaign.
- Candidates with a `matchedCompany` are scored from the company's values, falling back to the candidate's own fields.

## 9. User interface

- Navigation: "ICP analysis" in the Prospecting section, shown when the flag and permission allow it, opening the `icpModel` list.
- `icpModel` record page with tabs **Evidence**, **Patterns**, **Model**, **Back-test** and **Insights**. The first four are one new widget type, `ICP_ANALYSIS`, with a `section` setting, following `ProspectingDiscoveryStatusWidget`. Insights is the rich text field.
  - Evidence: deal counts, baseline win rate, coverage bar per attribute, link to companies in the dataset missing PDL data.
  - Patterns: green pattern and negative ICP tables, lost reasons.
  - Model: criteria editor grouped by category, weight sliders, hard exclusion toggle, tier thresholds, live back-test summary.
  - Back-test: tier table, AUC, holdout comparison, misses.
- Command menu actions on a model: Run analysis, Suggest weights, Activate, Duplicate as new version.
- Company and candidate record pages show score, tier, coverage and reasons in the fields card.

## 10. API

Custom mutations on the core GraphQL API, all behind `WorkspaceAuthGuard`, `SettingsPermissionGuard(ICP_ANALYSIS)` and `@RequireFeatureFlag(IS_ICP_ANALYSIS_ENABLED)`:

- `analyzeIcpModel(id)`: builds the evidence, stores `analysis` and returns the dataset rows for the browser back-test.
- `suggestIcpModelCriteria(id)`: returns suggested criteria without saving them.
- `activateIcpModel(id)`: validates criteria, stores the back-test snapshot, activates and enqueues scoring.
- `duplicateIcpModel(id)`: new `DRAFT` copy with `version + 1`.

Criteria and thresholds are saved through the normal record API. Pre-query hooks on create and update (one and many) validate them with the shared zod schemas, fill in default stages, criteria and thresholds on create, refuse upserts and refuse setting a model to `ACTIVE` (only `activateIcpModel` does that). Criteria, thresholds, stages and the deal window of an active or archived model cannot change; retraining duplicates the model.

## 11. Security and tenancy

- Everything is workspace data in the workspace schema. No core tables, no shared directory reads or writes, no network signal contribution.
- Dataset rows returned to the browser contain ids, outcome, dates, amount and attribute values only, and only for opportunities and companies the user can read under their object permissions.
- Jobs carry `workspaceId`, rebuild the system auth context and re-check that the model belongs to that workspace.
- Tenant isolation tests follow `0079d0f65` (prospecting tenant isolation suite).

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Too few closed deals for meaningful patterns | Sample size banner, low-sample buckets never suggested, shrinkage in weights, holdout only when there is enough data |
| Overfitting to a small dataset | Holdout split, non-opportunity sample, weight caps per category, criteria limit, insights field for the qualitative check |
| History uses current company values | Coverage report with enrichment dates; time-relative attributes evaluated at deal creation |
| Most companies lack firmographics | `icpCoverage` on every score; coverage report links to unenriched companies for PDL enrichment |
| Industry taxonomies differ between PDL and registries | Built-in attributes map only equivalent fields; industry criteria on candidates apply only when the same taxonomy is present, otherwise unknown |
| Adding `LOST` collides with a workspace's own stage options | Append only when no option with that value exists; won and lost stages configurable per model |
| Score writes flood the timeline | Skip unchanged scores; drop ICP score fields from update diffs in `timeline-activity.service.ts`, the way position fields already are |
| New instance command skipped in production because 2.33 already ran | Deploy note: run `yarn command:prod run-instance-commands` after deploying and verify the widget type exists |
| Standard fields appear in workspaces with the flag off | Fields stay empty and navigation and actions are hidden. Accepted, same as prospecting |
