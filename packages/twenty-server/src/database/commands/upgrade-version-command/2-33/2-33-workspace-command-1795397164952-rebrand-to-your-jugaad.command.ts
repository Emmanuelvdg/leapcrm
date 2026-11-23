import { Command } from 'nest-commander';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { type FlatAgent } from 'src/engine/metadata-modules/flat-agent/types/flat-agent.type';
import { type FlatSkill } from 'src/engine/metadata-modules/flat-skill/types/flat-skill.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { STANDARD_AGENT } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-agent.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const NEW_PRODUCT_NAME = 'Your Jugaad CRM';
const NEW_SYSTEM_ACTOR_NAME = 'Your Jugaad';

// Covers "LeapCRM", "Leap CRM" and a bare "Leap" seeded by earlier versions.
const PREVIOUS_BRAND_PATTERN = /\bLeap(?: ?CRM)?\b/g;

// The workspace's own company is created by the system actor, named after
// whichever brand was current when the workspace was activated.
const PREVIOUS_SYSTEM_ACTOR_NAMES = ['Leap', 'LeapCRM'];

const rebrandText = (text: string): string =>
  text.replace(PREVIOUS_BRAND_PATTERN, NEW_PRODUCT_NAME);

const rebrandNullableText = (text: string | null): string | null =>
  isDefined(text) ? rebrandText(text) : null;

@RegisteredWorkspaceCommand('2.33.0', 1795397164952)
@Command({
  name: 'upgrade:2-33:rebrand-to-your-jugaad',
  description:
    'Replace the previous product name with Your Jugaad CRM in the standard Helper agent, standard skills and the system-created workspace company of existing workspaces',
})
export class RebrandToYourJugaadCommand extends ProvisionedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    dataSource,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const { flatAgentMaps, flatSkillMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatAgentMaps',
        'flatSkillMaps',
      ]);

    const helperAgent =
      flatAgentMaps.byUniversalIdentifier[
        STANDARD_AGENT.helper.universalIdentifier
      ];

    const agentsToUpdate: FlatAgent[] = [];

    if (isDefined(helperAgent)) {
      const prompt = rebrandText(helperAgent.prompt);
      const description = rebrandNullableText(helperAgent.description);

      if (
        prompt !== helperAgent.prompt ||
        description !== helperAgent.description
      ) {
        agentsToUpdate.push({
          ...helperAgent,
          prompt,
          description,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const skillsToUpdate: FlatSkill[] = Object.values(
      flatSkillMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (skill) => skill.applicationId === twentyStandardFlatApplication.id,
      )
      .flatMap((skill) => {
        const label = rebrandText(skill.label);
        const description = rebrandNullableText(skill.description);
        const content = rebrandText(skill.content);

        if (
          label === skill.label &&
          description === skill.description &&
          content === skill.content
        ) {
          return [];
        }

        return [
          {
            ...skill,
            label,
            description,
            content,
            updatedAt: new Date().toISOString(),
          },
        ];
      });

    this.logger.log(
      `${isDryRun ? '[DRY RUN] Would rebrand' : 'Rebranding'} ${agentsToUpdate.length} agent(s) and ${skillsToUpdate.length} skill(s) for workspace ${workspaceId}`,
    );

    if (isDryRun) {
      return;
    }

    if (agentsToUpdate.length > 0 || skillsToUpdate.length > 0) {
      const validateAndBuildResult =
        await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunLegacyWorkspaceMigration(
          {
            allFlatEntityOperationByMetadataName: {
              agent: {
                flatEntityToCreate: [],
                flatEntityToDelete: [],
                flatEntityToUpdate: agentsToUpdate,
              },
              skill: {
                flatEntityToCreate: [],
                flatEntityToDelete: [],
                flatEntityToUpdate: skillsToUpdate,
              },
            },
            workspaceId,
            applicationUniversalIdentifier:
              twentyStandardFlatApplication.universalIdentifier,
          },
        );

      if (validateAndBuildResult.status === 'fail') {
        this.logger.error(
          `Failed to rebrand the standard agent and skills:\n${JSON.stringify(validateAndBuildResult, null, 2)}`,
        );

        throw new Error(
          `Failed to rebrand the standard agent and skills for workspace ${workspaceId}`,
        );
      }
    }

    if (!isDefined(dataSource)) {
      this.logger.log(
        `No data source for workspace ${workspaceId}, skipping the company creator rename`,
      );

      return;
    }

    const schemaName = getWorkspaceSchemaName(workspaceId);

    const result = await dataSource.query(
      `UPDATE "${schemaName}"."company"
       SET "createdByName" = $1
       WHERE "createdBySource" = 'SYSTEM'
         AND "createdByName" = ANY($2)`,
      [NEW_SYSTEM_ACTOR_NAME, PREVIOUS_SYSTEM_ACTOR_NAMES],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    this.logger.log(
      `Renamed the system creator on ${result?.[1] ?? 0} company record(s) in workspace ${workspaceId}`,
    );
  }
}
