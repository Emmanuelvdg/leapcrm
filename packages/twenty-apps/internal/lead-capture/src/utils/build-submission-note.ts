import { type SubmissionMeta } from 'src/utils/parse-submission';

export const describeSource = (meta: SubmissionMeta): string | null =>
  [meta.utmSource, meta.utmMedium, meta.utmCampaign]
    .filter((part): part is string => Boolean(part))
    .join(' / ') || null;

const indentContinuationLines = (text: string): string =>
  text.replace(/\r?\n/g, '\n  ');

// "How can we help?" reads badly as "How can we help?:".
const withColon = (label: string): string =>
  /[?:.!]$/.test(label) ? label : `${label}:`;

export const buildSubmissionNote = ({
  formName,
  answerList,
  meta,
  problems,
}: {
  formName: string;
  answerList: { label: string; value: string }[];
  meta: SubmissionMeta;
  problems: string[];
}): { title: string; markdown: string } => {
  const source = describeSource(meta);
  const lines = [
    ...answerList.map(
      ({ label, value }) =>
        `- **${withColon(label)}** ${indentContinuationLines(value)}`,
    ),
    '',
    `Submitted through the **${formName}** form.`,
    ...(source ? [`Source: ${source}`] : []),
    ...(meta.pageUrl ? [`Page: ${meta.pageUrl}`] : []),
    ...problems.map((problem) => `Note: ${problem}`),
  ];

  return { title: `Form: ${formName}`, markdown: lines.join('\n') };
};
