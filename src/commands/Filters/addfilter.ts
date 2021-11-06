import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command, CommandOptions } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { createInfoEmbed } from '../../lib/utils/createInfoEmbed';
import { addFilter } from '../../lib/utils/filters';

const onlyUsersWhoCanAddFullRegexes = [
	// Vladdy#0002
	'139836912335716352',
	// Trophias#0001
	'85185381837836288',
];

@ApplyOptions<CommandOptions>({
	description: 'Adds a filter',
	preconditions: ['AdminOnly'],
})
export default class extends Command {
	public async messageRun(message: Message, args: Args) {
		const filter = await args.rest('string');

		const finalPattern = onlyUsersWhoCanAddFullRegexes.includes(message.author.id)
			? filter
			: filter.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');

		const result = await addFilter(finalPattern);

		return message.channel.send({
			embeds: [
				result
					? createInfoEmbed(this.container.client, `Added filter with pattern \`${finalPattern}\``)
					: createInfoEmbed(this.container.client, `A filter with pattern \`${finalPattern}\` already exists`).setColor(
							'YELLOW',
					  ),
			],
		});
	}
}
