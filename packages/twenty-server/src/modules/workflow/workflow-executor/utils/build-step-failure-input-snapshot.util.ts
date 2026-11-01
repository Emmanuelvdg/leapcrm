import { evalFromContext, isDefined, resolveInput } from 'twenty-shared/utils';
import { type WorkflowRunStepErrorDetails } from 'twenty-shared/workflow';

import { redactSensitiveKeysDeep } from 'src/modules/workflow/workflow-executor/utils/redact-sensitive-keys-deep.util';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { truncateStringToUtf8ByteBudget } from 'src/utils/truncate-string-to-utf8-byte-budget.util';

const MAX_RESOLVED_INPUT_BYTES = 16_000;

const VARIABLE_PATTERN = /\{\{[^{}]+\}\}/g;

type StepFailureInputSnapshot = Pick<
  WorkflowRunStepErrorDetails,
  'resolvedInput' | 'resolvedInputTruncated' | 'emptyVariables'
>;

const collectVariables = (value: unknown, variables: Set<string>) => {
  if (typeof value === 'string') {
    for (const [variable] of value.matchAll(VARIABLE_PATTERN)) {
      variables.add(variable);
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectVariables(item, variables));

    return;
  }

  if (isDefined(value) && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      collectVariables(key, variables);
      collectVariables(nested, variables);
    }
  }
};

const isEmptyValue = (value: unknown) => !isDefined(value) || value === '';

export const buildStepFailureInputSnapshot = ({
  step,
  context,
}: {
  step: WorkflowAction;
  context: Record<string, unknown>;
}): StepFailureInputSnapshot => {
  const unresolvedInput =
    'input' in step.settings ? step.settings.input : undefined;

  if (!isDefined(unresolvedInput)) {
    return {};
  }

  // The snapshot is diagnostic only and must never mask the step's own failure
  try {
    const variables = new Set<string>();

    collectVariables(unresolvedInput, variables);

    const emptyVariables = [...variables].filter((variable) =>
      isEmptyValue(evalFromContext(variable, context)),
    );

    // resolveInput rewrites arrays in place, and the step definition must stay untouched
    const resolvedInput = redactSensitiveKeysDeep(
      resolveInput(structuredClone(unresolvedInput), context),
    );

    const { value: truncatedResolvedInput, truncated } =
      truncateStringToUtf8ByteBudget(
        JSON.stringify(resolvedInput) ?? '',
        MAX_RESOLVED_INPUT_BYTES,
      );

    return {
      resolvedInput: truncated ? truncatedResolvedInput : resolvedInput,
      ...(truncated ? { resolvedInputTruncated: true } : {}),
      ...(emptyVariables.length > 0 ? { emptyVariables } : {}),
    };
  } catch {
    return {};
  }
};
