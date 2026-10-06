import { DATA_QUALITY, type DataQuality } from 'src/constants/data-quality';
import {
  assessDataQuality,
  type DataQualityAssessment,
} from 'src/utils/assess-data-quality';
import {
  type DuplicateMembership,
  findDuplicateGroups,
  type MatchKey,
} from 'src/utils/find-duplicate-groups';

export type HygieneRecord = {
  id: string;
  createdAt: string;
  label: string;
  keys: MatchKey[];
  missingFieldIssues: string[];
  // Whitespace-collapsed values that differ from what is stored.
  normalizedFields: Record<string, unknown>;
  current: {
    dataQuality: DataQuality | string | null;
    dataQualityIssues: string | null;
    possibleDuplicateOfId: string | null;
  };
};

export type HygieneUpdate = {
  id: string;
  data: Record<string, unknown>;
};

// The API returns an empty string for a text field stored as null, so the two
// must compare equal or every clean record would be rewritten on each scan.
const hasAssessmentChanged = (
  record: HygieneRecord,
  assessment: DataQualityAssessment,
): boolean =>
  record.current.dataQuality !== assessment.dataQuality ||
  (record.current.dataQualityIssues || null) !== assessment.dataQualityIssues ||
  record.current.possibleDuplicateOfId !== assessment.possibleDuplicateOfId;

// When a single record is saved, only part of the workspace is loaded, so
// records already flagged against something outside that slice are left for
// the nightly scan instead of being overwritten from incomplete information.
const selectFocusTargetIds = ({
  focusRecord,
  records,
  membershipById,
}: {
  focusRecord: HygieneRecord;
  records: HygieneRecord[];
  membershipById: Map<string, DuplicateMembership>;
}): Set<string> => {
  const focusGroupIds = new Set(
    membershipById.get(focusRecord.id)?.otherIds ?? [],
  );

  const neighbourIds = records
    .filter((record) => record.id !== focusRecord.id)
    .filter(
      (record) =>
        (focusGroupIds.has(record.id) &&
          record.current.dataQuality !== DATA_QUALITY.POSSIBLE_DUPLICATE) ||
        record.current.possibleDuplicateOfId === focusRecord.id ||
        focusRecord.current.possibleDuplicateOfId === record.id,
    )
    .map((record) => record.id);

  return new Set([focusRecord.id, ...neighbourIds]);
};

export const planHygieneUpdates = ({
  records,
  focusRecordId,
}: {
  records: HygieneRecord[];
  focusRecordId?: string;
}): HygieneUpdate[] => {
  const membershipById = findDuplicateGroups(records);
  const labelById = new Map(records.map((record) => [record.id, record.label]));
  const focusRecord = records.find((record) => record.id === focusRecordId);

  const targetIds = focusRecord
    ? selectFocusTargetIds({ focusRecord, records, membershipById })
    : new Set(records.map((record) => record.id));

  const updates: HygieneUpdate[] = [];

  for (const record of records) {
    if (!targetIds.has(record.id)) {
      continue;
    }

    const assessment = assessDataQuality({
      recordId: record.id,
      missingFieldIssues: record.missingFieldIssues,
      membership: membershipById.get(record.id),
      labelById,
    });

    // Only the saved record gets its own text rewritten on a single save, so
    // touching a neighbour never retriggers that neighbour's save handler.
    const normalizedFields =
      !focusRecord || record.id === focusRecord.id
        ? record.normalizedFields
        : {};

    const assessmentChanged = hasAssessmentChanged(record, assessment);

    if (!assessmentChanged && Object.keys(normalizedFields).length === 0) {
      continue;
    }

    updates.push({
      id: record.id,
      data: {
        ...normalizedFields,
        ...(assessmentChanged ? assessment : {}),
      },
    });
  }

  return updates;
};
