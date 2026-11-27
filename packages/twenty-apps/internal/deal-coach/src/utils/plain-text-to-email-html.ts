const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// The email composer reads its starting body as HTML, where plain newlines
// would collapse, so blank lines become paragraphs and single ones line breaks.
export const plainTextToEmailHtml = (text: string): string =>
  text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map(
      (paragraph) =>
        `<p>${paragraph.split('\n').map(escapeHtml).join('<br>')}</p>`,
    )
    .join('');
