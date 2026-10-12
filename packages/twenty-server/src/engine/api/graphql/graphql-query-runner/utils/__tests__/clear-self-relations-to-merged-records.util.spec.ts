import { clearSelfRelationsToMergedRecords } from 'src/engine/api/graphql/graphql-query-runner/utils/clear-self-relations-to-merged-records.util';

describe('clearSelfRelationsToMergedRecords', () => {
  const mergedRecordIds = ['survivor-id', 'deleted-id'];

  it('clears a self-relation pointing at a record deleted by the merge', () => {
    const result = clearSelfRelationsToMergedRecords({
      mergedData: { name: 'Mcbride', possibleDuplicateOfId: 'deleted-id' },
      mergedRecordIds,
      selfRelationJoinColumnNames: ['possibleDuplicateOfId'],
    });

    expect(result).toEqual({ name: 'Mcbride', possibleDuplicateOfId: null });
  });

  it('clears a self-relation pointing at the surviving record', () => {
    const result = clearSelfRelationsToMergedRecords({
      mergedData: { possibleDuplicateOfId: 'survivor-id' },
      mergedRecordIds,
      selfRelationJoinColumnNames: ['possibleDuplicateOfId'],
    });

    expect(result).toEqual({ possibleDuplicateOfId: null });
  });

  it('keeps a self-relation pointing at a record outside the merge', () => {
    const result = clearSelfRelationsToMergedRecords({
      mergedData: { possibleDuplicateOfId: 'other-id' },
      mergedRecordIds,
      selfRelationJoinColumnNames: ['possibleDuplicateOfId'],
    });

    expect(result).toEqual({ possibleDuplicateOfId: 'other-id' });
  });

  it('leaves relations to other objects untouched', () => {
    const result = clearSelfRelationsToMergedRecords({
      mergedData: { accountOwnerId: 'deleted-id' },
      mergedRecordIds,
      selfRelationJoinColumnNames: ['possibleDuplicateOfId'],
    });

    expect(result).toEqual({ accountOwnerId: 'deleted-id' });
  });
});
