import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptions } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { chunk } from '@sapphire/utilities';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import { createInfoEmbed } from '../../lib/utils/createInfoEmbed';
import { filters } from '../../lib/utils/filters';

@ApplyOptions<CommandOptions>({
	description: 'Lists all filters',
	preconditions: ['AdminOnly'],
})
export default class extends Command {
	public async messageRun(message: Message) {
		const paginated = new PaginatedMessage({ template: createInfoEmbed(this.container.client, '') });

		const [bannables, alertables] = filters.partition((value) => value.shouldBan);

		const bannableChunks = chunk(
			bannables.map((item) => `\`${item.regexp.source}\``),
			10,
		);

		const alertableChunks = chunk(
			alertables.map((item) => `\`${item.regexp.source}\``),
			10,
		);

		for (const banChunk of bannableChunks) {
			paginated.addPageEmbed((embed) =>
				embed.setTitle('Filters that will ban on match').setDescription(`- ${banChunk.join('\n- ')}`),
			);
		}

		for (const alertChunk of alertableChunks) {
			paginated.addPageEmbed((embed) =>
				embed
					.setTitle('Filters that will alert if matched')
					.setDescription(`- ${alertChunk.join('\n- ')}`)
					.addField(
						'\u200b',
						"These filters will only send an alert message if any part of the pattern is present in the user's name",
					),
			);
		}

		await paginated.run(message);
	}
}
