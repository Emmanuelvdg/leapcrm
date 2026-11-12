import {
  buildConnectionToolId,
  buildConnectionToolName,
  parseConnectionToolId,
} from 'src/engine/core-modules/tool-provider/utils/connection-tool-name.util';

const CONNECTION_ID = '3f2b9c1e-1111-2222-3333-444455556666';

describe('buildConnectionToolName', () => {
  it('joins the sanitized connection and tool names with an id suffix', () => {
    expect(
      buildConnectionToolName({
        connectionId: CONNECTION_ID,
        connectionName: 'GetLeads',
        toolName: 'search_contacts_count',
      }),
    ).toBe('getleads_search_contacts_count_3f2b9c1e');
  });

  it('keeps names within 64 characters', () => {
    const name = buildConnectionToolName({
      connectionId: CONNECTION_ID,
      connectionName: 'A very long connection name for a lead data provider',
      toolName: 'search_contacts_by_company_size_and_country_and_industry',
    });

    expect(name.length).toBeLessThanOrEqual(64);
    expect(name.endsWith('_3f2b9c1e')).toBe(true);
  });
});

describe('connection tool ids', () => {
  it('round-trips the connection id and tool name', () => {
    const toolId = buildConnectionToolId(CONNECTION_ID, 'search::count');

    expect(parseConnectionToolId(toolId)).toEqual({
      connectionId: CONNECTION_ID,
      toolName: 'search::count',
    });
  });

  it('returns null for a malformed id', () => {
    expect(parseConnectionToolId('no-separator')).toBeNull();
  });
});
