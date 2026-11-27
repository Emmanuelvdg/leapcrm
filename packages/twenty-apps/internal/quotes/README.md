# Quotes

**Branded quotes with GST, VAT or sales tax, in any currency, straight from the deal.** Build a quote from your product catalogue, route large discounts to a manager, share a private link the customer can read, download as a PDF and accept with a signature, and see when they opened it.

## What you get

- **Products** (sidebar: Quotes > Products): name, SKU, product line, list price and currency, unit, tax rate and HSN/SAC code. Only active products can be added to quotes.
- **Quotes** (sidebar: Quotes > Quotes), each with:
  - **Quote** tab: the editor. Pick products or type custom lines; set quantity, rate, discount and tax per line; choose the currency, tax and place of supply; edit the validity date and terms. Totals, discounts and the tax split update as you type.
  - **Details** tab: every field, including the deal, company and contact, the stored totals, and when the quote was sent, viewed and answered.
  - **Timeline** tab.
- **Create quote** in the command menu of a deal: starts a numbered draft linked to the deal, its company and its point of contact.
- **Quotes** on deals, companies and people, and **Quotes approved** on workspace members.

## The life of a quote

| Status           | What happens                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft            | Editable. Numbered automatically: `Q-2026-0001`, restarting each year.                                                                                                              |
| Pending approval | A line discounted above the approval threshold needs approval first. **Request approval** gives each approver a task on the deal; they approve or reject in one click on the quote. |
| Approved         | Can be sent. A rejection sends the quote back to draft with the approver's reason.                                                                                                  |
| Sent             | **Send quote** stores the totals and opens sharing: email it from your connected mailbox, put it in the contact's WhatsApp chat as a draft, or copy the link or message.            |
| Viewed           | The customer opened the link. The quote counts the views and keeps the first and last view time.                                                                                    |
| Accepted         | The customer typed their name, drew a signature and agreed. The deal amount becomes the quote total, the deal can move to a chosen stage, and a note is added.                      |
| Declined         | The customer declined, optionally with a reason, which is noted on the deal.                                                                                                        |
| Expired          | Past the valid-until date. Set nightly, or the moment someone opens an old link. **Duplicate** starts a fresh draft with the same lines.                                            |

**Edit quote** takes an approved or sent quote back to draft; until it is sent again, the customer link says the quote is being updated. Workflows can trigger on any status change (for example "Quote sent", "Quote viewed", or "Highest discount (%)" above a limit).

## Tax

- **GST (India)**: customers in your state (`SELLER_STATE`) are charged CGST + SGST at half the rate each; other states and customers outside India are charged IGST. Tax is worked out per rate on the total taxable value, as on a GST invoice.
- **VAT** and **Sales tax**: one line per rate.
- **No tax**.

Amounts are rounded to two decimals per line. Exchange rates are not applied: a catalogue price in another currency is copied as is and flagged so the rep can adjust it.

## The customer link

`https://<workspace>.<domain>/s/quotes/view/<quote id>?t=<link key>`. The link key is random and per quote, so quote ids alone do not open quotes. The page shows your name, address, tax number and optional logo and accent colour, laid out for A4; **Download PDF** uses the browser's Save as PDF. **Copy preview link** in the editor gives a version that does not count as a view and cannot be accepted.

When a customer accepts, the quote keeps the typed name, the drawn signature (as SVG path data), the time, the browser and a hash of the network address. This is a click-to-accept e-signature; it is not an Aadhaar eSign.

## Settings

Application variables, editable per workspace after install:

- `SELLER_NAME`, `SELLER_ADDRESS`, `SELLER_TAX_ID`: printed at the top of quotes. Without a name the workspace name is used.
- `SELLER_STATE`: your GST state, e.g. `Maharashtra`.
- `LOGO_URL`, `BRAND_COLOR`: optional logo image address and accent colour (default `#F16205`).
- `DEFAULT_CURRENCY` (default `INR`), `DEFAULT_TAX_SCHEME` (`GST`, `VAT`, `SALES_TAX` or `NONE`), `QUOTE_VALID_DAYS` (default 30), `DEFAULT_TERMS`, `QUOTE_NUMBER_PREFIX` (default `Q`).
- `DISCOUNT_APPROVAL_THRESHOLD`: highest line discount allowed without approval, in percent (default 10).
- `APPROVER_EMAILS`: comma-separated emails of the teammates who approve. Leave empty to switch approvals off.
- `ACCEPTED_DEAL_STAGE`: stage value a deal moves to on acceptance, e.g. `CUSTOMER`. Leave empty to only update the amount.

## Development

Run Yarn through Corepack (`corepack yarn ...`) so the version pinned in `packageManager` is used:

```bash
corepack yarn install
corepack yarn test
corepack yarn twenty remote:add     # point at a Your Jugaad CRM server with an API key
corepack yarn twenty -r <remote> dev
```

Always pass the remote with `-r`: the default remote may be production.

## Heads up

- Approvals are enforced when a quote is sent, but a user who can edit quotes through the API could still change its status directly.
- Two quotes created in the same instant can get the same number; numbers come from the latest quotes of the year.
- A quote added with **+ New** in the Quotes list gets its number and defaults from a background job, so the worker must be running.
