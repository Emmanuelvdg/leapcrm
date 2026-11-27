import {
  type CSSProperties,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  AppPath,
  copyToClipboard,
  enqueueSnackbar,
  navigate,
  openCommandConfirmationModal,
  useRecordId,
} from 'twenty-sdk/front-component';

import {
  CURRENCY_CODES,
  FINAL_STATUSES,
  INDIAN_STATES,
  QUOTE_STATUS_LABELS,
  TAX_SCHEME_LABELS,
  TAX_SCHEMES,
  type QuoteStatus,
  type TaxScheme,
} from 'src/constants/quote-options';
import { QUOTE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  searchProducts,
  useQuoteEditorData,
} from 'src/front-components/hooks/use-quote-editor-data';
import { callQuoteAction } from 'src/front-components/utils/call-quote-action';
import {
  blankLine,
  draftFromQuote,
  type EditableLine,
  lineFromProduct,
  type ProductOption,
  type QuoteDraft,
  saveQuoteDraft,
  toLineInputs,
} from 'src/front-components/utils/quote-draft';
import { onValueChange } from 'src/front-components/utils/read-event-value';
import {
  buildQuoteLink,
  buildShareMessage,
  emailQuote,
  whatsappQuote,
} from 'src/front-components/utils/share-quote';
import { formatDate, formatMoney } from 'src/utils/format-money';
import { formatRate } from 'src/utils/quote-math';
import { type QuoteRecord } from 'src/utils/quote-records';
import { needsApproval, type QuoteSettings } from 'src/utils/quote-settings';
import { computeTotalsFor } from 'src/utils/quote-totals';
import { type QuoteActionName } from 'src/utils/quote-actions';

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
  bgTertiary: 'var(--t-background-tertiary)',
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
  sizeLg: 'var(--t-font-size-lg)',
  weightMedium: 'var(--t-font-weight-medium)',
  weightSemiBold: 'var(--t-font-weight-semi-bold)',
  blue: 'var(--t-color-blue)',
  orange: 'var(--t-color-orange)',
  red: 'var(--t-color-red)',
  green: 'var(--t-color-green)',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: theme.fontTertiary,
  PENDING_APPROVAL: theme.orange,
  APPROVED: theme.green,
  SENT: theme.blue,
  VIEWED: theme.blue,
  ACCEPTED: theme.green,
  DECLINED: theme.red,
  EXPIRED: theme.fontTertiary,
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
  header: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing3,
    justifyContent: 'space-between',
  },
  headerTitle: {
    alignItems: 'center',
    display: 'flex',
    flex: '1 1 280px',
    flexWrap: 'wrap',
    gap: theme.spacing2,
    minWidth: 0,
  },
  quoteNumber: {
    color: theme.fontTertiary,
    fontSize: theme.sizeSm,
    whiteSpace: 'nowrap',
  },
  statusChip: {
    border: '1px solid currentColor',
    borderRadius: '999px',
    fontSize: theme.sizeXs,
    fontWeight: theme.weightSemiBold,
    padding: `2px ${theme.spacing2}`,
    whiteSpace: 'nowrap',
  },
  section: {
    border: `1px solid ${theme.borderLight}`,
    borderRadius: theme.radiusMd,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing3,
    padding: theme.spacing4,
  },
  banner: {
    background: theme.bgSecondary,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusMd,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing2,
    padding: theme.spacing3,
  },
  sectionTitle: {
    fontSize: theme.sizeMd,
    fontWeight: theme.weightSemiBold,
    margin: 0,
  },
  helper: { color: theme.fontTertiary, fontSize: theme.sizeXs, margin: 0 },
  warning: { color: theme.orange, fontSize: theme.sizeXs, margin: 0 },
  label: {
    color: theme.fontSecondary,
    display: 'flex',
    flexDirection: 'column',
    fontSize: theme.sizeXs,
    fontWeight: theme.weightMedium,
    gap: theme.spacing1,
  },
  grid: {
    display: 'grid',
    gap: theme.spacing3,
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  },
  lineCard: {
    background: theme.bgSecondary,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusMd,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing2,
    padding: theme.spacing3,
  },
  lineTop: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing2,
  },
  lineName: {
    alignItems: 'center',
    display: 'flex',
    flex: '1 1 220px',
    gap: theme.spacing2,
    minWidth: 0,
  },
  lineNumbers: {
    display: 'grid',
    gap: theme.spacing2,
    gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
  },
  lineAmount: {
    alignSelf: 'end',
    fontWeight: theme.weightSemiBold,
    padding: `0 ${theme.spacing1}`,
    textAlign: 'right',
    whiteSpace: 'nowrap',
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
  titleInput: {
    background: 'transparent',
    border: `1px solid transparent`,
    borderRadius: theme.radiusSm,
    color: theme.fontPrimary,
    flex: '1 1 220px',
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeLg,
    fontWeight: theme.weightSemiBold,
    minWidth: 0,
    padding: `${theme.spacing1} ${theme.spacing2}`,
  },
  textarea: {
    background: theme.bgPrimary,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    boxSizing: 'border-box',
    color: theme.fontPrimary,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    minHeight: '72px',
    padding: theme.spacing2,
    resize: 'vertical',
    width: '100%',
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
    color: theme.fontPrimary,
    cursor: 'pointer',
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    fontWeight: theme.weightMedium,
    height: theme.spacing8,
    padding: `0 ${theme.spacing3}`,
    whiteSpace: 'nowrap',
  },
  primaryButton: {
    background: theme.blue,
    border: `1px solid ${theme.blue}`,
    color: theme.fontInverted,
  },
  dangerButton: { color: theme.red },
  iconButton: { padding: `0 ${theme.spacing2}` },
  disabledButton: { cursor: 'not-allowed', opacity: 0.5 },
  totals: {
    alignSelf: 'flex-end',
    borderCollapse: 'collapse',
    minWidth: '260px',
  },
  totalCell: { padding: `${theme.spacing1} 0`, textAlign: 'right' },
  totalLabel: {
    color: theme.fontSecondary,
    padding: `${theme.spacing1} ${theme.spacing4} ${theme.spacing1} 0`,
  },
  grandTotal: {
    borderTop: `1px solid ${theme.borderMedium}`,
    fontSize: theme.sizeMd,
    fontWeight: theme.weightSemiBold,
    paddingTop: theme.spacing2,
  },
  productResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing1,
    maxHeight: '260px',
    overflowY: 'auto',
  },
  productResult: {
    alignItems: 'center',
    background: theme.bgPrimary,
    border: `1px solid ${theme.borderLight}`,
    borderRadius: theme.radiusSm,
    color: theme.fontPrimary,
    cursor: 'pointer',
    display: 'flex',
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    gap: theme.spacing2,
    justifyContent: 'space-between',
    padding: theme.spacing2,
    textAlign: 'left',
  },
  code: {
    background: theme.bgTertiary,
    borderRadius: theme.radiusSm,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: theme.sizeXs,
    padding: theme.spacing2,
    wordBreak: 'break-all',
  },
  link: { color: theme.blue, fontSize: theme.sizeSm },
};

