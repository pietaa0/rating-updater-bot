import { vi } from "vitest";
import type { GuildInputCommandInteraction } from "../types.js";

interface MockInteractionOptions {
  guildId?: string;
  userId?: string;
  strings?: Record<string, string>;
  focused?: { name: string; value: string };
}
export function makeMockInteraction(options: MockInteractionOptions = {}) {
  const { guildId = "guild-1", userId = "user-1", strings = {} } = options;
  const collectorHandle = {
    awaitMessageComponent: vi.fn(),
  };
  const interaction = {
    guildId,
    user: { id: userId },

    collectorHandle,

    options: {
      getString: vi.fn((name: string, required?: boolean) => {
        const value = strings[name];
        if (required && value === undefined) {
          throw new Error(`mock getString: required option ${name} missing`);
        }
        return value ?? null;
      }),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    respond: vi.fn().mockResolvedValue(undefined),

    deferReply: vi.fn(),
  };

  interaction.deferReply.mockImplementation(async (deferOpts?: { withResponse?: boolean }) => {
    if (deferOpts?.withResponse) {
      return {
        resource: {
          message: {
            awaitMessageComponent: collectorHandle.awaitMessageComponent,
          },
        },
      };
    }
    return undefined;
  });
  return interaction as unknown as GuildInputCommandInteraction & {
    collectorHandle: typeof collectorHandle;
    reply: typeof interaction.reply;
    editReply: typeof interaction.editReply;
    respond: typeof interaction.respond;
    options: typeof interaction.options;
  };
}

export type MockInteraction = ReturnType<typeof makeMockInteraction>;
