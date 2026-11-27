import { type FormField } from 'src/constants/form-field-options';
import {
  HONEYPOT_FIELD_NAME,
  PAGE_URL_FIELD_NAME,
  REFERRER_FIELD_NAME,
  RENDERED_AT_FIELD_NAME,
  UTM_FIELD_NAMES,
} from 'src/constants/lead-capture-settings';
import { escapeHtml, toInlineScriptJson } from 'src/utils/escape-html';
import { PAGE_STYLES } from 'src/utils/page-styles';

export type RenderableLeadForm = {
  headline: string;
  intro: string | null;
  submitLabel: string;
  successMessage: string;
  redirectUrl: string | null;
};

const INPUT_TYPES: Record<FormField['type'], string> = {
  text: 'text',
  email: 'email',
  phone: 'tel',
  textarea: 'text',
  select: 'text',
};

const AUTOCOMPLETE: Partial<Record<FormField['mapsTo'], string>> = {
  'person.fullName': 'name',
  'person.firstName': 'given-name',
  'person.lastName': 'family-name',
  'person.email': 'email',
  'person.phone': 'tel',
  'person.jobTitle': 'organization-title',
  'company.name': 'organization',
};

const renderControl = (field: FormField): string => {
  const id = `f_${field.key}`;
  const common = `id="${id}" name="${escapeHtml(field.key)}"${field.required ? ' required' : ''}`;
  const placeholder = field.placeholder
    ? ` placeholder="${escapeHtml(field.placeholder)}"`
    : '';
  const autocomplete = AUTOCOMPLETE[field.mapsTo]
    ? ` autocomplete="${AUTOCOMPLETE[field.mapsTo]}"`
    : '';

  if (field.type === 'textarea') {
    return `<textarea ${common}${placeholder}></textarea>`;
  }

  if (field.type === 'select') {
    const options = field.options
      .map(
        (option) =>
          `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`,
      )
      .join('');

    return `<select ${common}><option value="">Choose…</option>${options}</select>`;
  }

  return `<input type="${INPUT_TYPES[field.type]}" ${common}${placeholder}${autocomplete}>`;
};

const renderField = (field: FormField): string =>
  `<div class="field" data-key="${escapeHtml(field.key)}">` +
  `<label for="f_${field.key}">${escapeHtml(field.label)}${field.required ? '<span class="required" aria-hidden="true">*</span>' : ''}</label>` +
  renderControl(field) +
  `<div class="error" role="alert"></div></div>`;

// Fills the hidden source fields from the page URL (or, inside the embed
// iframe, from the parent page passed in by the snippet), submits with fetch,
// and tells an embedding page its new height and where to redirect.
const FORM_SCRIPT = `
(function(){
  var config = window.__leadForm;
  var form = document.getElementById('lead-form');
  var params = new URLSearchParams(window.location.search);
  var embedded = window.parent !== window;
  if (embedded) document.body.classList.add('embedded');
  function setHidden(name, value){ var input = form.elements[name]; if (input && value) input.value = value; }
  config.sourceFields.forEach(function(name){ setHidden(name, params.get(name)); });
  setHidden('${PAGE_URL_FIELD_NAME}', params.get('${PAGE_URL_FIELD_NAME}') || (embedded ? document.referrer : window.location.href));
  setHidden('${REFERRER_FIELD_NAME}', params.get('${REFERRER_FIELD_NAME}') || (embedded ? '' : document.referrer));
  function notifyHeight(){ if (embedded) window.parent.postMessage({ type: 'lead-capture:resize', formId: config.formId, height: document.documentElement.scrollHeight }, '*'); }
  window.addEventListener('load', notifyHeight);
  if (window.ResizeObserver) new ResizeObserver(notifyHeight).observe(document.body);
  function showErrors(errors){
    form.querySelectorAll('.field').forEach(function(field){
      var message = errors[field.getAttribute('data-key')] || '';
      field.classList.toggle('invalid', !!message);
      field.querySelector('.error').textContent = message;
    });
  }
  function showDone(){
    var done = document.createElement('div');
    done.className = 'done';
    var title = document.createElement('h2'); title.textContent = 'Thank you!';
    var text = document.createElement('p'); text.textContent = config.successMessage;
    done.appendChild(title); done.appendChild(text);
    form.replaceWith(done);
    notifyHeight();
  }
  form.addEventListener('submit', function(event){
    event.preventDefault();
    var button = form.querySelector('button');
    var formError = document.getElementById('form-error');
    formError.textContent = '';
    button.disabled = true;
    var payload = {};
    new FormData(form).forEach(function(value, key){ payload[key] = value; });
    fetch(config.submitUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) })
      .then(function(response){ return response.json().catch(function(){ return {}; }).then(function(data){ return { ok: response.ok, data: data }; }); })
      .then(function(result){
        button.disabled = false;
        if (result.ok) {
          if (config.redirectUrl) {
            if (embedded) window.parent.postMessage({ type: 'lead-capture:redirect', formId: config.formId, url: config.redirectUrl }, '*');
            else window.location.href = config.redirectUrl;
            return;
          }
          showDone();
          return;
        }
        if (result.data && result.data.errors) { showErrors(result.data.errors); notifyHeight(); return; }
        formError.textContent = (result.data && result.data.message) || 'Something went wrong. Please try again.';
        notifyHeight();
      })
      .catch(function(){ button.disabled = false; formError.textContent = 'Could not send the form. Check your connection and try again.'; notifyHeight(); });
  });
})();
`;

