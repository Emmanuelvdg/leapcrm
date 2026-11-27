import { TAX_SCHEME_LABELS } from 'src/constants/quote-options';
import { escapeHtml, toInlineScriptJson } from 'src/utils/escape-html';
import { formatDate, formatMoney } from 'src/utils/format-money';
import { formatRate, type QuoteTotals } from 'src/utils/quote-math';
import { type QuoteRecord } from 'src/utils/quote-records';
import { type QuoteSettings } from 'src/utils/quote-settings';

export const SIGNATURE_VIEWBOX_WIDTH = 600;
export const SIGNATURE_VIEWBOX_HEIGHT = 200;

const pageStyles = (brandColor: string) => `
:root { --brand: ${brandColor}; --ink: #10202E; --muted: #5B6773; --line: #E3E0DA; --ground: #F7F5F1; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--ground); color: var(--ink); font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
.sheet { max-width: 860px; margin: 24px auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(16,32,46,.08), 0 8px 24px rgba(16,32,46,.06); padding: 40px; border-top: 6px solid var(--brand); }
.banner { background: #FFF4E5; border: 1px solid #F5C98B; border-radius: 8px; padding: 10px 14px; margin-bottom: 24px; }
.top { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.seller-name { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
.logo { max-height: 56px; max-width: 220px; display: block; margin-bottom: 8px; }
.muted { color: var(--muted); }
.small { font-size: 12px; }
.doc-title { text-align: right; }
.doc-title h1 { margin: 0; font-size: 26px; letter-spacing: .04em; text-transform: uppercase; color: var(--brand); }
.meta { margin: 6px 0 0; border-collapse: collapse; margin-left: auto; }
.meta td { padding: 1px 0 1px 16px; text-align: right; }
.meta td:first-child { color: var(--muted); }
.parties { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 28px 0 20px; padding: 16px; background: var(--ground); border-radius: 8px; }
.label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin: 0 0 4px; }
.party-name { font-weight: 600; margin: 0; }
.subject { font-size: 17px; font-weight: 600; margin: 0 0 12px; }
.table-wrap { overflow-x: auto; }
table.items { width: 100%; border-collapse: collapse; }
.items th { text-align: left; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); border-bottom: 2px solid var(--ink); padding: 8px 6px; white-space: nowrap; }
.items td { border-bottom: 1px solid var(--line); padding: 10px 6px; vertical-align: top; }
.items .num { text-align: right; white-space: nowrap; }
.totals { margin: 16px 0 0 auto; border-collapse: collapse; min-width: 300px; }
.totals td { padding: 5px 6px; }
.totals td:last-child { text-align: right; white-space: nowrap; }
.totals .grand td { border-top: 2px solid var(--ink); font-size: 17px; font-weight: 700; padding-top: 10px; }
.terms { margin-top: 28px; white-space: pre-wrap; }
.response { margin-top: 32px; padding: 20px; border: 1px solid var(--line); border-radius: 10px; }
.response h2 { margin: 0 0 12px; font-size: 17px; }
.outcome-accepted { border-color: #9AD5A9; background: #F1FAF3; }
.outcome-declined, .outcome-expired { background: var(--ground); }
.signature { display: block; width: 260px; max-width: 100%; height: auto; border-bottom: 1px solid var(--ink); }
.pad { width: 100%; max-width: 600px; aspect-ratio: 3 / 1; border: 1px dashed #A9B0B7; border-radius: 8px; background: #fff; touch-action: none; display: block; cursor: crosshair; }
input[type=text], textarea { width: 100%; max-width: 600px; font: inherit; padding: 9px 11px; border: 1px solid #C9CED3; border-radius: 6px; }
textarea { min-height: 80px; }
.field { margin: 0 0 14px; }
.field > label { display: block; font-weight: 600; margin-bottom: 6px; }
.check { display: flex; gap: 8px; align-items: flex-start; margin: 0 0 16px; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
button { font: inherit; border-radius: 6px; padding: 9px 16px; cursor: pointer; border: 1px solid #C9CED3; background: #fff; color: var(--ink); }
button.primary { background: var(--brand); border-color: var(--brand); color: #fff; font-weight: 600; }
button.link { border: none; background: none; color: var(--muted); text-decoration: underline; padding: 9px 4px; }
button:disabled { opacity: .6; cursor: not-allowed; }
.error { color: #B42318; margin: 0 0 12px; }
.footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 28px; flex-wrap: wrap; }
[hidden] { display: none !important; }
@media (max-width: 640px) { .sheet { margin: 0; border-radius: 0; padding: 20px 16px; } .doc-title { text-align: left; } .meta { margin-left: 0; } .meta td { text-align: left; padding: 1px 16px 1px 0; } }
@page { size: A4; margin: 14mm; }
@media print { body { background: #fff; } .sheet { box-shadow: none; margin: 0; padding: 0; max-width: none; border-top: none; } .no-print { display: none !important; } .items tr { break-inside: avoid; } }
`;

