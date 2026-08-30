import { DiscordjsError, DiscordjsErrorCodes } from "discord.js";
import { vi } from "vitest";
import type { MockInteraction } from "./mock-interaction.js";

export function makeMockButtonConfirmation(customId: string) {
  return {
    customId,
    isButton: () => true,
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

export function resolveCollectorWith(interaction: MockInteraction, confirmation: unknown) {
  interaction.collectorHandle.awaitMessageComponent.mockResolvedValue(confirmation);
}

function makeCollectorTimeoutError() {
  const err = new Error("Collector received no interactions before ending with reason: time");
  Object.setPrototypeOf(err, DiscordjsError.prototype);
  return Object.assign(err, { code: DiscordjsErrorCodes.InteractionCollectorError });
}

export function rejectCollectorWithTimeout(interaction: MockInteraction) {
  interaction.collectorHandle.awaitMessageComponent.mockRejectedValue(makeCollectorTimeoutError());
}
