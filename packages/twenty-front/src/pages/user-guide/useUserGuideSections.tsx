import { type ReactNode } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledH1 = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0 0 ${themeCssVariables.spacing[6]} 0;
`;

const StyledH2 = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: ${themeCssVariables.spacing[6]} 0 ${themeCssVariables.spacing[2]} 0;

  &:first-child {
    margin-top: 0;
  }
`;

const StyledP = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  margin: 0 0 ${themeCssVariables.spacing[3]} 0;
`;

const StyledUl = styled.ul`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  margin: 0 0 ${themeCssVariables.spacing[4]} 0;
  padding-left: ${themeCssVariables.spacing[5]};
`;

const StyledLi = styled.li`
  margin-bottom: ${themeCssVariables.spacing[1]};
`;

const StyledStrong = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledCode = styled.code`
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.xs};
  font-family: ${themeCssVariables.code.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  padding: 1px 4px;
`;

export type UserGuideEntry = {
  id: string;
  navLabel: ReactNode;
  content: ReactNode;
  isGroupLabel?: false;
};

export type UserGuideGroupLabel = {
  id: string;
  navLabel: ReactNode;
  isGroupLabel: true;
};

export type UserGuideSection = UserGuideEntry | UserGuideGroupLabel;

export const useUserGuideSections = (): UserGuideSection[] => {
  const { t } = useLingui();

  return [
    {
      id: 'overview',
      navLabel: t`Overview`,
      content: (
        <>
          <StyledH1>{t`Welcome to Leap CRM`}</StyledH1>
          <StyledP>
            <Trans>
              Leap CRM organizes your business around records: companies,
              people, opportunities, tasks and notes. Every record lives in
              one place and can be linked to the others — a person belongs to
              a company, an opportunity has a point of contact, a task or
              note can be attached to any of them at once.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              This guide has one section per item in the left-hand
              navigation, plus a dedicated section on connecting an LLM so
              you can configure workflows by chat instead of the visual
              builder.
            </Trans>
          </StyledP>
          <StyledH2>{t`Views: table, kanban, calendar`}</StyledH2>
          <StyledP>
            <Trans>
              Every object can have multiple named views. A view remembers
              its own filters, sort order, visible columns and grouping, so
              you can switch between, for example, "All companies" and "My
              open deals" without rebuilding the filter each time. Views come
              in four flavors:
            </Trans>
          </StyledP>
          <StyledUl>
            <StyledLi>
              <Trans>
                <StyledStrong>Table</StyledStrong> — a spreadsheet-style grid,
                the default for most objects.
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>Kanban</StyledStrong> — records grouped into
                columns by a select field, with each column's records shown
                as cards. Opportunities and Tasks ship with a kanban view out
                of the box.
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>Calendar</StyledStrong> — records plotted by a
                date field.
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>List</StyledStrong> — a compact single-column
                layout.
              </Trans>
            </StyledLi>
          </StyledUl>
          <StyledP>
            <Trans>
              From any table view you can also import records from a CSV
              file (upload, match columns, validate, then import) or export
              the current view — or a single record — back out to CSV.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              Press <StyledCode>Cmd/Ctrl+K</StyledCode> anywhere in the app
              to open the command menu — a fast way to jump to a record,
              switch objects, or trigger an action without leaving the
              keyboard.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'companies',
      navLabel: t`Companies`,
      content: (
        <>
          <StyledH1>{t`Companies`}</StyledH1>
          <StyledP>
            <Trans>
              A company record holds a name, domain name, LinkedIn page,
              annual revenue and a physical address. Companies are the hub
              for everything else — the people who work there, the
              opportunities you're pursuing with them, and any tasks, notes
              or file attachments related to the account.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              Companies only ship with table-style views (no kanban) — a
              company either exists as a customer/prospect or it doesn't,
              there's no natural "stage" to group by the way there is for
              opportunities.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'people',
      navLabel: t`People`,
      content: (
        <>
          <StyledH1>{t`People`}</StyledH1>
          <StyledP>
            <Trans>
              A person record holds a full name, one or more emails and
              phone numbers, a LinkedIn profile, job title, avatar, and a
              link back to the company they work for. If you've connected
              an email or calendar account (see Workspace settings below),
              people can be created automatically from the contacts you
              exchange messages with.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'opportunities',
      navLabel: t`Opportunities`,
      content: (
        <>
          <StyledH1>{t`Opportunities`}</StyledH1>
          <StyledP>
            <Trans>
              An opportunity represents a deal in progress: a name, an
              amount, an expected close date, a point of contact, an owner,
              and a stage. Stage is what makes opportunities a genuine sales
              pipeline — the built-in{' '}
              <StyledStrong>By stage</StyledStrong> kanban view groups every
              open deal into columns (New, Screening, Meeting, Proposal,
              Customer) and totals the deal value at the top of each column,
              so you can see the whole pipeline and its total value at a
              glance.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              Drag a card between columns to move a deal forward — this is
              also the field a workflow trigger can watch to fire the moment
              a deal changes stage.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'tasks',
      navLabel: t`Tasks`,
      content: (
        <>
          <StyledH1>{t`Tasks`}</StyledH1>
          <StyledP>
            <Trans>
              A task has a title, a rich-text body, a due date, a status
              (To do, In progress, Done) and an assignee. Like notes, a
              single task can be attached to more than one record at once —
              the same follow-up task can show up on a company, the person
              you spoke to, and the opportunity it relates to, all at the
              same time.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              Tasks ship with a <StyledStrong>By status</StyledStrong> kanban
              view for working through your queue, and an{' '}
              <StyledStrong>Assigned to me</StyledStrong> table view as a
              personal to-do list.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'notes',
      navLabel: t`Notes`,
      content: (
        <>
          <StyledH1>{t`Notes`}</StyledH1>
          <StyledP>
            <Trans>
              A note is a title plus a rich-text body — meeting minutes, a
              call summary, internal context that isn't a task for anyone.
              Like tasks, one note can be linked to several companies,
              people or opportunities simultaneously, so context written
              once shows up everywhere it's relevant.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'dashboards',
      navLabel: t`Dashboards`,
      content: (
        <>
          <StyledH1>{t`Dashboards`}</StyledH1>
          <StyledP>
            <Trans>
              A dashboard is a page you lay out yourself from widgets. The
              chart widgets are a single number/KPI card, a pie chart, a bar
              chart and a line chart — each configurable by which field to
              group by, date granularity, which aggregate to compute (count,
              sum, average...), and whether to stack or accumulate values.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              Beyond charts, a dashboard can also embed a saved view, a
              record table, individual fields from a record, a rich-text
              block, an iframe, or a custom component built with the
              developer SDK (see Admin panel below) — so a dashboard can
              double as a lightweight internal homepage, not just a set of
              charts.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'workflows',
      navLabel: t`Workflows`,
      content: (
        <>
          <StyledH1>{t`Workflows`}</StyledH1>
          <StyledP>
            <Trans>
              A workflow automates a sequence of actions. Every workflow
              starts with a trigger — on a schedule (cron), on a database
              event (a record created/updated/deleted), on a webhook, or run
              manually — and then a chain of action steps:
            </Trans>
          </StyledP>
          <StyledUl>
            <StyledLi>
              <Trans>
                <StyledStrong>HTTP request</StyledStrong> — call any external
                API and use its response in later steps.
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>Create / update / delete / find
                record</StyledStrong> — manipulate records on any object,
                standard or custom.
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>Iterator</StyledStrong> — loop over a list
                (e.g. the rows an HTTP request just returned) and run a set
                of steps once per item.
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>If/else &amp; filter</StyledStrong> — branch or
                stop the workflow based on a condition.
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>Send email, form, delay, AI agent,
                code</StyledStrong> — plus a handful of more specialized
                action types for the less common cases.
              </Trans>
            </StyledLi>
          </StyledUl>
          <StyledP>
            <Trans>
              A step's output is available to every later step as a
              variable, written as <StyledCode>{'{{stepId.path}}'}</StyledCode>{' '}
              — for example, the current item inside an iterator's loop is{' '}
              <StyledCode>{'{{iteratorStepId.currentItem}}'}</StyledCode>.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              Workflows are versioned: edits happen on a Draft version, and
              nothing changes for real runs until you explicitly{' '}
              <StyledStrong>Activate</StyledStrong> that version.{' '}
              <StyledStrong>Workflow runs</StyledStrong> shows the history of
              every execution, step by step, including errors — the first
              place to look when a workflow doesn't do what you expected.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'settings-group',
      navLabel: t`Settings`,
      isGroupLabel: true,
    },
    {
      id: 'settings-profile',
      navLabel: t`Profile & account`,
      content: (
        <>
          <StyledH1>{t`Profile & account`}</StyledH1>
          <StyledP>
            <Trans>
              <StyledStrong>Profile</StyledStrong> holds your name, avatar
              and password; <StyledStrong>Experience</StyledStrong> covers
              personal preferences like language and date format.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              <StyledStrong>Accounts</StyledStrong> is where you connect your
              own email and calendar — Google or Microsoft via OAuth, or any
              other provider via IMAP/SMTP/CalDAV. Once connected, you can
              control which folders sync, whether contacts are created
              automatically from people you email, and calendar event
              visibility — plus a blocklist of addresses to keep out of
              sync entirely.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'settings-workspace',
      navLabel: t`Workspace & data model`,
      content: (
        <>
          <StyledH1>{t`Workspace & data model`}</StyledH1>
          <StyledP>
            <Trans>
              <StyledStrong>General</StyledStrong> covers the workspace name
              and logo, and <StyledStrong>Layout</StyledStrong> lets you
              rearrange the left-hand navigation itself.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              <StyledStrong>Data model</StyledStrong> is where an admin
              shapes the schema: create custom objects alongside the
              standard ones, add custom fields (text, number, currency,
              date, select, multi-select, relation, rich text, files, and
              more), and define relations between objects — a Has Many or
              Belongs To One link, the same mechanism that connects People
              to Companies.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              <StyledStrong>Communication</StyledStrong> holds workspace-wide
              email/calendar sync defaults; <StyledStrong>Apps</StyledStrong>{' '}
              and <StyledStrong>AI</StyledStrong> configure installed
              applications and AI providers/models respectively (see
              Connecting an LLM below); <StyledStrong>Billing</StyledStrong>{' '}
              covers your subscription.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'settings-members-security',
      navLabel: t`Members, roles & security`,
      content: (
        <>
          <StyledH1>{t`Members, roles & security`}</StyledH1>
          <StyledP>
            <Trans>
              <StyledStrong>Members</StyledStrong> is where you invite
              teammates and manage who has access to the workspace.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              Roles restrict access at three levels, from broad to narrow:
            </Trans>
          </StyledP>
          <StyledUl>
            <StyledLi>
              <Trans>
                <StyledStrong>Object-level</StyledStrong> — which objects a
                role can see at all, and whether it can create, edit, or
                delete records on each.
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>Field-level</StyledStrong> — within an object a
                role can access, which individual fields it can see or edit
                (e.g. hide a Company's annual revenue from a Sales role).
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>Record-level</StyledStrong> — a filter that
                scopes which records of an object a role can see at all,
                including "records I own" style relative filters.
              </Trans>
            </StyledLi>
          </StyledUl>
          <StyledP>
            <Trans>
              A role can also be restricted to specific Settings pages and
              specific AI tools — this is exactly the permission that gates
              whether a role can build workflows via chat (see Connecting an
              LLM below).
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              <StyledStrong>Security</StyledStrong> covers workspace-wide
              two-factor authentication, SSO via SAML or OIDC identity
              providers, and approved email domains that let anyone with a
              matching company email join the workspace automatically
              without an individual invite.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'settings-developers',
      navLabel: t`API, webhooks & integrations`,
      content: (
        <>
          <StyledH1>{t`API, webhooks & integrations`}</StyledH1>
          <StyledP>
            <Trans>
              Every workspace exposes a full REST and GraphQL API. Under{' '}
              <StyledStrong>Developers</StyledStrong> you can generate and
              manage API keys, register outgoing webhooks scoped to specific
              objects and operations (e.g. "notify this URL whenever an
              Opportunity is created"), and try requests live in the
              built-in REST and GraphQL playgrounds.
            </Trans>
          </StyledP>
          <StyledP>
            <Trans>
              <StyledStrong>MCP &amp; APIs</StyledStrong> exposes the same
              data as a Model Context Protocol server, so an external AI
              tool can read and write your CRM directly, plus its own copy
              of the API playgrounds for quick testing.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'settings-admin',
      navLabel: t`Admin panel`,
      content: (
        <>
          <StyledH1>{t`Admin panel`}</StyledH1>
          <StyledP>
            <Trans>
              The admin panel is for instance-wide operations, not
              day-to-day CRM use:
            </Trans>
          </StyledP>
          <StyledUl>
            <StyledLi>
              <Trans>
                <StyledStrong>General</StyledStrong> — look up any workspace
                or user, check version and instance health, and{' '}
                <StyledStrong>impersonate</StyledStrong> a user for support
                purposes (gated by a per-workspace permission — off by
                default).
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>Config variables</StyledStrong> — edit
                environment-style configuration values for the instance.
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>Health status</StyledStrong> — system health
                indicators for the server, queues and background jobs.
              </Trans>
            </StyledLi>
            <StyledLi>
              <Trans>
                <StyledStrong>Apps &amp; AI</StyledStrong> — manage installed
                applications and, again, AI provider/model configuration at
                the instance level.
              </Trans>
            </StyledLi>
          </StyledUl>
          <StyledP>
            <Trans>
              For developers, the <StyledCode>twenty-sdk</StyledCode> CLI
              lets you build and publish custom applications on top of Leap
              CRM — custom front-end components, server-side logic
              functions, and new object definitions — beyond what the
              in-app data model editor covers.
            </Trans>
          </StyledP>
        </>
      ),
    },
    {
      id: 'ai-group',
      navLabel: t`AI`,
      isGroupLabel: true,
    },
    {
      id: 'connecting-llms',
      navLabel: t`Connecting an LLM`,
      content: (
        <>
          <StyledH1>{t`Connecting an LLM to Leap CRM`}</StyledH1>
          <StyledP>
            <Trans>
              Leap CRM's AI chat can do more than answer questions — it can
              build and edit workflows for you, using the same underlying
              tools as the visual workflow builder. Setting this up takes
              three steps.
            </Trans>
          </StyledP>
          <StyledH2>{t`1. Add a provider and choose a model`}</StyledH2>
          <StyledP>
            <Trans>
              In <StyledStrong>Settings → AI</StyledStrong> (or the Admin
              Panel's AI tab for instance-wide defaults), add an API key for
              your LLM provider — Anthropic, OpenAI, or a compatible
              alternative. Then set which model your workspace uses by
              default. Individual custom AI agents can override this with
              their own model if you want a specialized "workflow builder"
              persona later.
            </Trans>
          </StyledP>
          <StyledH2>{t`2. Grant the workflow permission`}</StyledH2>
          <StyledP>
            <Trans>
              In <StyledStrong>Settings → Roles</StyledStrong>, open the
              role for whoever should be able to build workflows by chat and
              enable the Workflows permission flag under its tool
              permissions. Without it, the chat still works for everyday
              questions, but the model has no access to the workflow-editing
              tools.
            </Trans>
          </StyledP>
          <StyledH2>{t`3. Start a chat`}</StyledH2>
          <StyledP>
            <Trans>
              Open <StyledStrong>AI Chat</StyledStrong> from the navigation
              and describe what you want automated, in plain language — for
              example "every time a new Opportunity is created above
              $10,000, send me an email." The model picks the right workflow
              tools on its own, wires up the trigger and steps, and reports
              back what it built.
            </Trans>
          </StyledP>
          <StyledH2>{t`What to expect`}</StyledH2>
          <StyledP>
            <Trans>
              The model can build a complete workflow in one pass and
              validate its structure before handing it back to you. It's
              less able to independently discover details about an external
              API it doesn't already know — the more specific your
              instructions about which endpoint, fields or conditions to
              use, the better the result. Always open the workflow it built
              and run a test before activating it, the same way you would
              for one you built by hand.
            </Trans>
          </StyledP>
        </>
      ),
    },
  ];
};
