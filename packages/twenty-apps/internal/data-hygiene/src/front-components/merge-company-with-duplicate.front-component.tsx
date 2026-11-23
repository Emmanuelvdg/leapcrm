import { defineFrontComponent } from 'twenty-sdk/define';

import { MERGE_COMPANY_WITH_DUPLICATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { MergeWithPossibleDuplicateEffect } from 'src/front-components/merge-with-possible-duplicate-effect';
import { COMPANY_DUPLICATE_MERGER } from 'src/utils/merge-with-possible-duplicate';

const MergeCompanyWithDuplicate = () => (
  <MergeWithPossibleDuplicateEffect duplicateMerger={COMPANY_DUPLICATE_MERGER} />
);

export default defineFrontComponent({
  universalIdentifier:
    MERGE_COMPANY_WITH_DUPLICATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'merge-company-with-duplicate',
  description:
    'Merges a company flagged as a possible duplicate into the older company it matches.',
  isHeadless: true,
  component: MergeCompanyWithDuplicate,
});
