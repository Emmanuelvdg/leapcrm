import { type Page } from '@playwright/test';

import { expect, test } from '../lib/fixtures/screenshot';
import { backendGraphQLUrl } from '../lib/requests/backend';
import { getAccessAuthToken } from '../lib/utils/getAccessAuthToken';

const MODEL_NAME = `E2E ICP model ${Date.now()}`;
const DEALS_PER_COUNTRY = 10;

const backendUrl = (path: string) =>
  new URL(path, process.env.BACKEND_BASE_URL).toString();

const callBackend = async (
  page: Page,
  url: string,
  query: string,
  variables: Record<string, unknown> = {},
) => {
  const { authToken } = await getAccessAuthToken(page);

  const response = await page.request.post(url, {
    headers: { Authorization: `Bearer ${authToken}` },
    data: { query, variables },
  });
  const body = await response.json();

  expect(body.errors).toBeUndefined();

  return body.data;
};

const setIcpAnalysisFlag = async (page: Page, value: boolean) => {
  const { currentUser } = await callBackend(
    page,
    backendUrl('/metadata'),
    `query { currentUser { currentWorkspace { id } } }`,
  );

  await callBackend(
    page,
    backendUrl('/admin-panel'),
    `mutation UpdateWorkspaceFeatureFlag($workspaceId: UUID!, $featureFlag: String!, $value: Boolean!) {
      updateWorkspaceFeatureFlag(workspaceId: $workspaceId, featureFlag: $featureFlag, value: $value)
    }`,
    {
      workspaceId: currentUser.currentWorkspace.id,
      featureFlag: 'IS_ICP_ANALYSIS_ENABLED',
      value,
    },
  );
};

// Ten won deals at US companies and ten lost deals at Canadian ones give the
// analysis a pattern clear enough to suggest weights from.
const createDeals = async (page: Page) => {
  const closeDate = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const companies = [
    ...Array.from({ length: DEALS_PER_COUNTRY }, (_, index) => ({
      name: `E2E ICP US ${index}`,
      address: { addressCountry: 'United States' },
    })),
    ...Array.from({ length: DEALS_PER_COUNTRY }, (_, index) => ({
      name: `E2E ICP Canada ${index}`,
      address: { addressCountry: 'Canada' },
    })),
  ];

  const { createCompanies } = await callBackend(
    page,
    backendGraphQLUrl,
    `mutation CreateCompanies($data: [CompanyCreateInput!]!) { createCompanies(data: $data) { id name } }`,
    { data: companies },
  );

  const { createOpportunities } = await callBackend(
    page,
    backendGraphQLUrl,
    `mutation CreateOpportunities($data: [OpportunityCreateInput!]!) { createOpportunities(data: $data) { id } }`,
    {
      data: createCompanies.map((company: { id: string; name: string }) => ({
        name: `${company.name} deal`,
        companyId: company.id,
        stage: company.name.includes('Canada') ? 'LOST' : 'CUSTOMER',
        closeDate,
      })),
    },
  );

  return {
    companies: createCompanies as { id: string; name: string }[],
    opportunityIds: createOpportunities.map(({ id }: { id: string }) => id),
  };
};

const destroyByIds = async (
  page: Page,
  objectPlural: string,
  ids: string[],
) => {
  if (ids.length === 0) {
    return;
  }

  await callBackend(
    page,
    backendGraphQLUrl,
    `mutation Destroy($ids: [UUID!]!) { destroy${objectPlural}(filter: { id: { in: $ids } }) { id } }`,
    { ids },
  );
};

const findModelId = async (page: Page): Promise<string | undefined> => {
  const { icpModels } = await callBackend(
    page,
    backendGraphQLUrl,
    `query FindIcpModels($filter: IcpModelFilterInput) { icpModels(filter: $filter) { edges { node { id } } } }`,
    { filter: { name: { eq: MODEL_NAME } } },
  );

  return icpModels.edges[0]?.node.id;
};

const findCompanyTier = async (page: Page, companyId: string) => {
  const { company } = await callBackend(
    page,
    backendGraphQLUrl,
    `query Company($filter: CompanyFilterInput) { company(filter: $filter) { icpTier } }`,
    { filter: { id: { eq: companyId } } },
  );

  return company?.icpTier ?? null;
};

test('Build, activate and see an ICP score on a company', async ({ page }) => {
  test.setTimeout(240_000);

  await setIcpAnalysisFlag(page, true);
  const { companies, opportunityIds } = await createDeals(page);
  const unitedStatesCompany = companies.find(({ name }) =>
    name.startsWith('E2E ICP US'),
  );
  let modelId: string | undefined;

  try {
    await test.step('Create a model', async () => {
      await page.goto('/objects/icpModels');
      await page.getByRole('button', { name: 'Create new ICP Model' }).click();
      await page.keyboard.type(MODEL_NAME);
      await page.keyboard.press('Enter');

      await expect.poll(() => findModelId(page)).toBeDefined();
      modelId = await findModelId(page);
      await page.goto(`/object/icpModel/${modelId}`);
    });

    await test.step('Run the analysis', async () => {
      await page.getByRole('button', { name: 'Run analysis' }).click();
      await expect(page.getByText('Won deals')).toBeVisible({
        timeout: 30_000,
      });
    });

    await test.step('Suggest weights and save them', async () => {
      await page.getByRole('tab', { name: 'Model' }).click();
      await page.getByRole('button', { name: 'Suggest weights' }).click();
      await expect(
        page.getByText('Address country: United States').first(),
      ).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(
        page.getByRole('button', { name: 'Save' }),
      ).not.toBeVisible();
    });

    await test.step('Activate the model', async () => {
      await page.getByRole('button', { name: 'Activate' }).click();
      await page.getByRole('button', { name: 'Activate' }).last().click();
      await expect(
        page.getByText('Active', { exact: true }).first(),
      ).toBeVisible({ timeout: 30_000 });
    });

    await test.step('See the score on a US company', async () => {
      if (unitedStatesCompany === undefined) {
        throw new Error('The US company was not created');
      }

      await expect
        .poll(() => findCompanyTier(page, unitedStatesCompany.id), {
          timeout: 120_000,
          intervals: [2_000],
        })
        .toBe('PRIORITY');

      await page.goto(`/object/company/${unitedStatesCompany.id}`);
      const fieldsWidget = page.getByTestId('record-fields-widget');

      await expect(fieldsWidget.getByText('ICP fit')).toBeVisible();
      await expect(fieldsWidget.getByText('Priority')).toBeVisible();
    });
  } finally {
    await destroyByIds(page, 'Opportunities', opportunityIds);
    await destroyByIds(
      page,
      'Companies',
      companies.map(({ id }) => id),
    );
    await destroyByIds(page, 'IcpModels', modelId ? [modelId] : []);
    await setIcpAnalysisFlag(page, false);
  }
});
