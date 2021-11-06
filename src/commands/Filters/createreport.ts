import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command, CommandOptions } from '@sapphire/framework';
import { Message, MessageAttachment, TextBasedChannels } from 'discord.js';

@ApplyOptions<CommandOptions>({
	description: 'Creates a report from a message url',
	preconditions: ['AdminOnly'],
})
export default class extends Command {
	public async messageRun(originalMessage: Message, args: Args) {
		const url = await args.rest('url');
		const [_, _channels, _guildId, channelId, startMessageId] = url.pathname.split('/');

		const channel = this.container.client.channels.cache.get(channelId) as TextBasedChannels;

		const fetchedMessages: Message[] = [];
		let lastId = String(BigInt(startMessageId) - 1n);

		while (true) {
			const messages = await channel.messages.fetch({ limit: 100, after: lastId });

			const arraified = [...messages.values()].sort((a, b) => Number(BigInt(a.id) - BigInt(b.id)));
			lastId = arraified.at(-1)!.id;

			fetchedMessages.push(...arraified);

			// We fetched all messages
			if (arraified.length < 100) break;
		}

		const banReport = [`BAN REPORT - ${new Date().toISOString()}`, '', 'BANNED MEMBERS'];

		const fancyReport: string[] = [];
		const bannedIds: string[] = [];

		for (const message of fetchedMessages) {
			// Skip messages that have no embeds
			if (!message.embeds.length) continue;
			// If it's not the bot message, skip
			if (message.author.id !== this.container.client.user!.id) continue;

			const [embed] = message.embeds;
			// If the embed isn't red, we don't care about it
			if (embed.color !== 0xed4245) continue;

			const maybeMatch = embed.description?.split('I have banned member ').slice(1) ?? [];
			// Try getting the content
			if (!maybeMatch.length) continue;

			// From this point on we definitely have our message
			const [userTag, userId] = maybeMatch[0]!
				// Remove )
				.slice(0, -1)
				// Split by (
				.split('(')
				.map((item) => item.trim());

			const joinedAtString = embed.fields[1]?.value ?? 'Unknown Join Date';
			fancyReport.push(`JOINED AT: ${joinedAtString}; TAG: ${userTag}; ID: ${userId}`);
			bannedIds.push(userId);
		}

		banReport.push(...fancyReport, '', 'BANNED IDS', ...bannedIds);

		await originalMessage.channel.send({
			files: [new MessageAttachment(Buffer.from(banReport.join('\n')), 'ban-report.txt')],
		});
	}
}
