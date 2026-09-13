import { Trans } from '@lingui/react';
import { BaseEmail } from 'src/components/BaseEmail';
import { CallToAction } from 'src/components/CallToAction';
import { Link } from 'src/components/Link';
import { MainText } from 'src/components/MainText';
import { Title } from 'src/components/Title';
import { WhatIsLeap } from 'src/components/WhatIsLeap';
import { createI18nInstance } from 'src/utils/i18n.utils';
import { type APP_LOCALES } from 'twenty-shared/translations';

const SUPPORT_EMAIL = 'theleapcrm@gmail.com';

type WorkspaceWelcomeEmailProps = {
  userFirstName: string;
  workspaceDisplayName: string | undefined;
  link: string;
  locale: keyof typeof APP_LOCALES;
};

// Sent once, right after a new workspace finishes activating (see
// WorkspaceService.activateWorkspace). Not a Workflow - a workspace's own
// automations have no visibility into other tenants or the platform-level
// signup event, so this has to be a direct backend hook.
export const WorkspaceWelcomeEmail = ({
  userFirstName,
  workspaceDisplayName,
  link,
  locale,
}: WorkspaceWelcomeEmailProps) => {
  const i18n = createI18nInstance(locale);

  return (
    <BaseEmail width={333} locale={locale}>
      <Title value={i18n._('Welcome to LeapCRM')} />
      <MainText>
        {userFirstName?.length > 1 ? (
          <Trans id="Hi {userFirstName}," values={{ userFirstName }} />
        ) : (
          <Trans id="Hello," />
        )}
        <br />
        <br />
        <Trans
          id="Welcome to LeapCRM! Your workspace, <0>{workspaceDisplayName}</0>, is ready to go."
          values={{ workspaceDisplayName }}
          components={{ 0: <b /> }}
        />
        <br />
        <br />
        <Trans id="Here's how to get the most out of it in your first few minutes:" />
        <br />
        <br />
        <Trans id="1. Invite your team — Settings → Members → Invite. Everyone on your plan gets full access from day one." />
        <br />
        <br />
        <Trans id="2. Import your contacts and companies — bring in what you already have via CSV, or start fresh and add records as you go." />
        <br />
        <br />
        <Trans id="3. Connect your AI provider (optional) — Settings → AI lets you plug in your own model (OpenRouter, OpenAI, Anthropic, etc.) so AI Chat and workflow agents work inside your workspace." />
        <br />
        <br />
        <Trans id="4. Build your first workflow — automate the busywork: lead routing, follow-up reminders, data enrichment, whatever fits how your team works." />
        <br />
        <br />
        <Trans id="A quick note on billing: your first month is $1, then $40/seat/month after that — no surprises, cancel anytime from Settings → Subscription." />
        <br />
        <br />
        <Trans
          id="Questions or stuck on anything? Just email <0>{supportEmail}</0> — a real person reads these."
          values={{ supportEmail: SUPPORT_EMAIL }}
          components={{
            0: <Link href={`mailto:${SUPPORT_EMAIL}`} value={SUPPORT_EMAIL} />,
          }}
        />
      </MainText>
      <br />
      <CallToAction href={link} value={i18n._('Log in to your workspace')} />
      <br />
      <br />
      <WhatIsLeap i18n={i18n} />
    </BaseEmail>
  );
};

WorkspaceWelcomeEmail.PreviewProps = {
  userFirstName: 'John',
  workspaceDisplayName: 'Acme Inc.',
  link: 'https://acme.leapcrm.tech',
  locale: 'en',
} as WorkspaceWelcomeEmailProps;

export default WorkspaceWelcomeEmail;
