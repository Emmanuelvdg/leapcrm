import { type CSSProperties, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  copyToClipboard,
  enqueueSnackbar,
  useRecordId,
} from 'twenty-sdk/front-component';

import {
  FORM_FIELD_TARGET_LABELS,
  FORM_FIELD_TARGETS,
  FORM_FIELD_TYPE_LABELS,
  FORM_FIELD_TYPES,
  type FormField,
  type FormFieldTarget,
  type FormFieldType,
} from 'src/constants/form-field-options';
import { FORM_BUILDER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { onValueChange } from 'src/front-components/utils/read-event-value';
import {
  buildCurlExample,
  buildFormUrl,
  buildIframeSnippet,
  buildSubmitUrl,
} from 'src/utils/build-share-snippets';
import {
  hasContactField,
  parseFormFields,
  toFieldKey,
  toStoredFormFields,
} from 'src/utils/parse-form-fields';

// Theme tokens are inlined as CSS-variable values: the SDK mocks the UI package
// during manifest extraction, so importing them at module level would be undefined.
const theme = {
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
  spacing3: 'var(--t-spacing-3)',
  spacing4: 'var(--t-spacing-4)',
  spacing8: 'var(--t-spacing-8)',
  bgPrimary: 'var(--t-background-primary)',
  bgSecondary: 'var(--t-background-secondary)',
  bgOrange: 'var(--t-background-transparent-orange)',
  borderMedium: 'var(--t-border-color-medium)',
  borderLight: 'var(--t-border-color-light)',
  radiusSm: 'var(--t-border-radius-sm)',
  radiusMd: 'var(--t-border-radius-md)',
  fontPrimary: 'var(--t-font-color-primary)',
  fontSecondary: 'var(--t-font-color-secondary)',
  fontTertiary: 'var(--t-font-color-tertiary)',
  fontInverted: 'var(--t-font-color-inverted)',
  fontFamily: 'var(--t-font-family)',
  sizeXs: 'var(--t-font-size-xs)',
  sizeSm: 'var(--t-font-size-sm)',
  sizeMd: 'var(--t-font-size-md)',
  weightMedium: 'var(--t-font-weight-medium)',
  weightSemiBold: 'var(--t-font-weight-semi-bold)',
  blue: 'var(--t-color-blue)',
};

const styles: Record<string, CSSProperties> = {
  container: {
    background: theme.bgPrimary,
    boxSizing: 'border-box',
    color: theme.fontPrimary,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    gap: theme.spacing4,
    height: '100%',
    overflowY: 'auto',
    padding: theme.spacing4,
    width: '100%',
  },
  section: {
    border: `1px solid ${theme.borderLight}`,
    borderRadius: theme.radiusMd,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing3,
    padding: theme.spacing4,
  },
  sectionTitle: {
    fontSize: theme.sizeMd,
    fontWeight: theme.weightSemiBold,
    margin: 0,
  },
  helper: { color: theme.fontTertiary, fontSize: theme.sizeXs, margin: 0 },
  label: {
    color: theme.fontSecondary,
    fontSize: theme.sizeXs,
    fontWeight: theme.weightMedium,
  },
  row: {
    background: theme.bgSecondary,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusMd,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing2,
    padding: theme.spacing3,
  },
  rowGrid: {
    display: 'grid',
    gap: theme.spacing2,
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  },
  input: {
    background: theme.bgPrimary,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    boxSizing: 'border-box',
    color: theme.fontPrimary,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    height: theme.spacing8,
    padding: `0 ${theme.spacing2}`,
    width: '100%',
  },
  code: {
    background: theme.bgSecondary,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: theme.sizeXs,
    margin: 0,
    maxHeight: '180px',
    overflow: 'auto',
    padding: theme.spacing3,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  buttonRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing2,
  },
  button: {
    background: theme.bgPrimary,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    color: theme.fontSecondary,
    cursor: 'pointer',
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    fontWeight: theme.weightMedium,
    height: theme.spacing8,
    padding: `0 ${theme.spacing3}`,
  },
  primaryButton: {
    background: theme.blue,
    border: '1px solid transparent',
    color: theme.fontInverted,
  },
  smallButton: { fontSize: theme.sizeXs, height: 'auto', padding: '2px 8px' },
  disabledButton: { cursor: 'not-allowed', opacity: 0.5 },
  notice: {
    background: theme.bgOrange,
    borderRadius: theme.radiusMd,
    margin: 0,
    padding: theme.spacing3,
  },
};

type EditableField = {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  mapsTo: FormFieldTarget;
  optionsText: string;
  placeholder: string;
};

const toEditable = (field: FormField): EditableField => ({
  key: field.key,
  label: field.label,
  type: field.type,
  required: field.required,
  mapsTo: field.mapsTo,
  optionsText: field.options.join(', '),
  placeholder: field.placeholder ?? '',
});

const toFormFieldInput = (field: EditableField) => ({
  key: field.key || toFieldKey(field.label),
  label: field.label,
  type: field.type,
  required: field.required,
  mapsTo: field.mapsTo,
  options: field.optionsText.split(',').map((option) => option.trim()),
  placeholder: field.placeholder,
});

type LoadedForm = { id: string; name: string; fields: FormField[] };

const useLeadFormData = (formId: string | null) => {
  const [form, setForm] = useState<LoadedForm | undefined>();
  const [baseUrl, setBaseUrl] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    if (formId === null) {
      return;
    }

    let isCancelled = false;

    const load = async () => {
      try {
        const [{ leadForm }, { currentWorkspace }] = await Promise.all([
          new CoreApiClient().query({
            leadForm: {
              __args: { filter: { id: { eq: formId } } },
              id: true,
              name: true,
              formFields: true,
            },
          }),
          new MetadataApiClient().query({
            currentWorkspace: {
              workspaceUrls: { subdomainUrl: true, customUrl: true },
            },
          }),
        ]);

        if (isCancelled) {
          return;
        }

        const node = leadForm as {
          id: string;
          name: string | null;
          formFields: unknown;
        } | null;
        const urls = (
          currentWorkspace as {
            workspaceUrls: {
              subdomainUrl: string | null;
              customUrl: string | null;
            };
          } | null
        )?.workspaceUrls;

        setForm(
          node
            ? {
                id: node.id,
                name: node.name || 'Lead form',
                fields: parseFormFields(node.formFields),
              }
            : undefined,
        );
        setBaseUrl(urls?.customUrl || urls?.subdomainUrl || undefined);
      } catch {
        if (!isCancelled) {
          setErrorMessage('Could not load this form. Please try again later.');
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [formId]);

  return { form, baseUrl, errorMessage };
};

const CopyBlock = ({
  title,
  helper,
  text,
}: {
  title: string;
  helper: string;
  text: string;
}) => (
  <div
    style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing2 }}
  >
    <div style={styles.buttonRow}>
      <span style={{ ...styles.label, flex: 1 }}>{title}</span>
      <button
        type="button"
        style={{ ...styles.button, ...styles.smallButton }}
        onClick={() => {
          void copyToClipboard(text);
        }}
      >
        Copy
      </button>
    </div>
    <p style={styles.helper}>{helper}</p>
    <pre style={styles.code}>{text}</pre>
  </div>
);

type FieldEditorProps = {
  field: EditableField;
  index: number;
  count: number;
  onChange: (field: EditableField) => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
};

const FieldEditor = ({
  field,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: FieldEditorProps) => (
  <div style={styles.row}>
    <div style={styles.rowGrid}>
      <label style={styles.label}>
        Question
        <input
          style={styles.input}
          value={field.label}
          onInput={onValueChange((label) => onChange({ ...field, label }))}
          onChange={onValueChange((label) => onChange({ ...field, label }))}
        />
      </label>
      <label style={styles.label}>
        Answer type
        <select
          style={styles.input}
          value={field.type}
          onChange={onValueChange((type) =>
            onChange({ ...field, type: type as FormFieldType }),
          )}
        >
          {FORM_FIELD_TYPES.map((type) => (
            <option key={type} value={type}>
              {FORM_FIELD_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
      <label style={styles.label}>
        Save answer to
        <select
          style={styles.input}
          value={field.mapsTo}
          onChange={onValueChange((mapsTo) =>
            onChange({ ...field, mapsTo: mapsTo as FormFieldTarget }),
          )}
        >
          {FORM_FIELD_TARGETS.map((target) => (
            <option key={target} value={target}>
              {FORM_FIELD_TARGET_LABELS[target]}
            </option>
          ))}
        </select>
      </label>
    </div>
    {field.type === 'select' && (
      <label style={styles.label}>
        Options, separated by commas
        <input
          style={styles.input}
          value={field.optionsText}
          onInput={onValueChange((optionsText) =>
            onChange({ ...field, optionsText }),
          )}
          onChange={onValueChange((optionsText) =>
            onChange({ ...field, optionsText }),
          )}
        />
      </label>
    )}
    <div style={styles.buttonRow}>
      <button
        type="button"
        style={{
          ...styles.button,
          ...styles.smallButton,
          ...(field.required ? styles.primaryButton : {}),
        }}
        onClick={() => onChange({ ...field, required: !field.required })}
      >
        {field.required ? 'Required' : 'Optional'}
      </button>
      <span style={{ ...styles.helper, flex: 1 }}>
        Field name: {field.key || toFieldKey(field.label) || '—'}
      </span>
      <button
        type="button"
        style={{
          ...styles.button,
          ...styles.smallButton,
          ...(index === 0 ? styles.disabledButton : {}),
        }}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        Up
      </button>
      <button
        type="button"
        style={{
          ...styles.button,
          ...styles.smallButton,
          ...(index === count - 1 ? styles.disabledButton : {}),
        }}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        Down
      </button>
      <button
        type="button"
        style={{ ...styles.button, ...styles.smallButton }}
        onClick={onRemove}
      >
        Remove
      </button>
    </div>
  </div>
);

const FormBuilderEditor = ({
  form,
  baseUrl,
}: {
  form: LoadedForm;
  baseUrl: string | undefined;
}) => {
  const [fields, setFields] = useState<EditableField[]>(() =>
    form.fields.map(toEditable),
  );
  const [savedFields, setSavedFields] = useState<FormField[]>(form.fields);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateFields = (nextFields: EditableField[]) => {
    setFields(nextFields);
    setIsDirty(true);
  };

  const handleSave = async () => {
    const parsedFields = parseFormFields(fields.map(toFormFieldInput));

    setIsSaving(true);

    try {
      await new CoreApiClient().mutation({
        updateLeadForm: {
          __args: {
            id: form.id,
            data: { formFields: toStoredFormFields(parsedFields) },
          },
          id: true,
        },
      });
      setSavedFields(parsedFields);
      setFields(parsedFields.map(toEditable));
      setIsDirty(false);
      await enqueueSnackbar({ message: 'Form saved.', variant: 'success' });
    } catch {
      await enqueueSnackbar({
        message: 'Could not save the form.',
        variant: 'error',
      });
    }

    setIsSaving(false);
  };

  const formUrl = baseUrl ? buildFormUrl(baseUrl, form.id) : undefined;
  const submitUrl = baseUrl ? buildSubmitUrl(baseUrl, form.id) : undefined;
  const previewFields = parseFormFields(fields.map(toFormFieldInput));

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <p style={styles.sectionTitle}>Questions</p>
        <p style={styles.helper}>
          Each answer is saved on the contact, company or deal you choose, and
          every answer is also kept in a note on the contact.
        </p>
        {!hasContactField(previewFields) && (
          <p style={styles.notice}>
            Add an email or phone question: without one, enquiries cannot be
            matched to existing contacts or followed up.
          </p>
        )}
        {fields.map((field, index) => (
          <FieldEditor
            key={`${index}-${field.key}`}
            field={field}
            index={index}
            count={fields.length}
            onChange={(nextField) =>
              updateFields(
                fields.map((current, currentIndex) =>
                  currentIndex === index ? nextField : current,
                ),
              )
            }
            onMove={(offset) => {
              const nextFields = [...fields];
              const [moved] = nextFields.splice(index, 1);

              nextFields.splice(index + offset, 0, moved);
              updateFields(nextFields);
            }}
            onRemove={() =>
              updateFields(
                fields.filter((_, currentIndex) => currentIndex !== index),
              )
            }
          />
        ))}
        <div style={styles.buttonRow}>
          <button
            type="button"
            style={styles.button}
            onClick={() =>
              updateFields([
                ...fields,
                {
                  key: '',
                  label: `Question ${fields.length + 1}`,
                  type: 'text',
                  required: false,
                  mapsTo: 'note',
                  optionsText: '',
                  placeholder: '',
                },
              ])
            }
          >
            Add question
          </button>
          <button
            type="button"
            style={{
              ...styles.button,
              ...styles.primaryButton,
              ...(!isDirty || isSaving ? styles.disabledButton : {}),
            }}
            disabled={!isDirty || isSaving}
            onClick={() => {
              void handleSave();
            }}
          >
            {isSaving ? 'Saving…' : isDirty ? 'Save form' : 'Saved'}
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <p style={styles.sectionTitle}>Share & embed</p>
        {formUrl && submitUrl ? (
          <>
            <CopyBlock
              title="Form link"
              helper="Share it on WhatsApp, social media or a QR code. Add ?utm_source=…&utm_campaign=… to track where leads come from."
              text={formUrl}
            />
            <CopyBlock
              title="Embed on a website"
              helper="Paste this where the form should appear. It resizes itself and passes the page's UTM tags to the form."
              text={buildIframeSnippet({
                formUrl,
                formId: form.id,
                title: form.name,
              })}
            />
            <CopyBlock
              title="Send from your own form or system"
              helper="POST the answers as JSON (or a normal HTML form post) using the field names below. Duplicates are matched by email, then phone."
              text={buildCurlExample({ submitUrl, fields: savedFields })}
            />
          </>
        ) : (
          <p style={styles.helper}>Loading the workspace address…</p>
        )}
      </div>
    </div>
  );
};

const FormBuilder = () => {
  const formId = useRecordId();
  const { form, baseUrl, errorMessage } = useLeadFormData(formId);

  if (formId === null || errorMessage !== undefined) {
    return (
      <div style={styles.container}>
        <p style={styles.helper}>
          {errorMessage ?? 'Open a lead form to build and share it.'}
        </p>
      </div>
    );
  }

  if (form === undefined) {
    return (
      <div style={styles.container}>
        <p style={styles.helper}>Loading…</p>
      </div>
    );
  }

  return <FormBuilderEditor key={form.id} form={form} baseUrl={baseUrl} />;
};

export default defineFrontComponent({
  universalIdentifier: FORM_BUILDER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'lead-form-builder',
  description:
    'Edit the questions of a lead form and get its link, website embed code and API example.',
  component: FormBuilder,
});
