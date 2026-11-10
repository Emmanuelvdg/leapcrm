import gql from 'graphql-tag';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';
import { updateFeatureFlag } from 'test/integration/metadata/suites/utils/update-feature-flag.util';
import { FeatureFlagKey } from 'twenty-shared/types';

const ANALYZE_ICP_MODEL = gql`
  mutation AnalyzeIcpModel($input: IcpModelIdInput!) {
    analyzeIcpModel(input: $input) {
      modelId
      analysis
    }
  }
`;

const ICP_MODEL_EVIDENCE = gql`
  query IcpModelEvidence($input: IcpModelIdInput!) {
    icpModelEvidence(input: $input) {
      modelId
      rows
    }
  }
`;

const setIcpAnalysisFlag = (value: boolean) =>
  updateFeatureFlag({
    featureFlag: FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED,
    value,
    expectToFail: false,
  });

describe('ICP analysis access (integration)', () => {
  let modelId: string;

  beforeAll(async () => {
    await setIcpAnalysisFlag(true);

    const response = await makeGraphqlAPIRequest({
      query: gql`
        mutation CreateIcpModel($data: IcpModelCreateInput!) {
          createIcpModel(data: $data) {
            id
            status
            version
            wonStages
            lostStages
          }
        }
      `,
      variables: { data: { name: 'Access check model' } },
    });

    expect(response.body.errors).toBeUndefined();

    modelId = response.body.data.createIcpModel.id;
  });

  afterAll(async () => {
    await makeGraphqlAPIRequest({
      query: gql`
        mutation DestroyIcpModel($id: UUID!) {
          destroyIcpModel(id: $id) {
            id
          }
        }
      `,
      variables: { id: modelId },
    });

    await setIcpAnalysisFlag(false);
  });

  it('creates a model as a draft with the default stages', async () => {
    const response = await makeGraphqlAPIRequest({
      query: gql`
        query IcpModel($filter: IcpModelFilterInput) {
          icpModel(filter: $filter) {
            status
            version
            wonStages
            lostStages
          }
        }
      `,
      variables: { filter: { id: { eq: modelId } } },
    });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.icpModel).toEqual({
      status: 'DRAFT',
      version: 1,
      wonStages: ['CUSTOMER'],
      lostStages: ['LOST'],
    });
  });

  it('lets an admin analyse a model', async () => {
    const response = await makeMetadataAPIRequest({
      query: ANALYZE_ICP_MODEL,
      variables: { input: { modelId } },
    });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.analyzeIcpModel.modelId).toBe(modelId);
    expect(response.body.data.analyzeIcpModel.analysis).toEqual(
      expect.objectContaining({ patterns: expect.any(Object) }),
    );
  });

  it('lets a member read the evidence', async () => {
    const response = await makeMetadataAPIRequest(
      { query: ICP_MODEL_EVIDENCE, variables: { input: { modelId } } },
      APPLE_JONY_MEMBER_ACCESS_TOKEN,
    );

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.icpModelEvidence.modelId).toBe(modelId);
  });

  it('refuses a guest without the ICP analysis permission', async () => {
    const response = await makeMetadataAPIRequest(
      { query: ANALYZE_ICP_MODEL, variables: { input: { modelId } } },
      APPLE_PHIL_GUEST_ACCESS_TOKEN,
    );

    expect(response.body.data).toBeNull();
    expect(response.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it('refuses everyone while the feature flag is off', async () => {
    await setIcpAnalysisFlag(false);

    try {
      const response = await makeMetadataAPIRequest({
        query: ICP_MODEL_EVIDENCE,
        variables: { input: { modelId } },
      });

      expect(response.body.data).toBeNull();
      expect(response.body.errors).toBeDefined();
    } finally {
      await setIcpAnalysisFlag(true);
    }
  });
});