const buttonStyle = ({
  isPrimary = false,
  isDanger = false,
  isDisabled = false,
}: {
  isPrimary?: boolean;
  isDanger?: boolean;
  isDisabled?: boolean;
}): CSSProperties => ({
  ...styles.button,
  ...(isPrimary ? styles.primaryButton : {}),
  ...(isDanger ? styles.dangerButton : {}),
  ...(isDisabled ? styles.disabledButton : {}),
});

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label style={styles.label}>
    {label}
    {children}
  </label>
);

type LineEditorProps = {
  line: EditableLine;
  index: number;
  count: number;
  amountText: string;
  isEditable: boolean;
  showHsn: boolean;
  quoteCurrency: string;
  onChange: (line: EditableLine) => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
};

const LineEditor = ({
  line,
  index,
  count,
  amountText,
  isEditable,
  showHsn,
  quoteCurrency,
  onChange,
  onMove,
  onRemove,
}: LineEditorProps) => {
  const input = (key: keyof EditableLine, placeholder?: string): ReactNode => (
    <input
      style={styles.input}
      value={String(line[key] ?? '')}
      placeholder={placeholder}
      disabled={!isEditable}
      inputMode={
        key === 'name' || key === 'unit' || key === 'hsnSacCode'
          ? undefined
          : 'decimal'
      }
      onChange={onValueChange((value) => onChange({ ...line, [key]: value }))}
    />
  );

  return (
    <div style={styles.lineCard}>
      <div style={styles.lineTop}>
        <div style={styles.lineName}>
          <span style={styles.helper}>{index + 1}</span>
          {input('name', 'Product or service')}
        </div>
        {isEditable && (
          <>
            <button
              type="button"
              style={{
                ...buttonStyle({ isDisabled: index === 0 }),
                ...styles.iconButton,
              }}
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              Up
            </button>
            <button
              type="button"
              style={{
                ...buttonStyle({ isDisabled: index === count - 1 }),
                ...styles.iconButton,
              }}
              disabled={index === count - 1}
              onClick={() => onMove(1)}
            >
              Down
            </button>
            <button
              type="button"
              style={{
                ...buttonStyle({ isDanger: true }),
                ...styles.iconButton,
              }}
              onClick={onRemove}
            >
              Remove
            </button>
          </>
        )}
      </div>
      <div style={styles.lineNumbers}>
        <Field label="Qty">{input('quantity')}</Field>
        <Field label="Unit">{input('unit', 'pcs')}</Field>
        <Field label={`Rate (${quoteCurrency})`}>{input('unitPrice')}</Field>
        <Field label="Discount %">{input('discountPercent')}</Field>
        <Field label="Tax %">{input('taxRate')}</Field>
        {showHsn && <Field label="HSN/SAC">{input('hsnSacCode')}</Field>}
        <div style={styles.lineAmount}>{amountText}</div>
      </div>
      {line.catalogueCurrency && (
        <p style={styles.warning}>
          The catalogue price is in {line.catalogueCurrency}; check the rate is
          in {quoteCurrency}.
        </p>
      )}
    </div>
  );
};

