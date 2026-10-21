import { In } from 'typeorm';

import { type ProspectingCampaignStatus } from 'src/modules/prospecting/types/prospecting-campaign-status.type';

// The ORM re-reads updated rows with the update criteria to build the update
// event, so criteria matching only the previous status would publish an event
// without the record. Accepting the target status too keeps the record in it;
// two different status changes racing still conflict, and repeating the same
// one is harmless.
export const buildCampaignStatusChangeCriteria = ({
  fromStatus,
  toStatus,
}: {
  fromStatus: ProspectingCampaignStatus;
  toStatus: ProspectingCampaignStatus;
}) => In([fromStatus, toStatus]);
