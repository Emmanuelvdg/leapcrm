import gql from 'graphql-tag';
import { getAccessTokenForCredentials } from 'test/integration/graphql/utils/get-access-token-for-credentials.util';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';
import { updateFeatureFlag } from 'test/integration/metadata/suites/utils/update-feature-flag.util';
import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { waitForAllJobsToFinish } from 'test/integration/utils/wait-for-all-jobs-to-finish.util';
import { FeatureFlagKey } from 'twenty-shared/types';

import { type ProspectingJobLedgerService } from 'src/engine/core-modules/prospecting-job/services/prospecting-job-ledger.service';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { buildDiscoverPageJob } from 'src/modules/prospecting/discovery/utils/discover-page-job.util';

const FIXTURE_CAMPAIGN_DATA = {
  icp: { targetGeographies: [{ countryCode: 'SG' }] },
  discoverySources: ['fixture'],
  targetCandidateCount: 5,
};

const CAMPAIGN_ACTIONS = [
  'startProspectingCampaign',
  'pauseProspectingCampaign',
  'resumeProspectingCampaign',
  'cancelProspectingCampaign',
] as const;

type CampaignAction = (typeof CAMPAIGN_ACTIONS)[number];

const createCampaign = async ({
  token,
  name,
  status,
}: {
  token: string;
  name: string;
  status?: string;
}): Promise<string> => {
  const response = await makeGraphqlAPIRequest(
    {
      query: gql`
        mutation CreateProspectingCampaign(
          $data: ProspectingCampaignCreateInput!
        ) {
          createProspectingCampaign(data: $data) {
            id
          }
        }
      `,
      variables: { data: { name, status, ...FIXTURE_CAMPAIGN_DATA } },
    },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.createProspectingCampaign.id;
};

const findCampaign = async (token: string, campaignId: string) => {
  const response = await makeGraphqlAPIRequest(
    {
      query: gql`
        query FindProspectingCampaigns(
          $filter: ProspectingCampaignFilterInput
        ) {
          prospectingCampaigns(filter: $filter) {
            edges {
              node {
                id
                name
                status
                candidatesFound
                deletedAt
              }
            }
          }
        }
      `,
      variables: { filter: { id: { eq: campaignId } } },
    },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.prospectingCampaigns.edges[0]?.node ?? null;
};

const findCandidates = async (
  token: string,
  filter: Record<string, unknown>,
): Promise<{ id: string; name: string; campaignId: string }[]> => {
  const response = await makeGraphqlAPIRequest(
    {
      query: gql`
        query FindProspectCandidates($filter: ProspectCandidateFilterInput) {
          prospectCandidates(filter: $filter) {
            edges {
              node {
                id
                name
                campaignId
              }
            }
          }
        }
      `,
      variables: { filter },
    },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.prospectCandidates.edges.map(
    ({ node }: { node: { id: string; name: string; campaignId: string } }) =>
      node,
  );
};

const countAllCandidates = async (token: string) =>
  (await findCandidates(token, {})).length;

const runCampaignAction = (
  token: string,
  action: CampaignAction,
  campaignId: string,
) =>
  makeMetadataAPIRequest(
    {
      query: gql`
        mutation RunCampaignAction($input: ProspectingCampaignIdInput!) {
          ${action}(input: $input) {
            campaignId
            status
          }
        }
      `,
      variables: { input: { campaignId } },
    },
    token,
  );

const importCompanies = (
  token: string,
  campaignId: string,
  companies: { name: string; domain?: string; country?: string }[],
) =>
  makeMetadataAPIRequest(
    {
      query: gql`
        mutation ImportProspectCandidates(
          $input: ImportProspectCandidatesInput!
        ) {
          importProspectCandidates(input: $input) {
            createdCount
            candidatesFound
          }
        }
      `,
      variables: { input: { campaignId, companies } },
    },
    token,
  );

const destroyCampaigns = async (token: string, campaignIds: string[]) => {
  await makeGraphqlAPIRequest(
    {
      query: gql`
        mutation DestroyProspectCandidates(
          $filter: ProspectCandidateFilterInput!
        ) {
          destroyProspectCandidates(filter: $filter) {
            id
          }
        }
      `,
      variables: { filter: { campaignId: { in: campaignIds } } },
    },
    token,
  );

  await makeGraphqlAPIRequest(
    {
      query: gql`
        mutation DestroyProspectingCampaigns(
          $filter: ProspectingCampaignFilterInput!
        ) {
          destroyProspectingCampaigns(filter: $filter) {
            id
          }
        }
      `,
      variables: { filter: { id: { in: campaignIds } } },
    },
    token,
  );
};

const findLedgerJobs = (campaignId: string) =>
  global.testDataSource.query(
    `SELECT "workspaceId", "status" FROM "core"."prospectingJob" WHERE "campaignId" = $1`,
    [campaignId],
  ) as Promise<{ workspaceId: string; status: string }[]>;

// Apple (Jane) and YCombinator (Tim) are both admins with the prospecting
// permission; every check runs Apple's credentials against YCombinator's
// records, which must behave as if those records did not exist.
describe('prospecting tenant isolation (integration)', () => {
  const appleToken = APPLE_JANE_ADMIN_ACCESS_TOKEN;
  let ycToken: string;
  let ycCampaignId: string;
  let ycCandidateId: string;
  const appleCampaignIds: string[] = [];

  beforeAll(async () => {
    for (const workspaceId of [
      SEED_APPLE_WORKSPACE_ID,
      SEED_YCOMBINATOR_WORKSPACE_ID,
    ]) {
      await updateFeatureFlag({
        featureFlag: FeatureFlagKey.IS_PROSPECTING_ENABLED,
        value: true,
        workspaceId,
        expectToFail: false,
      });
    }

    ycToken = await getAccessTokenForCredentials({
      email: 'tim@apple.dev',
      workspaceSubdomain: 'yc',
    });

    ycCampaignId = await createCampaign({
      token: ycToken,
      name: 'YCombinator campaign',
    });

    const importResponse = await importCompanies(ycToken, ycCampaignId, [
      { name: 'Isolation Test Pte Ltd', domain: 'isolation-test.sg' },
    ]);

    expect(importResponse.body.errors).toBeUndefined();

    [{ id: ycCandidateId }] = await findCandidates(ycToken, {
      campaignId: { eq: ycCampaignId },
    });
  });

  afterAll(async () => {
    await destroyCampaigns(ycToken, [ycCampaignId]);
    await destroyCampaigns(appleToken, appleCampaignIds);

    for (const workspaceId of [
      SEED_APPLE_WORKSPACE_ID,
      SEED_YCOMBINATOR_WORKSPACE_ID,
    ]) {
      await updateFeatureFlag({
        featureFlag: FeatureFlagKey.IS_PROSPECTING_ENABLED,
        value: false,
        workspaceId,
        expectToFail: false,
      });
    }
  });

  it('does not return another workspace campaign or candidates', async () => {
    expect(await findCampaign(appleToken, ycCampaignId)).toBeNull();
    expect(
      await findCandidates(appleToken, { campaignId: { eq: ycCampaignId } }),
    ).toEqual([]);
    expect(
      await findCandidates(appleToken, { id: { eq: ycCandidateId } }),
    ).toEqual([]);
  });

  it('cannot update or delete another workspace campaign', async () => {
    const updateResponse = await makeGraphqlAPIRequest(
      {
        query: gql`
          mutation UpdateProspectingCampaign(
            $id: UUID!
            $data: ProspectingCampaignUpdateInput!
          ) {
            updateProspectingCampaign(id: $id, data: $data) {
              id
            }
          }
        `,
        variables: { id: ycCampaignId, data: { name: 'Taken over' } },
      },
      appleToken,
    );

    const deleteResponse = await makeGraphqlAPIRequest(
      {
        query: gql`
          mutation DeleteProspectingCampaign($id: UUID!) {
            deleteProspectingCampaign(id: $id) {
              id
            }
          }
        `,
        variables: { id: ycCampaignId },
      },
      appleToken,
    );

    expect(updateResponse.body.errors).toBeDefined();
    expect(deleteResponse.body.errors).toBeDefined();
    expect(await findCampaign(ycToken, ycCampaignId)).toMatchObject({
      name: 'YCombinator campaign',
      deletedAt: null,
    });
  });

  it('cannot update another workspace candidate', async () => {
    const response = await makeGraphqlAPIRequest(
      {
        query: gql`
          mutation UpdateProspectCandidate(
            $id: UUID!
            $data: ProspectCandidateUpdateInput!
          ) {
            updateProspectCandidate(id: $id, data: $data) {
              id
            }
          }
        `,
        variables: { id: ycCandidateId, data: { name: 'Taken over' } },
      },
      appleToken,
    );

    expect(response.body.errors).toBeDefined();
    expect(
      await findCandidates(ycToken, { id: { eq: ycCandidateId } }),
    ).toMatchObject([{ name: 'Isolation Test Pte Ltd' }]);
  });

  it.each(CAMPAIGN_ACTIONS)(
    'reports another workspace campaign as not found for %s',
    async (action) => {
      const response = await runCampaignAction(
        appleToken,
        action,
        ycCampaignId,
      );

      expect(response.body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
      expect(await findCampaign(ycToken, ycCampaignId)).toMatchObject({
        status: 'DRAFT',
      });
      expect(await findLedgerJobs(ycCampaignId)).toEqual([]);
    },
  );

  it('cannot import companies into another workspace campaign', async () => {
    const response = await importCompanies(appleToken, ycCampaignId, [
      { name: 'Intruder Ltd', domain: 'intruder.example' },
    ]);

    expect(response.body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    expect(
      await findCandidates(ycToken, { campaignId: { eq: ycCampaignId } }),
    ).toHaveLength(1);
    expect(
      await findCandidates(appleToken, { name: { eq: 'Intruder Ltd' } }),
    ).toEqual([]);
  });

  it('keeps a campaign discovery inside its own workspace', async () => {
    const ycCandidateCountBefore = await countAllCandidates(ycToken);
    const appleCampaignId = await createCampaign({
      token: appleToken,
      name: 'Apple campaign',
    });

    appleCampaignIds.push(appleCampaignId);

    const startResponse = await runCampaignAction(
      appleToken,
      'startProspectingCampaign',
      appleCampaignId,
    );

    expect(startResponse.body.errors).toBeUndefined();

    await waitForAllJobsToFinish();

    expect(await findCampaign(appleToken, appleCampaignId)).toMatchObject({
      status: 'COMPLETED',
      candidatesFound: 5,
    });
    expect(
      await findCandidates(appleToken, { campaignId: { eq: appleCampaignId } }),
    ).toHaveLength(5);
    expect(await countAllCandidates(ycToken)).toBe(ycCandidateCountBefore);

    const ledgerJobs = await findLedgerJobs(appleCampaignId);

    expect(ledgerJobs.length).toBeGreaterThan(0);
    expect(
      ledgerJobs.every(
        ({ workspaceId }) => workspaceId === SEED_APPLE_WORKSPACE_ID,
      ),
    ).toBe(true);
  });

  // A running campaign makes this meaningful: a runner that looked the
  // campaign up outside the job's workspace would discover into it.
  it('never runs a job against a campaign outside the job workspace', async () => {
    const runningAppleCampaignId = await createCampaign({
      token: appleToken,
      name: 'Running Apple campaign',
      status: 'RUNNING',
    });

    appleCampaignIds.push(runningAppleCampaignId);

    const ycCandidateCountBefore = await countAllCandidates(ycToken);
    const ledgerService =
      getAppProviderByClassName<ProspectingJobLedgerService>(
        'ProspectingJobLedgerService',
      );

    const [forgedJob] = await ledgerService.createJobs([
      buildDiscoverPageJob({
        workspaceId: SEED_YCOMBINATOR_WORKSPACE_ID,
        campaignId: runningAppleCampaignId,
        icpVersion: 1,
        stage: { providerId: 'fixture', countryCode: 'SG' },
        cursor: null,
        pageIndex: 0,
        profileFingerprint: 'forged',
      }),
    ]);

    await waitForAllJobsToFinish();

    const [{ status }] = await global.testDataSource.query(
      `SELECT "status" FROM "core"."prospectingJob" WHERE "id" = $1`,
      [forgedJob.id],
    );

    expect(status).toBe('CANCELLED');
    expect(
      await findCandidates(appleToken, {
        campaignId: { eq: runningAppleCampaignId },
      }),
    ).toEqual([]);
    expect(await countAllCandidates(ycToken)).toBe(ycCandidateCountBefore);
  });
});