const useProductSearch = (defaultCurrency: string) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<ProductOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const latestSearch = useRef(0);

  const search = async (text: string) => {
    const searchId = latestSearch.current + 1;

    latestSearch.current = searchId;
    setSearchText(text);
    setIsSearching(true);

    try {
      const found = await searchProducts(text, defaultCurrency);

      if (latestSearch.current === searchId) {
        setResults(found);
      }
    } catch {
      if (latestSearch.current === searchId) {
        setResults([]);
      }
    } finally {
      if (latestSearch.current === searchId) {
        setIsSearching(false);
      }
    }
  };

  return {
    isOpen,
    searchText,
    results,
    isSearching,
    search,
    open: () => {
      setIsOpen(true);
      void search('');
    },
    close: () => setIsOpen(false),
  };
};

const ProductPicker = ({
  searchText,
  results,
  isSearching,
  onSearch,
  onPick,
  onClose,
}: {
  searchText: string;
  results: ProductOption[];
  isSearching: boolean;
  onSearch: (text: string) => void;
  onPick: (product: ProductOption) => void;
  onClose: () => void;
}) => {
  return (
    <div style={styles.banner}>
      <div style={styles.buttonRow}>
        <input
          style={{ ...styles.input, flex: 1 }}
          value={searchText}
          placeholder="Search products by name or SKU"
          onChange={onValueChange(onSearch)}
        />
        <button type="button" style={buttonStyle({})} onClick={onClose}>
          Close
        </button>
      </div>
      <div style={styles.productResults}>
        {results.map((product) => (
          <button
            key={product.id}
            type="button"
            style={styles.productResult}
            onClick={() => onPick(product)}
          >
            <span>
              {product.name}
              {product.sku ? (
                <span style={styles.helper}> · {product.sku}</span>
              ) : null}
            </span>
            <span style={styles.helper}>
              {product.unitPrice
                ? formatMoney(
                    product.unitPrice.amountMicros,
                    product.unitPrice.currencyCode,
                  )
                : 'No price'}
              {product.taxRate ? ` · ${formatRate(product.taxRate)}% tax` : ''}
            </span>
          </button>
        ))}
        {results.length === 0 && (
          <p style={styles.helper}>
            {isSearching
              ? 'Searching…'
              : 'No active products match. Add products under Quotes > Products.'}
          </p>
        )}
      </div>
    </div>
  );
};

