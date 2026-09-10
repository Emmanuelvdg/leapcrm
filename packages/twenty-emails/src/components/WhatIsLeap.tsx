import { type I18n } from '@lingui/core';
import { MainText } from 'src/components/MainText';
import { SubTitle } from 'src/components/SubTitle';

type WhatIsLeapProps = {
  i18n: I18n;
};

export const WhatIsLeap = ({ i18n }: WhatIsLeapProps) => {
  return (
    <>
      <SubTitle value={i18n._('What is Leap CRM?')} />
      <MainText>
        {i18n._(
          "It's a CRM, a software to help businesses manage their customer data and relationships efficiently.",
        )}
      </MainText>
    </>
  );
};
