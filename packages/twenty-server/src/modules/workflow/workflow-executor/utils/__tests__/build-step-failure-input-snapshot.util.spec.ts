import { buildStepFailureInputSnapshot } from 'src/modules/workflow/workflow-executor/utils/build-step-failure-input-snapshot.util';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

const buildStep = (input: object) =>
  ({
    id: 'update-company',
    name: 'Update company',
    type: 'UPDATE_RECORD',
    valid: true,
    settings: {
      input,
      outputSchema: {},
      errorHandlingOptions: {
        retryOnFailure: { value: false },
        continueOnFailure: { value: false },
      },
    },
  }) as unknown as WorkflowAction;

const context = {
  trigger: {
    object: {
      name: 'Acme',
      parentCompanyId: null,
      description: '',
    },
  },
};

describe('buildStepFailureInputSnapshot', () => {
  it('returns the resolved input and lists variables that resolved to empty', () => {
    const snapshot = buildStepFailureInputSnapshot({
      step: buildStep({
        objectName: 'company',
        objectRecord: {
          name: '{{trigger.object.name}}',
          parentCompanyId: '{{trigger.object.parentCompanyId}}',
          description: '{{trigger.object.description}}',
          domain: '{{trigger.object.domain}}',
        },
      }),
      context,
    });

    expect(snapshot.resolvedInput).toMatchObject({
      objectName: 'company',
      objectRecord: { name: 'Acme' },
    });
    expect(snapshot.emptyVariables).toEqual([
      '{{trigger.object.parentCompanyId}}',
      '{{trigger.object.description}}',
      '{{trigger.object.domain}}',
    ]);
    expect(snapshot.resolvedInputTruncated).toBeUndefined();
  });

  it('redacts sensitive keys', () => {
    const snapshot = buildStepFailureInputSnapshot({
      step: buildStep({
        url: 'https://example.com',
        headers: { Authorization: 'Bearer {{trigger.object.name}}' },
        body: { apiKey: 'secret-value', name: '{{trigger.object.name}}' },
      }),
      context,
    });

    expect(snapshot.resolvedInput).toEqual({
      url: 'https://example.com',
      headers: { Authorization: '[redacted]' },
      body: { apiKey: '[redacted]', name: 'Acme' },
    });
  });

  it('truncates large inputs', () => {
    const snapshot = buildStepFailureInputSnapshot({
      step: buildStep({ body: 'x'.repeat(20_000) }),
      context,
    });

    expect(snapshot.resolvedInputTruncated).toBe(true);
    expect(typeof snapshot.resolvedInput).toBe('string');
    expect((snapshot.resolvedInput as string).endsWith('…[truncated]')).toBe(
      true,
    );
  });

  it('leaves the step definition untouched', () => {
    const step = buildStep({ names: ['{{trigger.object.name}}'] });

    buildStepFailureInputSnapshot({ step, context });

    expect(step.settings).toMatchObject({
      input: { names: ['{{trigger.object.name}}'] },
    });
  });

  it('returns nothing when the step has no input', () => {
    const step = {
      ...buildStep({}),
      settings: { outputSchema: {} },
    } as unknown as WorkflowAction;

    expect(buildStepFailureInputSnapshot({ step, context })).toEqual({});
  });
});
