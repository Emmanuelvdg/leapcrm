# Deal health

**See which deals need attention without building a report.** Every open opportunity gets a Health status (Healthy, Watch, At risk) and a plain-language reason, kept up to date automatically.

## What you get

- **Health** and **Health reasons** columns on Opportunities
- **Stage changed**: when the deal last moved stage
- A **Deals at risk** view in the sidebar, sorted by close date

## How deals are scored

| Signal | Reason shown |
|---|---|
| Close date is in the past | Close date passed (date) |
| No stage change for `STALLED_AFTER_DAYS` (default 21) | In this stage since (date) |
| No unfinished task linked to the deal | No open task |
| No close date set | No close date |

- **At risk**: the close date has passed, or the deal is stalled and has no open task.
- **Watch**: any other signal.
- **Healthy**: no signals.
- Deals in a stage listed in `CLOSED_STAGES` (default `CUSTOMER`) are not scored.

Deals are rescored when they are created, when their stage or close date changes, and every night at 05:00 UTC. Completing or adding a task is picked up by the nightly run.

## Settings

Both are application variables, editable per workspace after install:

- `STALLED_AFTER_DAYS`: days in one stage before a deal counts as stalled
- `CLOSED_STAGES`: comma-separated stage values that mean won or lost, e.g. `CUSTOMER,LOST`

## Billing

Free: no AI, no credits.

## Development

Run Yarn through Corepack (`corepack yarn ...`) so the version pinned in `packageManager` is used:

```bash
corepack yarn install
corepack yarn test
corepack yarn twenty remote:add     # point at your LeapCRM server with an API key
corepack yarn twenty dev
```

The `twenty` script preloads `scripts/posix-relative-paths.cjs`: twenty-sdk writes Windows backslashes into handler paths, which the server rejects ("Resource path must not contain backslashes"). It is a no-op on macOS and Linux and can be removed once the SDK normalizes paths itself.

## Heads up

- Deals that existed before install have no stage history, so their stage clock starts from their last update.
- The nightly run scores deals one page at a time inside a single 5-minute execution. Very large pipelines (tens of thousands of open deals) will need the batched fan-out used by the Last contact app.
