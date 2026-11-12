import gql from 'graphql-tag';
import { getAccessTokenForCredentials } from 'test/integration/graphql/utils/get-access-token-for-credentials.util';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';
import { updateFeatureFlag } from 'test/integration/metadata/suites/utils/update-feature-flag.util';
import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { waitForAllJobsToFinish } from 'test/integration/utils/wait-for-all-jobs-to-finish.util';
import { type IcpCriterion } from 'twenty-shared/icp-analysis';
import { FeatureFlagKey } from 'twenty-shared/types';

import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { type IcpScoringService } from 'src/modules/icp-analysis/scoring/services/icp-scoring.service';

const MODEL_MUTATIONS = [
  'analyzeIcpModel',
  'suggestIcpModelCriteria',
  'duplicateIcpModel',
  'activateIcpModel',
] as const;

const buildCountryCriterion = (country: string): IcpCriterion => ({
  id: `address.addressCountry:in:${country}`,
  attributeKey: 'address.addressCountry',
  attributeLabel: 'Address country',
  label: `Address country: ${country}`,
  category: 'FIRMOGRAPHIC',
  match: { type: 'IN', values: [country] },
  weight: 20,
  isHardExclusion: false,
});

const createCompany = async (token: string, name: string, country: string) => {
  const response = await makeGraphqlAPIRequest(
    {
      query: gql`
        mutation CreateCompany($data: CompanyCreateInput!) {
          createCompany(data: $data) {
            id
          }
        }
      `,
      variables: { data: { name, address: { addressCountry: country } } },
    },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.createCompany.id as string;
};

const findCompanyScore = async (token: string, id: string) => {
  const response = await makeGraphqlAPIRequest(
    {
      query: gql`
        query Company($filter: CompanyFilterInput) {
          company(filter: $filter) {
            icpScore
            icpTier
            icpScoreReasons
          }
        }
      `,
      variables: { filter: { id: { eq: id } } },
    },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.company;
};

const createModel = async (
  token: string,
  name: string,
  criteria: IcpCriterion[],
) => {
  const response = await makeGraphqlAPIRequest(
    {
      query: gql`
        mutation CreateIcpModel($data: IcpModelCreateInput!) {
          createIcpModel(data: $data) {
            id
          }
        }
      `,
      variables: { data: { name, criteria } },
    },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.createIcpModel.id as string;
};

const findModel = async (token: string, id: string) => {
  const response = await makeGraphqlAPIRequest(
    {
      query: gql`
        query FindIcpModels($filter: IcpModelFilterInput) {
          icpModels(filter: $filter) {
            edges {
              node {
                id
                name
                status
              }
            }
          }
        }
      `,
      variables: { filter: { id: { eq: id } } },
    },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.icpModels.edges[0]?.node ?? null;
};

const runModelMutation = (
  token: string,
  mutation: (typeof MODEL_MUTATIONS)[number],
  modelId: string,
) =>
  makeMetadataAPIRequest(
    {
      query: gql`
        mutation RunModelMutation($input: IcpModelIdInput!) {
          ${mutation}(input: $input) {
            modelId
          }
        }
      `,
      variables: { input: { modelId } },
    },
    token,
  );

const destroyRecords = async (
  token: string,
  objectName: string,
  ids: string[],
) => {
  for (const id of ids) {
    await makeGraphqlAPIRequest(
      {
        query: gql`
          mutation Destroy($id: UUID!) {
            destroy${objectName}(id: $id) {
              id
            }
          }
        `,
        variables: { id },
      },
      token,
    );
  }
};

const setIcpAnalysisFlag = async (value: boolean) => {
  for (const workspaceId of [
    SEED_APPLE_WORKSPACE_ID,
    SEED_YCOMBINATOR_WORKSPACE_ID,
  ]) {
    await updateFeatureFlag({
      featureFlag: FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED,
      value,
      workspaceId,
      expectToFail: false,
    });
  }
};

// Apple (Jane) and YCombinator (Tim) both have the ICP analysis permission.
// Every check runs Apple's credentials against YCombinator's model, which must
// behave as if it did not exist, and each workspace scores its own records
// with its own active model.
describe('ICP analysis tenant isolation (integration)', () => {
  const appleToken = APPLE_JANE_ADMIN_ACCESS_TOKEN;
  let ycToken: string;
  let ycModelId: string;
  let ycCompanyId: string;
  let appleModelId: string;
  let appleCompanyId: string;

  beforeAll(async () => {
    await setIcpAnalysisFlag(true);

    ycToken = await getAccessTokenForCredentials({
      email: 'tim@apple.dev',
      workspaceSubdomain: 'yc',
    });

    ycCompanyId = await createCompany(
      ycToken,
      'Isolation YCombinator company',
      'United States',
    );
    ycModelId = await createModel(ycToken, 'YCombinator model', [
      buildCountryCriterion('United States'),
    ]);

    appleCompanyId = await createCompany(
      appleToken,
      'Isolation Apple company',
      'United States',
    );
    appleModelId = await createModel(appleToken, 'Apple model', [
      buildCountryCriterion('Canada'),
    ]);

    for (const [token, modelId] of [
      [ycToken, ycModelId],
      [appleToken, appleModelId],
    ]) {
      const response = await runModelMutation(
        token,
        'activateIcpModel',
        modelId,
      );

      expect(response.body.errors).toBeUndefined();
    }

    await waitForAllJobsToFinish();
  });

  afterAll(async () => {
    await destroyRecords(ycToken, 'Company', [ycCompanyId]);
    await destroyRecords(ycToken, 'IcpModel', [ycModelId]);
    await destroyRecords(appleToken, 'Company', [appleCompanyId]);
    await destroyRecords(appleToken, 'IcpModel', [appleModelId]);

    await setIcpAnalysisFlag(false);
  });

  it('does not return another workspace model', async () => {
    expect(await findModel(appleToken, ycModelId)).toBeNull();
    expect(await findModel(ycToken, ycModelId)).toMatchObject({
      status: 'ACTIVE',
    });
  });

  it.each(MODEL_MUTATIONS)(
    'reports another workspace model as not found for %s',
    async (mutation) => {
      const response = await runModelMutation(appleToken, mutation, ycModelId);

      expect(response.body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    },
  );

  it('reports another workspace model as not found for its evidence', async () => {
    const response = await makeMetadataAPIRequest(
      {
        query: gql`
          query IcpModelEvidence($input: IcpModelIdInput!) {
            icpModelEvidence(input: $input) {
              modelId
            }
          }
        `,
        variables: { input: { modelId: ycModelId } },
      },
      appleToken,
    );

    expect(response.body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });

  it('cannot update or delete another workspace model', async () => {
    const updateResponse = await makeGraphqlAPIRequest(
      {
        query: gql`
          mutation UpdateIcpModel($id: UUID!, $data: IcpModelUpdateInput!) {
            updateIcpModel(id: $id, data: $data) {
              id
            }
          }
        `,
        variables: { id: ycModelId, data: { name: 'Taken over' } },
      },
      appleToken,
    );

    const deleteResponse = await makeGraphqlAPIRequest(
      {
        query: gql`
          mutation DeleteIcpModel($id: UUID!) {
            deleteIcpModel(id: $id) {
              id
            }
          }
        `,
        variables: { id: ycModelId },
      },
      appleToken,
    );

    expect(updateResponse.body.errors).toBeDefined();
    expect(deleteResponse.body.errors).toBeDefined();
    expect(await findModel(ycToken, ycModelId)).toMatchObject({
      name: 'YCombinator model',
      status: 'ACTIVE',
    });
  });

  it('scores each workspace with its own active model', async () => {
    expect(await findCompanyScore(ycToken, ycCompanyId)).toEqual({
      icpScore: 100,
      icpTier: 'PRIORITY',
      icpScoreReasons: 'Address country: United States (+20)',
    });
    expect(await findCompanyScore(appleToken, appleCompanyId)).toMatchObject({
      icpScore: 0,
      icpTier: 'EXCLUDED',
    });
  });

  it('never writes another workspace record from a scoring job', async () => {
    const icpScoringService =
      getAppProviderByClassName<IcpScoringService>('IcpScoringService');

    const summary = await icpScoringService.scoreRecords({
      workspaceId: SEED_APPLE_WORKSPACE_ID,
      companyIds: [ycCompanyId],
      candidateIds: [],
      changedCompanyFieldNames: null,
    });

    expect(summary).toMatchObject({
      scoredCompanyCount: 0,
      updatedCompanyCount: 0,
    });
    expect(await findCompanyScore(ycToken, ycCompanyId)).toMatchObject({
      icpScore: 100,
    });
  });
});
