import gql from 'graphql-tag';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';
import { updateFeatureFlag } from 'test/integration/metadata/suites/utils/update-feature-flag.util';
import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { waitForAllJobsToFinish } from 'test/integration/utils/wait-for-all-jobs-to-finish.util';
import { type IcpCriterion } from 'twenty-shared/icp-analysis';
import { FeatureFlagKey } from 'twenty-shared/types';

import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { type IcpScoringService } from 'src/modules/icp-analysis/scoring/services/icp-scoring.service';

const US_CRITERION: IcpCriterion = {
  id: 'address.addressCountry:in:United States',
  attributeKey: 'address.addressCountry',
  attributeLabel: 'Address country',
  label: 'Address country: United States',
  category: 'FIRMOGRAPHIC',
  match: { type: 'IN', values: ['United States'] },
  weight: 20,
  isHardExclusion: false,
};

const EMPLOYEES_CRITERION: IcpCriterion = {
  id: 'employees:between:100:',
  attributeKey: 'employees',
  attributeLabel: 'Employees',
  label: 'Employees: 100+',
  category: 'FIRMOGRAPHIC',
  match: { type: 'BETWEEN', min: 100, max: null },
  weight: 10,
  isHardExclusion: false,
};

const SCORE_FIELDS = `
  icpScore
  icpTier
  icpScoreReasons
  icpCoverage
  icpModelVersion
`;

const createCompany = async (name: string, country: string) => {
  const response = await makeGraphqlAPIRequest({
    query: gql`
      mutation CreateCompany($data: CompanyCreateInput!) {
        createCompany(data: $data) {
          id
        }
      }
    `,
    variables: { data: { name, address: { addressCountry: country } } },
  });

  expect(response.body.errors).toBeUndefined();

  return response.body.data.createCompany.id as string;
};

const findCompanyScore = async (id: string) => {
  const response = await makeGraphqlAPIRequest({
    query: gql`
      query Company($filter: CompanyFilterInput) {
        company(filter: $filter) {
          ${SCORE_FIELDS}
        }
      }
    `,
    variables: { filter: { id: { eq: id } } },
  });

  expect(response.body.errors).toBeUndefined();

  return response.body.data.company;
};

const destroyRecords = async (objectName: string, ids: string[]) => {
  for (const id of ids) {
    await makeGraphqlAPIRequest({
      query: gql`
        mutation Destroy($id: UUID!) {
          destroy${objectName}(id: $id) {
            id
          }
        }
      `,
      variables: { id },
    });
  }
};

describe('ICP scoring (integration)', () => {
  let modelId: string;
  let unitedStatesCompanyId: string;
  let canadaCompanyId: string;
  let candidateId: string | undefined;

  beforeAll(async () => {
    await updateFeatureFlag({
      featureFlag: FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED,
      value: true,
      expectToFail: false,
    });

    unitedStatesCompanyId = await createCompany(
      'ICP scoring United States',
      'United States',
    );
    canadaCompanyId = await createCompany('ICP scoring Canada', 'Canada');

    const createResponse = await makeGraphqlAPIRequest({
      query: gql`
        mutation CreateIcpModel($data: IcpModelCreateInput!) {
          createIcpModel(data: $data) {
            id
          }
        }
      `,
      variables: {
        data: {
          name: 'Scoring check model',
          criteria: [US_CRITERION, EMPLOYEES_CRITERION],
        },
      },
    });

    expect(createResponse.body.errors).toBeUndefined();

    modelId = createResponse.body.data.createIcpModel.id;

    const activateResponse = await makeMetadataAPIRequest({
      query: gql`
        mutation ActivateIcpModel($input: IcpModelIdInput!) {
          activateIcpModel(input: $input) {
            modelId
            version
          }
        }
      `,
      variables: { input: { modelId } },
    });

    expect(activateResponse.body.errors).toBeUndefined();

    await waitForAllJobsToFinish();
  });

  afterAll(async () => {
    await destroyRecords('Company', [unitedStatesCompanyId, canadaCompanyId]);
    await destroyRecords('ProspectCandidate', candidateId ? [candidateId] : []);
    await destroyRecords('IcpModel', [modelId]);

    await updateFeatureFlag({
      featureFlag: FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED,
      value: false,
      expectToFail: false,
    });
  });

  it('scores every company when the model is activated', async () => {
    expect(await findCompanyScore(unitedStatesCompanyId)).toEqual({
      icpScore: 67,
      icpTier: 'TARGET',
      icpScoreReasons:
        'Address country: United States (+20) · Employees unknown',
      icpCoverage: 67,
      icpModelVersion: 1,
    });
    expect(await findCompanyScore(canadaCompanyId)).toMatchObject({
      icpScore: 0,
      icpTier: 'EXCLUDED',
    });
  });

  // Address is a composite field, and changing one through the API emits no
  // update event, so the change is made on a plain number field instead.
  it('rescores a company when a field the model reads changes', async () => {
    const response = await makeGraphqlAPIRequest({
      query: gql`
        mutation UpdateCompany($id: UUID!, $data: CompanyUpdateInput!) {
          updateCompany(id: $id, data: $data) {
            id
          }
        }
      `,
      variables: {
        id: canadaCompanyId,
        data: { employees: 500 },
      },
    });

    expect(response.body.errors).toBeUndefined();

    await waitForAllJobsToFinish();

    expect(await findCompanyScore(canadaCompanyId)).toMatchObject({
      icpScore: 33,
      icpScoreReasons: 'Employees: 100+ (+10)',
    });
  });

  it('scores a new candidate from its own country and size', async () => {
    const response = await makeGraphqlAPIRequest({
      query: gql`
        mutation CreateProspectCandidate($data: ProspectCandidateCreateInput!) {
          createProspectCandidate(data: $data) {
            id
          }
        }
      `,
      variables: {
        data: {
          name: 'ICP scoring candidate',
          country: 'US',
          employeeCount: 250,
        },
      },
    });

    expect(response.body.errors).toBeUndefined();

    candidateId = response.body.data.createProspectCandidate.id;

    await waitForAllJobsToFinish();

    const candidateResponse = await makeGraphqlAPIRequest({
      query: gql`
        query ProspectCandidate($filter: ProspectCandidateFilterInput) {
          prospectCandidate(filter: $filter) {
            ${SCORE_FIELDS}
          }
        }
      `,
      variables: { filter: { id: { eq: candidateId } } },
    });

    expect(candidateResponse.body.data.prospectCandidate).toMatchObject({
      icpScore: 100,
      icpTier: 'PRIORITY',
    });
  });

  it('writes nothing when a nightly rescore finds no change', async () => {
    const icpScoringService =
      getAppProviderByClassName<IcpScoringService>('IcpScoringService');

    const summary = await icpScoringService.scoreAll(SEED_APPLE_WORKSPACE_ID);

    expect(summary).toMatchObject({
      updatedCompanyCount: 0,
      updatedCandidateCount: 0,
    });
    expect(summary?.scoredCompanyCount).toBeGreaterThan(0);
  });
});
