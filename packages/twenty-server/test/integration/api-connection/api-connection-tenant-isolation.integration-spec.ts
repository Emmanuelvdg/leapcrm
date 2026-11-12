import gql from 'graphql-tag';
import { getAccessTokenForCredentials } from 'test/integration/graphql/utils/get-access-token-for-credentials.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';

const PLACEHOLDER_KEY = 'glb_live_PLACEHOLDER_INTEGRATION_KEY';

const API_CONNECTION_FIELDS = `
  id
  name
  hasSecret
  status
  operations
`;

// No test operation, so creating the connection never calls GetLeads.
const createGetLeadsConnection = async (token: string) => {
  const response = await makeMetadataAPIRequest(
    {
      query: gql`
        mutation CreateApiConnection($input: CreateApiConnectionInput!) {
          createApiConnection(input: $input) {
            ${API_CONNECTION_FIELDS}
          }
        }
      `,
      variables: {
        input: {
          name: 'GetLeads isolation',
          baseUrl: 'https://app.getleads.io/api/v1',
          authType: 'BEARER',
          secret: PLACEHOLDER_KEY,
          operations: [
            {
              name: 'search_contacts_count',
              description: 'Count contacts',
              method: 'POST',
              path: '/contacts/search/count',
              parameters: [],
              requestBodySchema: { type: 'object', properties: {} },
              isEnabled: true,
            },
          ],
        },
      },
    },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.createApiConnection;
};

const runQuery = (
  token: string,
  query: string,
  variables: Record<string, unknown>,
) =>
  makeMetadataAPIRequest(
    {
      query: gql`
        ${query}
      `,
      variables,
    },
    token,
  );

describe('API connection tenant isolation (integration)', () => {
  const appleToken = APPLE_JANE_ADMIN_ACCESS_TOKEN;
  let ycToken: string;
  let appleConnectionId: string;

  beforeAll(async () => {
    ycToken = await getAccessTokenForCredentials({
      email: 'tim@apple.dev',
      workspaceSubdomain: 'yc',
    });

    const connection = await createGetLeadsConnection(appleToken);

    appleConnectionId = connection.id;
  });

  afterAll(async () => {
    await runQuery(
      appleToken,
      `mutation DeleteApiConnection($id: UUID!) {
        deleteApiConnection(id: $id) { id }
      }`,
      { id: appleConnectionId },
    );
  });

  it('stores the key without ever returning it', async () => {
    const response = await runQuery(
      appleToken,
      `query ApiConnection($id: UUID!) {
        apiConnection(id: $id) { ${API_CONNECTION_FIELDS} }
      }`,
      { id: appleConnectionId },
    );

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.apiConnection).toMatchObject({
      hasSecret: true,
      status: 'PENDING',
    });
    expect(JSON.stringify(response.body)).not.toContain(PLACEHOLDER_KEY);
  });

  it('does not list another workspace connection', async () => {
    const response = await runQuery(
      ycToken,
      `query ApiConnections { apiConnections { id } }`,
      {},
    );

    expect(response.body.errors).toBeUndefined();
    expect(
      response.body.data.apiConnections.map(
        (connection: { id: string }) => connection.id,
      ),
    ).not.toContain(appleConnectionId);
  });

  it.each([
    [
      'read',
      `query ApiConnection($id: UUID!) { apiConnection(id: $id) { id } }`,
    ],
    [
      'test',
      `mutation TestApiConnection($id: UUID!) {
        testApiConnection(id: $id) { success }
      }`,
    ],
    [
      'delete',
      `mutation DeleteApiConnection($id: UUID!) {
        deleteApiConnection(id: $id) { id }
      }`,
    ],
  ])('cannot %s another workspace connection', async (_label, query) => {
    const response = await runQuery(ycToken, query, { id: appleConnectionId });

    expect(response.body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });

  it('cannot update or list operations of another workspace connection', async () => {
    const updateResponse = await runQuery(
      ycToken,
      `mutation UpdateApiConnection($input: UpdateApiConnectionInput!) {
        updateApiConnection(input: $input) { id }
      }`,
      { input: { id: appleConnectionId, baseUrl: 'https://attacker.example' } },
    );

    expect(updateResponse.body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');

    const operationsResponse = await runQuery(
      ycToken,
      `query Operations($connectionId: UUID!) {
        apiConnectionOperationTools(connectionId: $connectionId) { name }
      }`,
      { connectionId: appleConnectionId },
    );

    expect(operationsResponse.body.errors?.[0]?.extensions?.code).toBe(
      'NOT_FOUND',
    );
  });

  it('requires the integrations permission to manage connections', async () => {
    const response = await runQuery(
      APPLE_JONY_MEMBER_ACCESS_TOKEN,
      `query ApiConnections { apiConnections { id } }`,
      {},
    );

    expect(response.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });
});
