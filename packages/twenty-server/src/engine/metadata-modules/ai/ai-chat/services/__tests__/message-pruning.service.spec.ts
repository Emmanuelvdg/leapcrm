import { type ModelMessage } from 'ai';

import { MessagePruningService } from 'src/engine/metadata-modules/ai/ai-chat/services/message-pruning.service';

const buildTextMessage = (
  role: ModelMessage['role'],
  text: string,
): ModelMessage => ({ role, content: text }) as ModelMessage;

describe('MessagePruningService', () => {
  let service: MessagePruningService;

  beforeEach(() => {
    service = new MessagePruningService();
  });

  it('leaves messages untouched when under the compaction threshold', () => {
    const messages = [buildTextMessage('user', 'hello')];

    const result = service.pruneIfOverContextWindowLimit(messages, 1000, 10);

    expect(result).toEqual({
      messages,
      wasPruned: false,
      isStillOverLimit: false,
    });
  });

  // pruneMessages only prunes reasoning/tool-call/tool-result content, not
  // plain text - a tool-call/tool-result pair outside the preserved last-2
  // window is what actually gets removed (and, once empty, dropped).
  const buildToolCallExchange = (resultChars: number): ModelMessage[] => [
    {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: 'call_1',
          toolName: 'create_workflow',
          input: {},
        },
      ],
    } as ModelMessage,
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'call_1',
          toolName: 'create_workflow',
          output: { type: 'text', value: 'x'.repeat(resultChars) },
        },
      ],
    } as ModelMessage,
  ];

  it('prunes and reports under the limit once the pruned set actually fits', () => {
    // The large content lives entirely in the tool-call/tool-result pair,
    // which sits before the preserved last-2-messages window and gets
    // pruned away; what remains is small plain text that fits comfortably.
    const messages = [
      buildTextMessage('user', 'build a workflow'),
      ...buildToolCallExchange(2000),
      buildTextMessage('assistant', 'workflow created'),
      buildTextMessage('user', 'thanks'),
    ];

    const result = service.pruneIfOverContextWindowLimit(messages, 100, 95);

    expect(result.wasPruned).toBe(true);
    expect(result.isStillOverLimit).toBe(false);
    expect(result.messages.length).toBeLessThan(messages.length);
  });

  it('still reports over the limit when pruning removes messages but the remainder is still too large', () => {
    // The tool-call/tool-result pair still gets pruned (wasPruned: true),
    // but the preserved last message is itself huge - the bug this guards
    // against previously reported isStillOverLimit: false here just because
    // something was removed, without re-checking what was left.
    const messages = [
      buildTextMessage('user', 'build a workflow'),
      ...buildToolCallExchange(40),
      buildTextMessage('assistant', 'ok'),
      buildTextMessage('user', 'b'.repeat(5000)),
    ];

    const result = service.pruneIfOverContextWindowLimit(messages, 100, 95);

    expect(result.wasPruned).toBe(true);
    expect(result.isStillOverLimit).toBe(true);
  });

  it('reports over the limit when nothing can be pruned and the set is still oversized', () => {
    const messages = [buildTextMessage('user', 'a'.repeat(5000))];

    const result = service.pruneIfOverContextWindowLimit(messages, 100, 95);

    expect(result.wasPruned).toBe(false);
    expect(result.isStillOverLimit).toBe(true);
  });
});