const signatureSvg = (path: string) =>
  `<svg class="signature" viewBox="0 0 ${SIGNATURE_VIEWBOX_WIDTH} ${SIGNATURE_VIEWBOX_HEIGHT}" role="img" aria-label="Signature"><path d="${escapeHtml(path)}" fill="none" stroke="#10202E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const lines = (values: (string | null | undefined)[]) =>
  values
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => `<div>${escapeHtml(value)}</div>`)
    .join('');

const renderItems = (quote: QuoteRecord, totals: QuoteTotals) => {
  const hasHsn = quote.lineItems.some((line) => line.hsnSacCode);
  const hasDiscount = quote.lineItems.some((line) => line.discountPercent > 0);
  const hasTax =
    quote.taxScheme !== 'NONE' &&
    quote.lineItems.some((line) => line.taxRate > 0);
  const taxHeader =
    quote.taxScheme === 'GST'
      ? 'GST'
      : quote.taxScheme === 'VAT'
        ? 'VAT'
        : 'Tax';
  const money = (micros: number) =>
    escapeHtml(formatMoney(micros, quote.currencyCode));

  const rows = quote.lineItems
    .map((line, index) => {
      const amounts = totals.lines[index];

      return `<tr>
<td class="muted">${index + 1}</td>
<td>${escapeHtml(line.name || 'Item')}</td>
${hasHsn ? `<td>${escapeHtml(line.hsnSacCode ?? '')}</td>` : ''}
<td class="num">${escapeHtml(formatRate(line.quantity))}${line.unit ? ` ${escapeHtml(line.unit)}` : ''}</td>
<td class="num">${money(line.unitPrice.amountMicros)}</td>
${hasDiscount ? `<td class="num">${line.discountPercent > 0 ? `${escapeHtml(formatRate(line.discountPercent))}%` : ''}</td>` : ''}
${hasTax ? `<td class="num">${line.taxRate > 0 ? `${escapeHtml(formatRate(line.taxRate))}%` : '0%'}</td>` : ''}
<td class="num">${money(amounts?.netMicros ?? 0)}</td>
</tr>`;
    })
    .join('');

  return `<div class="table-wrap"><table class="items">
<thead><tr><th>#</th><th>Item</th>${hasHsn ? '<th>HSN/SAC</th>' : ''}<th class="num">Qty</th><th class="num">Rate</th>${hasDiscount ? '<th class="num">Discount</th>' : ''}${hasTax ? `<th class="num">${taxHeader}</th>` : ''}<th class="num">Amount</th></tr></thead>
<tbody>${rows || `<tr><td colspan="8" class="muted">No items yet.</td></tr>`}</tbody>
</table></div>`;
};

const renderTotals = (quote: QuoteRecord, totals: QuoteTotals) => {
  const money = (micros: number) =>
    escapeHtml(formatMoney(micros, quote.currencyCode));
  const rows = [
    totals.discountMicros > 0
      ? `<tr><td>Items total</td><td>${money(totals.grossMicros)}</td></tr><tr><td>Discount</td><td>-${money(totals.discountMicros)}</td></tr>`
      : '',
    `<tr><td>${quote.taxScheme === 'NONE' ? 'Subtotal' : 'Taxable value'}</td><td>${money(totals.subtotalMicros)}</td></tr>`,
    ...totals.taxLines.map(
      (taxLine) =>
        `<tr><td>${escapeHtml(taxLine.label)}</td><td>${money(taxLine.amountMicros)}</td></tr>`,
    ),
    `<tr class="grand"><td>Total (${escapeHtml(quote.currencyCode)})</td><td>${money(totals.totalMicros)}</td></tr>`,
  ];

  return `<table class="totals">${rows.join('')}</table>`;
};

const renderResponse = (quote: QuoteRecord, canRespond: boolean) => {
  if (quote.status === 'ACCEPTED') {
    return `<section class="response outcome-accepted">