export const renderFormPage = ({
  formId,
  form,
  fields,
  submitUrl,
  renderedAtMs,
}: {
  formId: string;
  form: RenderableLeadForm;
  fields: FormField[];
  submitUrl: string;
  renderedAtMs: number;
}): string => {
  const hiddenSourceFields = [
    ...UTM_FIELD_NAMES,
    PAGE_URL_FIELD_NAME,
    REFERRER_FIELD_NAME,
  ]
    .map((name) => `<input type="hidden" name="${name}">`)
    .join('');

  const config = {
    formId,
    submitUrl,
    successMessage: form.successMessage,
    redirectUrl: form.redirectUrl,
    sourceFields: UTM_FIELD_NAMES,
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(form.headline)}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<main>
<div class="card">
<h1>${escapeHtml(form.headline)}</h1>
${form.intro ? `<p class="intro">${escapeHtml(form.intro)}</p>` : ''}
<form id="lead-form" method="post" action="${escapeHtml(submitUrl)}" novalidate>
<p id="form-error" class="form-error" role="alert"></p>
${fields.map(renderField).join('\n')}
<div class="hp" aria-hidden="true"><label for="${HONEYPOT_FIELD_NAME}">Leave this empty</label><input type="text" id="${HONEYPOT_FIELD_NAME}" name="${HONEYPOT_FIELD_NAME}" tabindex="-1" autocomplete="off"></div>
<input type="hidden" name="${RENDERED_AT_FIELD_NAME}" value="${renderedAtMs}">
${hiddenSourceFields}
<button type="submit">${escapeHtml(form.submitLabel)}</button>
</form>
</div>
</main>
<script>window.__leadForm=${toInlineScriptJson(config)};${FORM_SCRIPT}</script>
</body>
</html>`;
};

export const renderMessagePage = ({
  title,
  message,
  details = [],
  backLink = false,
  redirectUrl = null,
}: {
  title: string;
  message: string;
  details?: string[];
  backLink?: boolean;
  redirectUrl?: string | null;
}): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
${redirectUrl ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">` : ''}
<title>${escapeHtml(title)}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<main>
<div class="card done">
<h2>${escapeHtml(title)}</h2>
<p>${escapeHtml(message)}</p>
${details.length > 0 ? `<ul style="text-align:left;color:#cf222e">${details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join('')}</ul>` : ''}
${backLink ? '<p style="margin-top:16px"><a href="javascript:history.back()">Go back to the form</a></p>' : ''}
</div>
</main>
</body>
</html>`;
