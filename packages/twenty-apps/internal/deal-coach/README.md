# Deal coach

**Every open deal gets a suggested next step, written by an AI agent that has read the conversation, and ready to carry out in one click.** The Deal coach agent reads a deal's WhatsApp messages, emails, call and meeting summaries, tasks and notes, then decides what the owner should do next, drafts it, and points out when the deal record itself is out of date.

## What you get

On every open opportunity:

| Field                   | What it holds                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Next best action**    | One concrete step, e.g. "Confirm Monday 3 PM site visit with Priya and the facilities head"      |
| **Next action type**    | Reply, Schedule meeting, Send quote, Call or Task                                                |
| **Next action reason**  | The evidence behind it: who said what, when, what is overdue                                     |
| **Next action channel** | WhatsApp or Email, for steps that send the contact a message                                     |
| **Next action due**     | When to do it                                                                                    |
| **Deal risk**           | Low, Medium or High                                                                              |
| **Draft follow-up**     | The message in the contact's language and the owner's tone, or talking points for a call         |
| **Next action details** | The email subject, the proposed meeting, and any suggested change to stage, close date or amount |
| **Next action updated** | When the agent last looked at the deal                                                           |

A **Next step** tab on the deal page shows the suggestion with the buttons that fit it:

- **Open in WhatsApp** saves the draft in the contact's WhatsApp conversation and opens it with the composer filled in. Only available while WhatsApp's 24-hour reply window is open; otherwise the tab explains why and suggests email or a call.
- **Open in email** opens the email composer with the recipient, subject and body filled in, using your connected mailbox.
- **Create calendar event** books the proposed meeting in your connected calendar and, after you confirm, emails the contact an invitation.
- **Apply** makes the suggested deal update (stage, close date, amount), after you confirm.
- **Create task** from the suggestion, due on the suggested date, assigned to the deal owner, with the reason and draft in the task body.
- **Copy** the draft, and **Regenerate** to ask the agent again.

Nothing is sent without the rep pressing Send. **Suggest next step** in the command menu refreshes up to 10 selected deals.

The fields are ordinary opportunity fields, so they can be shown on the board and in tables, filtered and used in workflows. The **Deal coach** agent also shows up under Settings > AI, where admins can edit its prompt or model, and a workflow's AI agent step can call it.

## When suggestions refresh

- **Every 15 minutes** for deals that had activity since their last suggestion: a new WhatsApp message or email with the deal's contact or company, a new call summary, or a change of stage or close date. A burst of messages becomes one refresh.
- **Every night at 04:00 UTC** for open deals with no suggestion yet, or one older than `REFRESH_AFTER_DAYS`. The oldest go first.
- **On demand** with Regenerate or Suggest next step.

Closed deals (stages in `CLOSED_STAGES`) get no suggestion, and their last one is cleared when they close.

## What the agent reads

For each deal: stage and the workspace's open stages, amount, dates, owner, company and point of contact (with whether they have an email address and phone number); whether WhatsApp's 24-hour reply window is open; the last 30 WhatsApp messages and 12 emails with the point of contact or anyone at the company; the last 3 call summaries; tasks on the deal; the 3 latest notes. Long histories keep the newest messages.

Won and lost stages are never suggested: closing a deal stays the rep's decision.

Email privacy follows each mailbox's sharing setting: the agent sees the body only when the mailbox shares everything, the subject only when it shares subjects, and neither when it shares metadata only.

Each run is a single agent call with no tools, so it cannot read or change anything beyond what is listed above. Text inside messages and notes is treated as data, never as instructions.

## Settings

Application variables, editable per workspace after install:

- `CLOSED_STAGES`: comma-separated stage values that mean won or lost. Default `CUSTOMER,LOST`.
- `REFRESH_AFTER_DAYS`: how old a suggestion can get before the nightly run refreshes it. Default `3`.
- `MAX_DEALS_PER_RUN`: the most deals one automatic run sends to the agent. Default `25`. Deals left over are picked up by later runs.

## Billing

Uses the workspace's AI model and credits: each refresh is one agent run on the deal (a main call plus a short call that formats the answer). With the defaults, automatic runs are capped at 25 deals per 15 minutes and 25 per night. When the workspace has no AI model enabled or runs out of credits, suggestions stop and the deal keeps its last one.

## Development

Run Yarn through Corepack (`corepack yarn ...`) so the version pinned in `packageManager` is used:

```bash
corepack yarn install
corepack yarn test
corepack yarn twenty remote:add     # point at a Your Jugaad CRM server with an API key
corepack yarn twenty -r <remote> dev
```

Always pass the remote with `-r`: the default remote may be production.

The `twenty` script preloads `scripts/posix-relative-paths.cjs`: twenty-sdk writes Windows backslashes into handler paths, which the server rejects ("Resource path must not contain backslashes"). It is a no-op on macOS and Linux.

## Heads up

- A suggestion can be wrong. The widget says it was written by AI, and nothing is sent until the rep presses Send in the composer or confirms the calendar invite.
- Open in WhatsApp, Open in email and Create calendar event need the matching front-end changes in this repository: the composers read the prepared draft, and drafts are kept out of the WhatsApp thread until sent.
- Open in email and Create calendar event use the rep's first connected Google, Microsoft or IMAP/CalDAV account.
- Only the point of contact and people at the deal's company are matched to messages. A contact from another company who is not the point of contact is not seen.
- With very busy pipelines (more than 25 deals with new activity per 15 minutes), raise `MAX_DEALS_PER_RUN` or some deals wait for the next run; activity older than an hour is then left to the nightly run.
