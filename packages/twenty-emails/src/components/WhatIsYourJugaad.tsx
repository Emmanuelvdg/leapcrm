import { type I18n } from '@lingui/core';
import { MainText } from 'src/components/MainText';
import { SubTitle } from 'src/components/SubTitle';

type WhatIsYourJugaadProps = {
  i18n: I18n;
};

export const WhatIsYourJugaad = ({ i18n }: WhatIsYourJugaadProps) => {
  return (
    <>
      <SubTitle value={i18n._('What is Your Jugaad CRM?')} />
      <MainText>
        {i18n._(
          'Your Jugaad CRM brings your leads, WhatsApp chats, calls and deals into one window, so no enquiry goes cold.',
        )}
      </MainText>
    </>
  );
};
