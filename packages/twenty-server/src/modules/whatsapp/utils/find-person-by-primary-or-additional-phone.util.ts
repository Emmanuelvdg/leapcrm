import { isNonEmptyString } from '@sniptt/guards';

import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { toDigitsOnly } from 'src/modules/whatsapp/utils/normalize-whatsapp-phone-number.util';

// WhatsApp-scoped standalone equivalent of match-participant's
// findPersonByPrimaryOrAdditionalEmail. Deliberately not implemented on top of
// MatchParticipantService — that service is shared by email/calendar matching
// and touching it risks regressions there for a channel it doesn't know about.
export function findPersonByPrimaryOrAdditionalPhone({
  people,
  phoneDigitsOnly,
}: {
  people: PersonWorkspaceEntity[];
  phoneDigitsOnly: string;
}): PersonWorkspaceEntity | undefined {
  if (!phoneDigitsOnly) {
    return undefined;
  }

  const personWithPrimaryPhone = people.find((person) => {
    const primaryDigits = toDigitsOnly(
      `${person.phones?.primaryPhoneCallingCode ?? ''}${
        person.phones?.primaryPhoneNumber ?? ''
      }`,
    );

    return isNonEmptyString(primaryDigits) && primaryDigits === phoneDigitsOnly;
  });

  if (personWithPrimaryPhone) {
    return personWithPrimaryPhone;
  }

  return people.find((person) => {
    const additionalPhones = person.phones?.additionalPhones;

    if (!Array.isArray(additionalPhones)) {
      return false;
    }

    return additionalPhones.some((additionalPhone) => {
      const additionalDigits = toDigitsOnly(
        `${additionalPhone.callingCode ?? ''}${additionalPhone.number ?? ''}`,
      );

      return additionalDigits === phoneDigitsOnly;
    });
  });
}
