import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command, CommandOptions } from '@sapphire/framework';
import type { Message, TextBasedChannels } from 'discord.js';
// import { createInfoEmbed } from '../../lib/utils/createInfoEmbed';

@ApplyOptions<CommandOptions>({
	description: 'Creates a report from a message url',
	preconditions: ['AdminOnly'],
})
export default class extends Command {
	public async messageRun(_message: Message, args: Args) {
		const url = await args.rest('url');
		const [_, _channels, _guildId, channelId, startMessageId] = url.pathname.split('/');

		const channel = this.container.client.channels.cache.get(channelId) as TextBasedChannels;

		const fetchedMessages: Message[] = [];
		let lastId = String(BigInt(startMessageId) - 1n);

		while (true) {
			const messages = await channel.messages.fetch({ limit: 100, after: lastId });

			const arraified = [...messages.values()];
			lastId = arraified.at(0)!.id;

			fetchedMessages.push(...arraified);

			// We fetched all messages
			if (arraified.length < 100) break;
		}

		const ids = fetchedMessages.map((m) => m.id);
		const sorted = [...ids].sort((a, b) => Number(BigInt(b) - BigInt(a)));
		console.log(ids);
		console.log(sorted);
	}
}
