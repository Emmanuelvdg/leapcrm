import { type ObjectRecord } from 'twenty-shared/types';

// A self-relation (e.g. an app's "possible duplicate of") pointing at one of
// the merged records would end up pointing at a deleted record, failing the
// foreign key, or at the surviving record itself.
export const clearSelfRelationsToMergedRecords = ({
  mergedData,
  mergedRecordIds,
  selfRelationJoinColumnNames,
}: {
  mergedData: Partial<ObjectRecord>;
  mergedRecordIds: string[];
  selfRelationJoinColumnNames: string[];
}): Partial<ObjectRecord> => {
  const clearedData = { ...mergedData };

  for (const joinColumnName of selfRelationJoinColumnNames) {
    if (mergedRecordIds.includes(clearedData[joinColumnName])) {
      clearedData[joinColumnName] = null;
    }
  }

  return clearedData;
};
