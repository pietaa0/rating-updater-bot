import type {
  AutocompleteInteraction,
  CacheType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";

type GuildInputCommandInteraction<Cached extends CacheType = CacheType> = Omit<
  ChatInputCommandInteraction<Cached>,
  "guildId"
> & {
  guildId: string;
};

type GuildAutocompleteInteraction<Cached extends CacheType = CacheType> = Omit<
  AutocompleteInteraction<Cached>,
  "guildId"
> & {
  guildId: string;
};

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandBuilder;
  execute: (interaction: GuildInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: GuildAutocompleteInteraction) => Promise<void>;
}
