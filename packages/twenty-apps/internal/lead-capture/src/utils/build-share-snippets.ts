import { type FormField } from 'src/constants/form-field-options';
import { FORM_ROUTE_BASE_PATH } from 'src/constants/lead-capture-settings';

const EXAMPLE_ANSWERS: Partial<Record<FormField['mapsTo'], string>> = {
  'person.fullName': 'Priya Shah',
  'person.firstName': 'Priya',
  'person.lastName': 'Shah',
  'person.email': 'priya@example.com',
  'person.phone': '+91 98765 43210',
  'person.jobTitle': 'Head of Operations',
  'company.name': 'Globex',
};

export const buildFormUrl = (baseUrl: string, formId: string): string =>
  `${baseUrl.replace(/\/+$/, '')}/s${FORM_ROUTE_BASE_PATH}/${formId}`;

export const buildSubmitUrl = (baseUrl: string, formId: string): string =>
  `${buildFormUrl(baseUrl, formId)}/submissions`;

// The script passes the host page's address and UTM tags into the iframe,
// grows the iframe to fit the form, and follows the form's redirect, which a
// cross-site iframe cannot do on its own.
export const buildIframeSnippet = ({
  formUrl,
  formId,
  title,
}: {
  formUrl: string;
  formId: string;
  title: string;
}): string => {
  const elementId = `lead-form-${formId}`;
  const safeTitle = title.replace(/"/g, '&quot;');

  return `<iframe id="${elementId}" src="${formUrl}" title="${safeTitle}" style="width:100%;max-width:560px;border:0;min-height:640px" loading="lazy"></iframe>
<script>
(function () {
  var frame = document.getElementById('${elementId}');
  var params = new URLSearchParams(window.location.search);
  params.set('page_url', window.location.href);
  if (document.referrer) params.set('referrer', document.referrer);
  frame.src = frame.src.split('?')[0] + '?' + params.toString();
  window.addEventListener('message', function (event) {
    var data = event.data || {};
    if (event.source !== frame.contentWindow || data.formId !== '${formId}') return;
    if (data.type === 'lead-capture:resize') frame.style.height = data.height + 'px';
    if (data.type === 'lead-capture:redirect' && /^https?:\\/\\//.test(data.url)) window.location.href = data.url;
  });
})();
</script>`;
};

export const buildExamplePayload = (
  fields: FormField[],
): Record<string, string> => {
  const payload: Record<string, string> = {};

  for (const field of fields) {
    payload[field.key] =
      EXAMPLE_ANSWERS[field.mapsTo] ??
      (field.type === 'select' ? (field.options[0] ?? '') : 'Example answer');
  }

  payload.utm_source = 'google';
  payload.utm_campaign = 'spring-launch';

  return payload;
};

export const buildCurlExample = ({
  submitUrl,
  fields,
}: {
  submitUrl: string;
  fields: FormField[];
}): string =>
  `curl -X POST '${submitUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(buildExamplePayload(fields), null, 2).replace(/'/g, "'\\''")}'`;
