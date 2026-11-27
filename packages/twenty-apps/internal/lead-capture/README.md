# Lead capture

**Turn website and campaign enquiries into contacts and deals, without copying anything by hand.** Build a form in the CRM, share it as a link, embed it on any website, or post to it from your own forms and tools. Every submission is checked for spam, matched to existing contacts, tagged with where it came from and logged.

## What you get

- **Lead forms**, a new object (sidebar: Lead capture > Lead forms). Each form has:
  - **Build & share** tab: add, reorder and remove questions, choose where each answer is saved, and copy the form link, the website embed code and an API example.
  - **Settings** tab: headline, intro, button text, thank-you message, optional redirect address, allowed websites, whether to create a deal, the deal stage and owner, and the lead source.
- **Form submissions**, a log of every enquiry with its answers, UTM tags, page and referrer, and links to the contact, company and deal it created or matched. Workflows can trigger on new submissions to notify or assign reps.
- On **People**: Lead source, Lead source medium and Lead source campaign (first touch).
- A starter **Website enquiry** form, created on install.

## Three ways to capture leads

| Where                                         | How                                                                                                                                                                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A link (WhatsApp, social, QR code, email)     | Share the form link. Add `?utm_source=…&utm_campaign=…` to track the channel.                                                                                                                                                                                                                    |
| Any website                                   | Paste the embed snippet. It resizes itself, passes the page's UTM tags to the form and follows the form's redirect.                                                                                                                                                                              |
| Your own form, landing page or another system | `POST` to `https://<workspace>.<domain>/s/lead-capture/forms/<form id>/submissions` as JSON or a plain HTML form post, using the field names shown in the builder. Answers to `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `page_url` and `referrer` are recorded too. |

The endpoint answers JSON (`{ "ok": true, "submissionId": "…" }`, or `400` with `errors` per field) unless the request is a plain HTML form post, which gets a thank-you page.

## What happens to a submission

1. **Spam checks**: a hidden honeypot field and a minimum fill time quietly drop bots; one visitor can send at most 5 submissions per form in 10 minutes; if **Allowed websites** is set, browsers on other sites are refused.
2. **Validation**: required answers, email and phone format, drop-down options, and at least an email or a phone number.
3. **Contact**: matched by email, then by phone. An existing contact keeps every value it already has; only empty fields are filled. A new contact gets the name, email, phone, job title and lead source.
4. **Company**: found by name (or by a business email domain), or created from the company answer.
5. **Deal** (if the form creates deals): a contact who already has an open deal keeps it; otherwise a new deal opens in the form's stage with the form's owner.
6. **Note** on the contact and deal with every answer and the source, and a **Form submission** record.

Anything that could not be saved as asked (for example a phone number the CRM rejects) is kept in the note and in the submission's **Problems** field, and the lead is still saved.

## Settings

Application variables, editable per workspace after install:

- `DEFAULT_PHONE_COUNTRY`: country used for phone numbers typed without a `+` country code. Default `IN`.
- `CLOSED_STAGES`: comma-separated stage values that mean a deal is finished. Default `CUSTOMER,LOST`.

## Privacy

Visitor IP addresses are never stored: only a one-way hash per form, used for the rate limit.

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

- Only the contact's primary email is matched; an address stored in their additional emails is not.
- Phone matching compares the full international number, so a number saved without its country code only matches when it is at least 8 digits long.
- Rate limiting relies on the visitor IP forwarded by the reverse proxy (`X-Forwarded-For`, `X-Real-IP` or `CF-Connecting-IP`). Without one, the per-visitor limit does not apply.
