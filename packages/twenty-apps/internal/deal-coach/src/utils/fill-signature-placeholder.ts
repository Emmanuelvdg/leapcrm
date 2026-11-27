const SIGNATURE_PLACEHOLDER_PATTERN =
  /\[(?:your|my|sender(?:'s)?|rep(?:'s)?|owner(?:'s)?)[ _-]?(?:full[ _-]?)?name\]/gi;

// Models still sign drafts with "[Your Name]" now and then despite the prompt;
// a draft the rep can paste as is matters more than trusting the prompt.
export const fillSignaturePlaceholder = (
  draftMessage: string | null,
  ownerName: string | null,
): string | null => {
  if (draftMessage === null) {
    return null;
  }

  const ownerFirstName = ownerName?.trim().split(/\s+/)[0] ?? '';

  return draftMessage
    .replace(SIGNATURE_PLACEHOLDER_PATTERN, ownerFirstName)
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
