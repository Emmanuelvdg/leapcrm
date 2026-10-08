import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WhatsappEmbeddedSignupService } from 'src/engine/metadata-modules/whatsapp-channel/services/whatsapp-embedded-signup.service';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const buildService = () =>
  new WhatsappEmbeddedSignupService({
    get: (key: string) =>
      ({ WHATSAPP_APP_ID: 'app-id', WHATSAPP_APP_SECRET: 'app-secret' })[key],
  } as unknown as TwentyConfigService);

const getRequestedUrls = (fetchSpy: jest.SpyInstance) =>
  fetchSpy.mock.calls.map(([url]) => String(url));

describe('WhatsappEmbeddedSignupService', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('subscribes the app to the WABA and registers a new phone number', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ access_token: 'business-token' }))
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(
        jsonResponse({
          display_phone_number: '+61 400 000 000',
          platform_type: 'NOT_APPLICABLE',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ success: true }));

    const result = await buildService().completeEmbeddedSignup({
      code: 'signup-code',
      phoneNumberId: 'phone-1',
      wabaId: 'waba-1',
    });

    expect(result).toEqual({
      accessToken: 'business-token',
      displayPhoneNumber: '+61 400 000 000',
    });

    const urls = getRequestedUrls(fetchSpy);

    expect(urls[1]).toMatch(/\/waba-1\/subscribed_apps$/);
    expect(urls[3]).toMatch(/\/phone-1\/register$/);

    const registerBody = JSON.parse(fetchSpy.mock.calls[3][1].body);

    expect(registerBody.messaging_product).toBe('whatsapp');
    expect(registerBody.pin).toMatch(/^\d{6}$/);
  });

  it('does not re-register a number already on Cloud API', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ access_token: 'business-token' }))
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({ platform_type: 'CLOUD_API' }));

    await buildService().completeEmbeddedSignup({
      code: 'signup-code',
      phoneNumberId: 'phone-1',
      wabaId: 'waba-1',
    });

    expect(getRequestedUrls(fetchSpy)).toHaveLength(3);
    expect(
      getRequestedUrls(fetchSpy).some((url) => url.endsWith('/register')),
    ).toBe(false);
  });

  it('fails the connection when the webhook subscription is rejected', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ access_token: 'business-token' }))
      .mockResolvedValueOnce(
        jsonResponse({ error: { message: 'Unsupported post request' } }, 400),
      );

    await expect(
      buildService().completeEmbeddedSignup({
        code: 'signup-code',
        phoneNumberId: 'phone-1',
        wabaId: 'waba-1',
      }),
    ).rejects.toThrow(/webhook subscription failed with status 400/);
  });
});
