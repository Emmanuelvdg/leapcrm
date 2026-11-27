import { describe, expect, it } from 'vitest';

import { DEFAULT_FORM_FIELDS } from 'src/constants/form-field-options';
import {
  buildCurlExample,
  buildExamplePayload,
  buildFormUrl,
  buildIframeSnippet,
  buildSubmitUrl,
} from 'src/utils/build-share-snippets';
import { buildSubmissionNote } from 'src/utils/build-submission-note';
import { toLeadForm } from 'src/utils/fetch-lead-form';
import {
  describeLead,
  getBusinessEmailDomain,
  mapAnswers,
  splitFullName,
} from 'src/utils/map-answers';
import { parseFormFields } from 'src/utils/parse-form-fields';
import { renderFormPage, renderMessagePage } from 'src/utils/render-form-page';

describe('renderFormPage', () => {
  const fields = parseFormFields([
    {
      label: 'Name <b>',
      key: 'name',
      mapsTo: 'person.fullName',
      required: true,
    },
    {
      label: 'Budget',
      key: 'budget',
      type: 'select',
      options: ['"Low"', 'High'],
    },
  ]);

  const html = renderFormPage({
    formId: 'form-1',
    form: {
      headline: 'Talk to us </script><script>alert(1)</script>',
      intro: null,
      submitLabel: 'Send',
      successMessage: 'Thanks </script>',
      redirectUrl: null,
    },
    fields,
    submitUrl: '/s/lead-capture/forms/form-1/submissions',
    renderedAtMs: 123,
  });

  it('renders every field with the spam markers', () => {
    expect(html).toContain('name="name" required');
    expect(html).toContain('<option value="&quot;Low&quot;">');
    expect(html).toContain('name="_lc_website"');
    expect(html).toContain('name="_lc_t" value="123"');
    expect(html).toContain('name="utm_source"');
  });

  it('escapes form text in HTML and in the inline script', () => {
    expect(html).toContain('Name &lt;b&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('Thanks </script>');
  });

  it('renders a message page with an optional redirect', () => {
    expect(
      renderMessagePage({
        title: 'Thank you!',
        message: 'Sent',
        redirectUrl: 'https://acme.example/thanks',
      }),
    ).toContain('url=https://acme.example/thanks');
  });
});

describe('toLeadForm', () => {
  it('fills defaults and only keeps web redirects', () => {
    const form = toLeadForm({
      id: 'form-1',
      name: 'Website enquiry',
      status: 'ACTIVE',
      headline: null,
      intro: '',
      submitLabel: null,
      successMessage: null,
      redirectUrl: 'javascript:alert(1)',
      formFields: [],
      allowedDomains: 'acme.example',
      createDeal: null,
      dealStage: ' ',
      dealOwnerId: null,
      leadSource: null,
    });

    expect(form).toEqual(
      expect.objectContaining({
        isActive: true,
        headline: 'Website enquiry',
        intro: null,
        submitLabel: 'Send',
        redirectUrl: null,
        allowedDomains: ['acme.example'],
        createDeal: true,
        dealStage: null,
        leadSource: 'Website enquiry',
      }),
    );
    expect(
      toLeadForm({
        id: 'form-1',
        name: 'x',
        status: 'PAUSED',
        headline: null,
        intro: null,
        submitLabel: null,
        successMessage: null,
        redirectUrl: 'https://acme.example/thanks',
        formFields: [],
        allowedDomains: null,
        createDeal: false,
        dealStage: null,
        dealOwnerId: null,
        leadSource: null,
      }),
    ).toEqual(
      expect.objectContaining({
        isActive: false,
        redirectUrl: 'https://acme.example/thanks',
        createDeal: false,
      }),
    );
  });
});

describe('mapAnswers', () => {
  it('maps answers to contact and company fields and lists them all', () => {
    const mapped = mapAnswers(DEFAULT_FORM_FIELDS, {
      full_name: 'Priya Rao Shah',
      email: 'Priya@Globex.example',
      phone: '+91 98765 43210',
      company: 'Globex',
      message: 'Need a quote',
    });

    expect(mapped).toEqual({
      firstName: 'Priya',
      lastName: 'Rao Shah',
      email: 'priya@globex.example',
      phone: '+91 98765 43210',
      jobTitle: null,
      companyName: 'Globex',
      answerList: [
        { label: 'Full name', value: 'Priya Rao Shah' },
        { label: 'Email', value: 'Priya@Globex.example' },
        { label: 'Phone / WhatsApp', value: '+91 98765 43210' },
        { label: 'Company', value: 'Globex' },
        { label: 'How can we help?', value: 'Need a quote' },
      ],
    });
    expect(describeLead(mapped)).toBe('Priya Rao Shah');
  });

  it('splits names and ignores personal email domains', () => {
    expect(splitFullName('  Priya  ')).toEqual({
      firstName: 'Priya',
      lastName: '',
    });
    expect(getBusinessEmailDomain('a@gmail.com')).toBeNull();
    expect(getBusinessEmailDomain('a@Globex.example')).toBe('globex.example');
  });
});

describe('buildSubmissionNote', () => {
  it('lists answers, source and problems', () => {
    expect(
      buildSubmissionNote({
        formName: 'Website enquiry',
        answerList: [{ label: 'Message', value: 'Line 1\nLine 2' }],
        meta: {
          utmSource: 'google',
          utmMedium: 'cpc',
          utmCampaign: null,
          utmTerm: null,
          utmContent: null,
          pageUrl: 'https://acme.example/contact',
          referrer: null,
        },
        problems: ['The phone number could not be saved.'],
      }),
    ).toEqual({
      title: 'Form: Website enquiry',
      markdown: [
        '- **Message:** Line 1\n  Line 2',
        '',
        'Submitted through the **Website enquiry** form.',
        'Source: google / cpc',
        'Page: https://acme.example/contact',
        'Note: The phone number could not be saved.',
      ].join('\n'),
    });
  });
});

describe('share snippets', () => {
  const baseUrl = 'https://acra-demo.leapcrm.tech/';

  it('builds the form and submit addresses on the workspace domain', () => {
    expect(buildFormUrl(baseUrl, 'form-1')).toBe(
      'https://acra-demo.leapcrm.tech/s/lead-capture/forms/form-1',
    );
    expect(buildSubmitUrl(baseUrl, 'form-1')).toBe(
      'https://acra-demo.leapcrm.tech/s/lead-capture/forms/form-1/submissions',
    );
  });

  it('builds an embed snippet tied to its own iframe', () => {
    const snippet = buildIframeSnippet({
      formUrl: 'https://x.example/s/lead-capture/forms/form-1',
      formId: 'form-1',
      title: 'Say "hi"',
    });

    expect(snippet).toContain('id="lead-form-form-1"');
    expect(snippet).toContain('title="Say &quot;hi&quot;"');
    expect(snippet).toContain('event.source !== frame.contentWindow');
  });

  it('builds an API example with every field', () => {
    expect(buildExamplePayload(DEFAULT_FORM_FIELDS)).toEqual(
      expect.objectContaining({
        full_name: 'Priya Shah',
        email: 'priya@example.com',
        message: 'Example answer',
        utm_source: 'google',
      }),
    );
    expect(
      buildCurlExample({
        submitUrl: 'https://x.example/s/a',
        fields: DEFAULT_FORM_FIELDS,
      }),
    ).toContain("curl -X POST 'https://x.example/s/a'");
  });
});
