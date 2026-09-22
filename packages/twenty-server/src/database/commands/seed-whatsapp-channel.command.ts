import { Logger } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { Command, CommandRunner, Option } from 'nest-commander';

import { WhatsappChannelService } from 'src/engine/metadata-modules/whatsapp-channel/services/whatsapp-channel.service';

type SeedWhatsappChannelCommandOptions = {
  workspaceId: string;
};

// One-off bootstrap command: seeds a single WhatsappChannel row from the
// WHATSAPP_* env vars already verified working via curl against the Graph
// API. Goes through WhatsappChannelService (not raw SQL) so accessToken is
// written through the same encryption path the app uses when reading it back.
@Command({
  name: 'whatsapp:seed-channel',
  description:
    'Seed a WhatsappChannel row for a workspace from WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_BUSINESS_ACCOUNT_ID / WHATSAPP_ACCESS_TOKEN / WHATSAPP_TEST_PHONE_NUMBER env vars.',
})
export class SeedWhatsappChannelCommand extends CommandRunner {
  private readonly logger = new Logger(SeedWhatsappChannelCommand.name);

  constructor(private readonly whatsappChannelService: WhatsappChannelService) {
    super();
  }

  @Option({
    flags: '-w, --workspace-id <workspaceId>',
    description: 'Workspace ID to attach the WhatsappChannel to (required)',
    required: true,
  })
  parseWorkspaceId(value: string): string {
    return value;
  }

  async run(
    _passedParams: string[],
    options: SeedWhatsappChannelCommandOptions,
  ): Promise<void> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const displayPhoneNumber = process.env.WHATSAPP_TEST_PHONE_NUMBER ?? null;

    if (
      !isNonEmptyString(phoneNumberId) ||
      !isNonEmptyString(wabaId) ||
      !isNonEmptyString(accessToken)
    ) {
      this.logger.error(
        'WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID and WHATSAPP_ACCESS_TOKEN must all be set in the environment.',
      );

      return;
    }

    const existingChannel =
      await this.whatsappChannelService.findByPhoneNumberId(phoneNumberId);

    if (existingChannel) {
      this.logger.warn(
        `A WhatsappChannel already exists for phoneNumberId ${phoneNumberId} (id ${existingChannel.id}), workspace ${existingChannel.workspaceId}. Skipping.`,
      );

      return;
    }

    const whatsappChannel = await this.whatsappChannelService.create({
      workspaceId: options.workspaceId,
      phoneNumberId,
      wabaId,
      displayPhoneNumber,
      accessToken,
    });

    this.logger.log(
      `Created WhatsappChannel ${whatsappChannel.id} for workspace ${options.workspaceId} (phoneNumberId ${phoneNumberId}).`,
    );
  }
}
