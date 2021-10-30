import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command, CommandOptions } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { createInfoEmbed } from '../../lib/utils/createInfoEmbed';
import { removeFilter } from '../../lib/utils/filters';

@ApplyOptions<CommandOptions>({
	description: 'Removes a filter',
	preconditions: ['AdminOnly'],
})
export default class extends Command {
	public async messageRun(message: Message, args: Args) {
		const filter = await args.rest('string');

		const result = await removeFilter(filter);

		return message.channel.send({
			embeds: [
				result
					? createInfoEmbed(this.container.client, `The filter with pattern \`${filter}\` was removed`)
					: createInfoEmbed(this.container.client, `A filter with pattern \`${filter}\` didn't exist`).setColor(
							'YELLOW',
					  ),
			],
		});
	}
}
