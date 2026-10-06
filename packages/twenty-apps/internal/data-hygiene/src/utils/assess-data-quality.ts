import {
  DATA_QUALITY,
  type DataQuality,
  ISSUE_SEPARATOR,
} from 'src/constants/data-quality';
import {
  type DuplicateMembership,
  type MatchKind,
} from 'src/utils/find-duplicate-groups';

export type DataQualityAssessment = {
  dataQuality: DataQuality;
  dataQualityIssues: string | null;
  possibleDuplicateOfId: string | null;
};

const MATCH_KIND_LABELS: Record<MatchKind, string> = {
  EMAIL: 'same email',
  DOMAIN: 'same domain',
  LINKEDIN: 'same LinkedIn',
  NAME_AT_COMPANY: 'same name and company',
  NAME: 'similar name',
};

const quoteLabel = (label: string | undefined): string =>
  label ? `"${label}"` : 'an unnamed record';

const describeDuplicate = ({
  recordId,
  membership,
  labelById,
}: {
  recordId: string;
  membership: DuplicateMembership;
  labelById: Map<string, string>;
}): string => {
  const reasons = membership.matchKinds
    .map((kind) => MATCH_KIND_LABELS[kind])
    .join(', ');
  const reasonSuffix = reasons ? ` (${reasons})` : '';

  if (membership.primaryId !== recordId) {
    return `Possible duplicate of ${quoteLabel(labelById.get(membership.primaryId))}${reasonSuffix}`;
  }

  if (membership.otherIds.length === 1) {
    return `Possible duplicate: ${quoteLabel(labelById.get(membership.otherIds[0]))}${reasonSuffix}`;
  }

  return `${membership.otherIds.length} possible duplicates${reasonSuffix}`;
};

export const assessDataQuality = ({
  recordId,
  missingFieldIssues,
  membership,
  labelById,
}: {
  recordId: string;
  missingFieldIssues: string[];
  membership: DuplicateMembership | undefined;
  labelById: Map<string, string>;
}): DataQualityAssessment => {
  const duplicateIssues = membership
    ? [describeDuplicate({ recordId, membership, labelById })]
    : [];
  const issues = [...duplicateIssues, ...missingFieldIssues];

  const dataQuality = membership
    ? DATA_QUALITY.POSSIBLE_DUPLICATE
    : missingFieldIssues.length > 0
      ? DATA_QUALITY.INCOMPLETE
      : DATA_QUALITY.CLEAN;

  return {
    dataQuality,
    dataQualityIssues: issues.length > 0 ? issues.join(ISSUE_SEPARATOR) : null,
    possibleDuplicateOfId:
      membership && membership.primaryId !== recordId
        ? membership.primaryId
        : null,
  };
};
