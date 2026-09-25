import { Injectable, Logger } from '@nestjs/common';

import { type ModelMessage, pruneMessages } from 'ai';

const COMPACTION_THRESHOLD_RATIO = 0.9;
const TOOL_CALLS_PRESERVE_LAST_N_MESSAGES = 2;
// Same chars/4 heuristic as estimateToolOutputTokens - cheap and good enough
// to catch a still-oversized payload after pruning, not meant to match the
// provider's own tokenizer exactly.
const CHARS_PER_TOKEN = 4;

export type PruningResult = {
  messages: ModelMessage[];
  wasPruned: boolean;
  isStillOverLimit: boolean;
};

const estimateMessagesTokens = (messages: ModelMessage[]): number => {
  try {
    return Math.ceil(JSON.stringify(messages).length / CHARS_PER_TOKEN);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

@Injectable()
export class MessagePruningService {
  private readonly logger = new Logger(MessagePruningService.name);

  pruneIfOverContextWindowLimit(
    messages: ModelMessage[],
    contextWindowTokens: number,
    conversationSizeTokens: number,
  ): PruningResult {
    const threshold = contextWindowTokens * COMPACTION_THRESHOLD_RATIO;

    if (conversationSizeTokens < threshold) {
      return { messages, wasPruned: false, isStillOverLimit: false };
    }

    this.logger.log(
      `Conversation size ${conversationSizeTokens} exceeds threshold ${Math.round(threshold)} (${contextWindowTokens} * ${COMPACTION_THRESHOLD_RATIO}). Pruning messages.`,
    );

    const prunedMessages = pruneMessages({
      messages,
      reasoning: 'before-last-message',
      toolCalls: `before-last-${TOOL_CALLS_PRESERVE_LAST_N_MESSAGES}-messages`,
      emptyMessages: 'remove',
    });

    const wasPruned = prunedMessages.length < messages.length;

    if (wasPruned) {
      this.logger.log(
        `Pruned ${messages.length - prunedMessages.length} messages (${messages.length} → ${prunedMessages.length})`,
      );
    }

    // Removing messages doesn't guarantee the result fits - a handful of
    // large tool-call outputs (e.g. a full workflow definition) can still
    // exceed the context window on their own, so re-measure the pruned set
    // against the model's actual limit rather than assuming success just
    // because something was removed.
    const isStillOverLimit =
      estimateMessagesTokens(prunedMessages) >= contextWindowTokens;

    return { messages: prunedMessages, wasPruned, isStillOverLimit };
  }
}
