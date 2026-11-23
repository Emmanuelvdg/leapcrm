# Data hygiene

Keeps people and companies clean without anyone having to remember to.

- **Trims on save.** Stray and doubled whitespace in company names, person names and job titles is removed whenever a record is created or edited. Nothing else about what users type is changed.
- **Flags likely duplicates**, including near matches the built-in duplicate check misses, and links each one to the older record it probably duplicates (**Possible duplicate of**). The older record lists its **Possible duplicates**, so both are one click apart.
- **Merges a duplicate in one step.** Select a flagged record and run **Merge with duplicate** to merge it into the older record it matches.
- **Flags incomplete records**: people with no email and no phone, people with no company, and companies with no domain.
- Adds **Companies to clean up** and **People to clean up** views to the sidebar, sorted by name so near-duplicates sit next to each other.

Each person and company gets a **Data quality** status (Clean, Incomplete, Possible duplicate) and **Data quality issues** explaining why.

## How duplicates are matched

| Object  | Matches when                                                                                                                                                     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Company | Same domain, ignoring `https://`, `www.`, paths and case. Or the same name, ignoring case, punctuation, accents and trailing legal forms ("Acme Pte. Ltd." = "ACME"). |
| Person  | Same email (any of their emails, ignoring case). Or the same LinkedIn profile. Or the same name at the same company.                                            |

- A name alone never makes two people duplicates: "Jane Tan" at two different companies are two people. Two companies already flagged as duplicates of each other count as the same company.
- Social pages used as a website (facebook.com/…, linktr.ee/…) are compared by page, not by host.
- When a match is a false alarm, tick **Not a duplicate** on the record. It is then never matched again and the flags on both sides clear.

## Merging a duplicate

Select one record flagged as a possible duplicate (on its page, or a row in **Companies to clean up** or **People to clean up**) and click **Merge** in the action bar or command menu. After you confirm:

- The flagged record is merged into the older record it is linked to, using the built-in merge. Linked notes, tasks, people and opportunities move across, and the older record keeps its own values where both have one.
- The flagged record is permanently deleted. This cannot be undone.
- The older record is rechecked straight away, so it shows **Clean** without waiting for the nightly run, and you land on its page.

The command only shows when the **Possible duplicate of** field is loaded for the selection: always on a record page, and in any table view that shows that column (both clean-up views do). Merging needs permission to permanently delete records of that object. Users without it get a permission error, as with the built-in merge.

## When it runs

| Trigger                                          | What happens                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| Install                                          | Every person and company is checked                               |
| A company or person is created                   | It is trimmed and checked against similar records                 |
| Name, domain, contact details or company changes | Same as above                                                     |
| Every day at 04:30 UTC                           | Everything is rechecked, which also clears flags left by merges and deletes |

Records are only written when something actually changed, so timelines stay quiet.

Free: no AI, no credits, no third-party services.

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

- A save only checks records that look similar to the one saved (one page of candidates). Anything it misses, and any record already flagged against something else, is reconciled by the nightly run.
- The install and nightly runs load all people and companies into memory inside a single 5-minute execution. Fine for tens of thousands of records; larger workspaces will need batching.
- Trimming names on install writes those records, and each write runs the save check once. On a very messy workspace the first install generates a burst of checks.
- Phone numbers are not used for matching: colleagues often share an office line.
- To merge more than two records, or to choose which one wins, use the built-in merge on a multi-record selection.