<h2>Accepted</h2>
<p>Accepted by <strong>${escapeHtml(quote.signerName ?? '')}</strong> on ${escapeHtml(formatDate(quote.respondedAt))}.</p>
${quote.signature ? signatureSvg(quote.signature) : ''}
</section>`;
  }

  if (quote.status === 'DECLINED') {
    return `<section class="response outcome-declined"><h2>Declined</h2><p>This quote was declined on ${escapeHtml(formatDate(quote.respondedAt))}.</p></section>`;
  }

  if (quote.status === 'EXPIRED') {
    return `<section class="response outcome-expired"><h2>Expired</h2><p>This quote expired on ${escapeHtml(formatDate(quote.validUntil))}. Ask your contact for an updated quote.</p></section>`;
  }

  if (!canRespond) {
    return '';
  }

  return `<section class="response no-print" id="respond">
<form id="accept-form" novalidate>
<h2>Accept this quote</h2>
<p class="error" id="accept-error" hidden></p>
<div class="field"><label for="signer-name">Your full name</label><input type="text" id="signer-name" autocomplete="name" maxlength="120" value="${escapeHtml(quote.person?.name ?? '')}"></div>
<div class="field"><label>Signature</label><canvas class="pad" id="pad" width="${SIGNATURE_VIEWBOX_WIDTH}" height="${SIGNATURE_VIEWBOX_HEIGHT}" aria-label="Sign here with your mouse or finger"></canvas><button type="button" class="link" id="clear-pad">Clear signature</button></div>
<label class="check"><input type="checkbox" id="agree"><span>I accept this quote and its terms, and agree that this counts as my signature.</span></label>
<div class="actions"><button type="submit" class="primary" id="accept-button">Accept and sign</button><button type="button" class="link" id="show-decline">Decline this quote</button></div>
</form>
<form id="decline-form" hidden novalidate>
<h2>Decline this quote</h2>
<p class="error" id="decline-error" hidden></p>
<div class="field"><label for="decline-reason">Reason (optional)</label><textarea id="decline-reason" maxlength="1000" placeholder="Let us know what would work better"></textarea></div>
<div class="actions"><button type="submit" id="decline-button">Decline quote</button><button type="button" class="link" id="cancel-decline">Back</button></div>
</form>
</section>`;
};

const PAGE_SCRIPT = `
(function () {
  var config = JSON.parse(document.getElementById('quote-config').textContent);
  var download = document.getElementById('download');
  if (download) download.addEventListener('click', function () { window.print(); });
  var acceptForm = document.getElementById('accept-form');
  if (!acceptForm) return;
  var declineForm = document.getElementById('decline-form');
  var pad = document.getElementById('pad');
  var context = pad.getContext('2d');
  var strokes = [];
  var current = null;
  context.lineWidth = 3; context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#10202E';
  function point(event) {
    var box = pad.getBoundingClientRect();
    return [ (event.clientX - box.left) * pad.width / box.width, (event.clientY - box.top) * pad.height / box.height ];
  }
  pad.addEventListener('pointerdown', function (event) { event.preventDefault(); pad.setPointerCapture(event.pointerId); current = [point(event)]; strokes.push(current); });
  pad.addEventListener('pointermove', function (event) {
    if (!current) return;
    var next = point(event); var last = current[current.length - 1];
    context.beginPath(); context.moveTo(last[0], last[1]); context.lineTo(next[0], next[1]); context.stroke();
    current.push(next);
  });
  function endStroke() { current = null; }
  pad.addEventListener('pointerup', endStroke); pad.addEventListener('pointercancel', endStroke); pad.addEventListener('pointerleave', endStroke);
  document.getElementById('clear-pad').addEventListener('click', function () { strokes = []; context.clearRect(0, 0, pad.width, pad.height); });
  function signaturePath() {
    return strokes.filter(function (stroke) { return stroke.length > 1; }).map(function (stroke) {
      return stroke.map(function (p, index) { return (index === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    }).join(' ');
  }
  function showError(id, message) { var element = document.getElementById(id); element.textContent = message; element.hidden = !message; }
  function send(payload, button, errorId) {
    button.disabled = true; showError(errorId, '');
    payload.t = config.token;
    fetch(config.respondUrl, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload) })
      .then(function (response) { return response.json().catch(function () { return { ok: false }; }); })
      .then(function (result) {
        if (result && result.ok) { window.location.reload(); return; }
        button.disabled = false; showError(errorId, (result && result.message) || 'Something went wrong. Please try again.');
      })
      .catch(function () { button.disabled = false; showError(errorId, 'Could not reach the server. Check your connection and try again.'); });
  }
  acceptForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var name = document.getElementById('signer-name').value.trim();
    var path = signaturePath();
    if (name.length < 2) { showError('accept-error', 'Type your full name to accept.'); return; }
    if (!path) { showError('accept-error', 'Sign in the box to accept.'); return; }
    if (!document.getElementById('agree').checked) { showError('accept-error', 'Tick the box to accept the quote and its terms.'); return; }
    send({ decision: 'accept', signerName: name, signature: path, agreed: true }, document.getElementById('accept-button'), 'accept-error');
  });
  document.getElementById('show-decline').addEventListener('click', function () { acceptForm.hidden = true; declineForm.hidden = false; });
  document.getElementById('cancel-decline').addEventListener('click', function () { declineForm.hidden = true; acceptForm.hidden = false; });
  declineForm.addEventListener('submit', function (event) {
    event.preventDefault();
    send({ decision: 'decline', signerName: document.getElementById('signer-name').value.trim(), reason: document.getElementById('decline-reason').value }, document.getElementById('decline-button'), 'decline-error');
  });
})();
`;

export const renderQuotePage = ({
  quote,
  totals,
  settings,
  sellerName,
  isPreview,
  respondUrl,
  token,
}: {
  quote: QuoteRecord;
  totals: QuoteTotals;
  settings: QuoteSettings;
  sellerName: string;
  isPreview: boolean;
  respondUrl: string;
  token: string;
}): string => {
  const canRespond =
    !isPreview && (quote.status === 'SENT' || quote.status === 'VIEWED');
  const title = `Quote ${quote.quoteNumber ?? ''} from ${sellerName}`;
  const billTo = lines([
    quote.company?.name,
    ...(quote.company?.addressLines ?? []),
    quote.person?.name ? `Attn: ${quote.person.name}` : null,
    quote.person?.email,
  ]);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>${pageStyles(settings.brandColor)}</style>
</head>
<body>
<main class="sheet">
${isPreview ? `<div class="banner no-print"><strong>Preview.</strong> This is how the customer will see the quote. Views are not counted and it cannot be accepted here.${quote.status === 'DRAFT' || quote.status === 'PENDING_APPROVAL' || quote.status === 'APPROVED' ? ' The customer link only works once the quote is sent.' : ''}</div>` : ''}
<div class="top">
<div>
${settings.logoUrl ? `<img class="logo" src="${escapeHtml(settings.logoUrl)}" alt="${escapeHtml(sellerName)}">` : ''}
<p class="seller-name">${escapeHtml(sellerName)}</p>
<div class="muted small">${lines((settings.sellerAddress ?? '').split(/\r?\n/))}${settings.sellerTaxId ? `<div>${quote.taxScheme === 'GST' ? 'GSTIN' : 'Tax ID'}: ${escapeHtml(settings.sellerTaxId)}</div>` : ''}</div>
</div>
<div class="doc-title">
<h1>Quotation</h1>
<table class="meta">
<tr><td>Quote no.</td><td><strong>${escapeHtml(quote.quoteNumber ?? '')}</strong></td></tr>
<tr><td>Date</td><td>${escapeHtml(formatDate(quote.sentAt ?? quote.createdAt))}</td></tr>
${quote.validUntil ? `<tr><td>Valid until</td><td>${escapeHtml(formatDate(quote.validUntil))}</td></tr>` : ''}
</table>
</div>
</div>
<div class="parties">
<div><p class="label">Prepared for</p>${billTo || '<p class="muted">Customer</p>'}</div>
${quote.taxScheme === 'GST' && quote.placeOfSupply ? `<div><p class="label">Place of supply</p><p class="party-name">${escapeHtml(quote.placeOfSupply)}</p></div>` : ''}
<div><p class="label">Tax</p><p class="party-name">${escapeHtml(TAX_SCHEME_LABELS[quote.taxScheme])}</p></div>
</div>
${quote.name ? `<p class="subject">${escapeHtml(quote.name)}</p>` : ''}
${renderItems(quote, totals)}
${renderTotals(quote, totals)}
${quote.terms ? `<section class="terms"><p class="label">Terms</p>${escapeHtml(quote.terms)}</section>` : ''}
${renderResponse(quote, canRespond)}
<div class="footer no-print">
<span class="muted small">${escapeHtml(title)}</span>
<button type="button" id="download">Download PDF</button>
</div>
</main>
<script type="application/json" id="quote-config">${toInlineScriptJson({ respondUrl, token })}</script>
<script>${PAGE_SCRIPT}</script>
</body>
</html>`;
};

export const renderMessagePage = ({
  title,
  message,
  brandColor,
}: {
  title: string;
  message: string;
  brandColor: string;
}): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>${pageStyles(brandColor)}</style>
</head>
<body>
<main class="sheet"><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(message)}</p></main>
</body>
</html>`;
