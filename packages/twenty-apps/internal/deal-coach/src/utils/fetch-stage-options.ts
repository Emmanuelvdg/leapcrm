import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { type StageOption } from 'src/utils/deal-context.type';

const MAX_OBJECTS = 1_000;
const MAX_OPPORTUNITY_FIELDS = 500;

const toStageOptions = (options: unknown): StageOption[] =>
  Array.isArray(options)
    ? options
        .filter(
          (option): option is { value: string; label?: unknown } =>
            typeof option === 'object' &&
            option !== null &&
            typeof (option as { value?: unknown }).value === 'string',
        )
        .map((option) => ({
          value: option.value,
          label: typeof option.label === 'string' ? option.label : option.value,
        }))
    : [];

// Stages are workspace-specific select options, so the agent is given the
// real list instead of guessing values the stage field would reject.
export const fetchStageOptions = async (): Promise<StageOption[]> => {
  try {
    const metadataClient = new MetadataApiClient();

    const { objects } = await metadataClient.query({
      objects: {
        __args: { paging: { first: MAX_OBJECTS }, filter: {} },
        edges: { node: { id: true, nameSingular: true } },
      },
    });

    const opportunityObjectId = (
      (objects?.edges ?? []) as {
        node: { id: string; nameSingular: string };
      }[]
    ).find((edge) => edge.node.nameSingular === 'opportunity')?.node.id;

    if (!opportunityObjectId) {
      return [];
    }

    const { fields } = await metadataClient.query({
      fields: {
        __args: {
          paging: { first: MAX_OPPORTUNITY_FIELDS },
          filter: { objectMetadataId: { eq: opportunityObjectId } },
        },
        edges: { node: { name: true, options: true } },
      },
    });

    const stageField = (
      (fields?.edges ?? []) as { node: { name: string; options: unknown } }[]
    ).find((edge) => edge.node.name === 'stage');

    return toStageOptions(stageField?.node.options);
  } catch (error) {
    console.warn(
      `Deal coach could not read the stage options: ${error instanceof Error ? error.message : String(error)}`,
    );

    return [];
  }
};