type StatusPanelProps = {
  quote: QuoteRecord;
  settings: QuoteSettings;
  baseUrl: string | undefined;
  isApprover: boolean;
  busyAction: QuoteActionName | null;
  onAction: (action: QuoteActionName, note?: string) => void;
};

const StatusPanel = ({
  quote,
  settings,
  baseUrl,
  isApprover,
  busyAction,
  onAction,
}: StatusPanelProps) => {
  const [approvalNote, setApprovalNote] = useState('');
  const link = baseUrl ? buildQuoteLink(baseUrl, quote) : null;
  const message = link
    ? buildShareMessage({ quote, link, sellerName: settings.sellerName })
    : '';

  if (quote.status === 'DRAFT' && quote.approvalNote?.startsWith('Rejected')) {
    return (
      <div style={styles.banner}>
        <p style={{ ...styles.warning, fontSize: theme.sizeSm }}>
          {quote.approvalNote}
        </p>
        <p style={styles.helper}>
          Lower the discount, or change the quote and send it for approval
          again.
        </p>
      </div>
    );
  }

  if (quote.status === 'PENDING_APPROVAL') {
    return (
      <div style={styles.banner}>
        <p style={{ margin: 0 }}>
          <strong>Waiting for approval.</strong> The highest discount is{' '}
          {formatRate(quote.maxDiscountPercent)}%, above the{' '}
          {formatRate(settings.approvalThreshold)}% limit.
        </p>
        {isApprover ? (
          <>
            <input
              style={styles.input}
              value={approvalNote}
              placeholder="Comment for the rep (optional)"
              onChange={onValueChange(setApprovalNote)}
            />
            <div style={styles.buttonRow}>
              <button
                type="button"
                style={buttonStyle({
                  isPrimary: true,
                  isDisabled: busyAction !== null,
                })}
                disabled={busyAction !== null}
                onClick={() => onAction('approve', approvalNote)}
              >
                {busyAction === 'approve' ? 'Approving…' : 'Approve discount'}
              </button>
              <button
                type="button"
                style={buttonStyle({
                  isDanger: true,
                  isDisabled: busyAction !== null,
                })}
                disabled={busyAction !== null}
                onClick={() => onAction('reject', approvalNote)}
              >
                {busyAction === 'reject' ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </>
        ) : (
          <p style={styles.helper}>
            An approver has a task for it: {settings.approverEmails.join(', ')}.
          </p>
        )}
      </div>
    );
  }

  if (quote.status === 'APPROVED') {
    return (
      <div style={styles.banner}>
        <p style={{ margin: 0 }}>
          <strong>Discount approved</strong>
          {quote.approvedBy ? ` by ${quote.approvedBy.name}` : ''}
          {quote.approvedAt ? ` on ${formatDate(quote.approvedAt)}` : ''}. You
          can send the quote now.
        </p>
        {quote.approvalNote && (
          <p style={styles.helper}>{quote.approvalNote}</p>
        )}
      </div>
    );
  }

  if (quote.status === 'SENT' || quote.status === 'VIEWED') {
    return (
      <div style={styles.banner}>
        <p style={{ margin: 0 }}>
          <strong>
            {quote.status === 'VIEWED' ? 'Viewed by the customer' : 'Sent'}
          </strong>
          {quote.status === 'VIEWED'
            ? ` ${quote.viewCount} ${quote.viewCount === 1 ? 'time' : 'times'}, last on ${formatDate(quote.lastViewedAt)}.`
            : ` on ${formatDate(quote.sentAt)}. Not opened yet.`}
        </p>
        {link ? (
          <>
            <div style={styles.code}>{link}</div>
            <div style={styles.buttonRow}>
              <button
                type="button"
                style={buttonStyle({ isPrimary: true })}
                onClick={() => void emailQuote({ quote, message })}
              >
                Email to customer
              </button>
              <button
                type="button"
                style={buttonStyle({})}
                onClick={() => void whatsappQuote({ quote, message })}
              >
                WhatsApp
              </button>
              <button
                type="button"
                style={buttonStyle({})}
                onClick={() => {
                  void copyToClipboard(link);
                }}
              >
                Copy link
              </button>
              <button
                type="button"
                style={buttonStyle({})}
                onClick={() => {
                  void copyToClipboard(message);
                }}
              >
                Copy message
              </button>
            </div>
          </>
        ) : (
          <p style={styles.helper}>Loading the customer link…</p>
        )}
      </div>
    );
  }

  if (quote.status === 'ACCEPTED') {
    return (
      <div style={styles.banner}>
        <p style={{ margin: 0, color: theme.green }}>
          <strong>
            Accepted and signed by {quote.signerName ?? 'the customer'} on{' '}
            {formatDate(quote.respondedAt)}.
          </strong>
        </p>
        <p style={styles.helper}>
          The deal amount was set to the quote total. Open the customer link to
          see or download the signed quote.
        </p>
      </div>
    );
  }

  if (quote.status === 'DECLINED') {
    return (
      <div style={styles.banner}>
        <p style={{ margin: 0, color: theme.red }}>
          <strong>Declined on {formatDate(quote.respondedAt)}.</strong>
        </p>
        {quote.declineReason && (
          <p style={styles.helper}>Reason: {quote.declineReason}</p>
        )}
      </div>
    );
  }

  if (quote.status === 'EXPIRED') {
    return (
      <div style={styles.banner}>
        <p style={{ margin: 0 }}>
          <strong>Expired on {formatDate(quote.validUntil)}.</strong> Duplicate
          it to send an updated quote.
        </p>
      </div>
    );
  }

  return null;
};

type QuoteEditorBodyProps = {
  quote: QuoteRecord;
  settings: QuoteSettings;
  baseUrl: string | undefined;
  currentUserEmail: string | null;
  onReload: () => void;
};

const QuoteEditorBody = ({
  quote,
  settings,
  baseUrl,
  currentUserEmail,
  onReload,
}: QuoteEditorBodyProps) => {
  const initialDraft = useMemo(() => draftFromQuote(quote), [quote]);
  const [draft, setDraft] = useState<QuoteDraft>(initialDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<QuoteActionName | null>(null);
  const productSearch = useProductSearch(settings.defaultCurrency);

  const isEditable = quote.status === 'DRAFT';
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const isBusy = isSaving || busyAction !== null;
  const isApprover =
    currentUserEmail !== null &&
    settings.approverEmails.includes(currentUserEmail);

  const totals = computeTotalsFor({
    lines: toLineInputs(draft.lines),
    taxScheme: draft.taxScheme,
    sellerState: settings.sellerState,
    placeOfSupply: draft.placeOfSupply,
  });
  const requiresApproval = needsApproval(totals.maxDiscountPercent, settings);
  const money = (micros: number) => formatMoney(micros, draft.currencyCode);
  const showHsn =
    draft.taxScheme === 'GST' ||
    draft.lines.some((line) => line.hsnSacCode.trim() !== '');

  const update = (changes: Partial<QuoteDraft>) =>
    setDraft((previous) => ({ ...previous, ...changes }));

  const updateLine = (index: number, line: EditableLine) =>
    update({
      lines: draft.lines.map((existing, lineIndex) =>
        lineIndex === index ? line : existing,
      ),
    });

  const moveLine = (index: number, offset: number) => {
    const target = index + offset;

    if (target < 0 || target >= draft.lines.length) {
      return;
    }

    const lines = [...draft.lines];
    [lines[index], lines[target]] = [lines[target], lines[index]];
    update({ lines });
  };

  const save = async (): Promise<boolean> => {
    setIsSaving(true);

    try {
      await saveQuoteDraft({
        client: new CoreApiClient(),
        quoteId: quote.id,
        draft,
        totals,
        originalLineIds: quote.lineItems.map((line) => line.id),
      });

      return true;
    } catch {
      await enqueueSnackbar({
        message: 'Could not save the quote. Check the numbers and try again.',
        variant: 'error',
      });

      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const runAction = async (action: QuoteActionName, note?: string) => {
    if (
      action === 'reopen' &&
      (quote.status === 'SENT' || quote.status === 'VIEWED')
    ) {
      const confirmation = await openCommandConfirmationModal({
        title: 'Edit a sent quote?',
        subtitle:
          'Until you send it again, the customer link shows that the quote is being updated and cannot be accepted.',
        confirmButtonText: 'Edit quote',
        confirmButtonAccent: 'blue',
      });

      if (confirmation !== 'confirm') {
        return;
      }
    }

    if (isEditable && isDirty && !(await save())) {
      return;
    }

    setBusyAction(action);

    try {
      const result = await callQuoteAction({
        action,
        quoteId: quote.id,
        note,
        crmBaseUrl: baseUrl,
      });

      if (!result?.ok) {
        if (isDirty) {
          onReload();
        }

        return;
      }

      if (action === 'duplicate') {
        await navigate(AppPath.RecordShowPage, {
          objectNameSingular: 'quote',
          objectRecordId: result.quoteId,
        });

        return;
      }

      const messages: Partial<Record<QuoteActionName, string>> = {
        send: 'Quote sent. Share the link with the customer.',
        'request-approval': 'Sent for approval. The approvers have a task.',
        approve: 'Discount approved.',
        reject: 'Discount rejected; the quote is back in draft.',
        reopen: 'The quote is back in draft.',
      };

      await enqueueSnackbar({
        message: messages[action] ?? 'Done.',
        variant: 'success',
      });

      onReload();
    } finally {
      setBusyAction(null);
    }
  };

  const saveOnly = async () => {
    if (await save()) {
      await enqueueSnackbar({ message: 'Quote saved.', variant: 'success' });
      onReload();
    }
  };

  const previewLink = baseUrl ? buildQuoteLink(baseUrl, quote, true) : null;
  const canReopen = ['PENDING_APPROVAL', 'APPROVED', 'SENT', 'VIEWED'].includes(
    quote.status,
  );
  const canSend = quote.status === 'DRAFT' || quote.status === 'APPROVED';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <input
            style={styles.titleInput}
            value={draft.name}
            placeholder="What is this quote for?"
            disabled={!isEditable}
            onChange={onValueChange((value) => update({ name: value }))}
          />
          <span style={styles.quoteNumber}>
            {quote.quoteNumber ?? 'Numbering…'}
          </span>
          <span
            style={{ ...styles.statusChip, color: STATUS_COLORS[quote.status] }}
          >
            {QUOTE_STATUS_LABELS[quote.status]}
          </span>
        </div>
        <div style={styles.buttonRow}>
          {isEditable && (
            <button
              type="button"
              style={buttonStyle({ isDisabled: !isDirty || isBusy })}
              disabled={!isDirty || isBusy}
              onClick={() => void saveOnly()}
            >
              {isSaving && busyAction === null ? 'Saving…' : 'Save'}
            </button>
          )}
          {previewLink && (
            <button
              type="button"
              style={buttonStyle({})}
              onClick={() => {
                void copyToClipboard(previewLink);
              }}
            >
              Copy preview link
            </button>
          )}
          {canSend && quote.status === 'DRAFT' && requiresApproval ? (
            <button
              type="button"
              style={buttonStyle({
                isPrimary: true,
                isDisabled: isBusy || draft.lines.length === 0,
              })}
              disabled={isBusy || draft.lines.length === 0}
              onClick={() => void runAction('request-approval')}
            >
              {busyAction === 'request-approval'
                ? 'Sending…'
                : 'Request approval'}
            </button>
          ) : canSend ? (
            <button
              type="button"
              style={buttonStyle({
                isPrimary: true,
                isDisabled: isBusy || draft.lines.length === 0,
              })}
              disabled={isBusy || draft.lines.length === 0}
              onClick={() => void runAction('send')}
            >
              {busyAction === 'send' ? 'Sending…' : 'Send quote'}
            </button>
          ) : null}
          {canReopen && (
            <button
              type="button"
              style={buttonStyle({ isDisabled: isBusy })}
              disabled={isBusy}
              onClick={() => void runAction('reopen')}
            >
              {quote.status === 'PENDING_APPROVAL' ? 'Withdraw' : 'Edit quote'}
            </button>
          )}
          {FINAL_STATUSES.includes(quote.status) && (
            <button
              type="button"
              style={buttonStyle({ isDisabled: isBusy })}
              disabled={isBusy}
              onClick={() => void runAction('duplicate')}
            >
              {busyAction === 'duplicate' ? 'Copying…' : 'Duplicate'}
            </button>
          )}
        </div>
      </div>

      <StatusPanel
        quote={quote}
        settings={settings}
        baseUrl={baseUrl}
        isApprover={isApprover}
        busyAction={busyAction}
        onAction={(action, note) => void runAction(action, note)}
      />

      {isEditable && requiresApproval && (
        <p style={styles.warning}>
          The highest discount, {formatRate(totals.maxDiscountPercent)}%, is
          above the {formatRate(settings.approvalThreshold)}% limit, so this
          quote needs approval before it is sent.
        </p>
      )}

      <div style={styles.section}>
        <div style={styles.grid}>
          <Field label="Customer">
            <span style={{ color: theme.fontPrimary, fontSize: theme.sizeSm }}>
              {[quote.company?.name, quote.person?.name]
                .filter(Boolean)
                .join(' · ') || 'No company or contact'}
            </span>
          </Field>
          <Field label="Deal">
            <span style={{ color: theme.fontPrimary, fontSize: theme.sizeSm }}>
              {quote.opportunity?.name ?? 'No deal'}
            </span>
          </Field>
          <Field label="Currency">
            <select
              style={styles.input}
              value={draft.currencyCode}
              disabled={!isEditable}
              onChange={onValueChange((value) =>
                update({ currencyCode: value }),
              )}
            >
              {[...new Set([draft.currencyCode, ...CURRENCY_CODES])].map(
                (code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Tax">
            <select
              style={styles.input}
              value={draft.taxScheme}
              disabled={!isEditable}
              onChange={onValueChange((value) =>
                update({ taxScheme: value as TaxScheme }),
              )}
            >
              {TAX_SCHEMES.map((scheme) => (
                <option key={scheme} value={scheme}>
                  {TAX_SCHEME_LABELS[scheme]}
                </option>
              ))}
            </select>
          </Field>
          {draft.taxScheme === 'GST' && (
            <Field label="Place of supply">
              <select
                style={styles.input}
                value={draft.placeOfSupply}
                disabled={!isEditable}
                onChange={onValueChange((value) =>
                  update({ placeOfSupply: value }),
                )}
              >
                <option value="">Same state as you</option>
                {[
                  ...new Set([
                    ...(draft.placeOfSupply ? [draft.placeOfSupply] : []),
                    ...INDIAN_STATES,
                  ]),
                ].map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Valid until">
            <input
              type="date"
              style={styles.input}
              value={draft.validUntil}
              disabled={!isEditable}
              onChange={onValueChange((value) => update({ validUntil: value }))}
            />
          </Field>
        </div>
        {draft.taxScheme === 'GST' && !settings.sellerState && (
          <p style={styles.helper}>
            Set your GST state (SELLER_STATE) in the Quotes app settings so
            out-of-state customers get IGST instead of CGST + SGST.
          </p>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Lines</h3>
        {draft.lines.length === 0 && (
          <p style={styles.helper}>
            Add products from your catalogue or type a custom line.
          </p>
        )}
        {draft.lines.map((line, index) => (
          <LineEditor
            key={line.key}
            line={line}
            index={index}
            count={draft.lines.length}
            amountText={money(totals.lines[index]?.netMicros ?? 0)}
            isEditable={isEditable}
            showHsn={showHsn}
            quoteCurrency={draft.currencyCode}
            onChange={(changed) => updateLine(index, changed)}
            onMove={(offset) => moveLine(index, offset)}
            onRemove={() =>
              update({
                lines: draft.lines.filter(
                  (_, lineIndex) => lineIndex !== index,
                ),
              })
            }
          />
        ))}
        {isEditable && !productSearch.isOpen && (
          <div style={styles.buttonRow}>
            <button
              type="button"
              style={buttonStyle({})}
              onClick={productSearch.open}
            >
              + Add product
            </button>
            <button
              type="button"
              style={buttonStyle({})}
              onClick={() => update({ lines: [...draft.lines, blankLine()] })}
            >
              + Add custom line
            </button>
          </div>
        )}
        {isEditable && productSearch.isOpen && (
          <ProductPicker
            searchText={productSearch.searchText}
            results={productSearch.results}
            isSearching={productSearch.isSearching}
            onSearch={(text) => void productSearch.search(text)}
            onClose={productSearch.close}
            onPick={(product) => {
              update({
                lines: [
                  ...draft.lines,
                  lineFromProduct(product, draft.currencyCode),
                ],
              });
              productSearch.close();
            }}
          />
        )}
        <table style={styles.totals}>
          <tbody>
            {totals.discountMicros > 0 && (
              <>
                <tr>
                  <td style={styles.totalLabel}>Items total</td>
                  <td style={styles.totalCell}>{money(totals.grossMicros)}</td>
                </tr>
                <tr>
                  <td style={styles.totalLabel}>Discount</td>
                  <td style={styles.totalCell}>
                    -{money(totals.discountMicros)}
                  </td>
                </tr>
              </>
            )}
            <tr>
              <td style={styles.totalLabel}>
                {draft.taxScheme === 'NONE' ? 'Subtotal' : 'Taxable value'}
              </td>
              <td style={styles.totalCell}>{money(totals.subtotalMicros)}</td>
            </tr>
            {totals.taxLines.map((taxLine) => (
              <tr key={taxLine.label}>
                <td style={styles.totalLabel}>{taxLine.label}</td>
                <td style={styles.totalCell}>{money(taxLine.amountMicros)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...styles.totalLabel, ...styles.grandTotal }}>
                Total
              </td>
              <td style={{ ...styles.totalCell, ...styles.grandTotal }}>
                {money(totals.totalMicros)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Terms</h3>
        <textarea
          style={styles.textarea}
          value={draft.terms}
          disabled={!isEditable}
          onChange={onValueChange((value) => update({ terms: value }))}
        />
      </div>
    </div>
  );
};

const QuoteEditor = () => {
  const quoteId = useRecordId();
  const {
    quote,
    baseUrl,
    currentUserEmail,
    errorMessage,
    loadCount,
    isWaitingForNumber,
    settings,
    reload,
  } = useQuoteEditorData(quoteId);

  if (quoteId === null || errorMessage !== undefined) {
    return (
      <div style={styles.container}>
        <p style={styles.helper}>
          {errorMessage ?? 'Open a quote to edit it.'}
        </p>
      </div>
    );
  }

  if (quote === undefined || isWaitingForNumber) {
    return (
      <div style={styles.container}>
        <p style={styles.helper}>
          {quote === undefined ? 'Loading…' : 'Setting up the quote…'}
        </p>
      </div>
    );
  }

  return (
    <QuoteEditorBody
      key={`${quote.id}-${loadCount}`}
      quote={quote}
      settings={settings}
      baseUrl={baseUrl}
      currentUserEmail={currentUserEmail}
      onReload={reload}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: QUOTE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'quote-editor',
  description:
    'Build a quote from the product catalogue, see GST or VAT totals, send it for approval and share the accept-and-sign link.',
  component: QuoteEditor,
});
