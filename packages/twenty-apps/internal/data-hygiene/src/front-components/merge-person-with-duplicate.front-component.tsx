import { defineFrontComponent } from 'twenty-sdk/define';

import { MERGE_PERSON_WITH_DUPLICATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { MergeWithPossibleDuplicateEffect } from 'src/front-components/merge-with-possible-duplicate-effect';
import { PERSON_DUPLICATE_MERGER } from 'src/utils/merge-with-possible-duplicate';

const MergePersonWithDuplicate = () => (
  <MergeWithPossibleDuplicateEffect duplicateMerger={PERSON_DUPLICATE_MERGER} />
);

export default defineFrontComponent({
  universalIdentifier:
    MERGE_PERSON_WITH_DUPLICATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'merge-person-with-duplicate',
  description:
    'Merges a person flagged as a possible duplicate into the older person they match.',
  isHeadless: true,
  component: MergePersonWithDuplicate,
});
