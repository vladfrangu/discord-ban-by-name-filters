import { ApplyOptions } from '@sapphire/decorators';
import { fetch, FetchResultTypes } from '@sapphire/fetch';
import { Args, Command, CommandOptions } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { loadedAvatars, returnAllCheckedAvatarResults } from '../../lib/utils/avatarProcessing';
import { createInfoEmbed } from '../../lib/utils/createInfoEmbed';

@ApplyOptions<CommandOptions>({
	description: 'Processes all members that match the current filters',
	preconditions: ['AdminOnly'],
})
export default class extends Command {
	public async messageRun(message: Message, args: Args) {
		if (!loadedAvatars.size) {
			return message.channel.send({
				embeds: [createInfoEmbed(this.container.client, 'There are no registered avatars to check.')],
			});
		}

		const user = await args.pick('user');

		if (!user.avatar) {
			return message.channel.send({
				embeds: [createInfoEmbed(this.container.client, 'User has no avatar')],
			});
		}

		await message.channel.sendTyping();

		// Fetch the user's avatar
		const buffer = await fetch(
			user.avatarURL({ format: 'png', size: 128 })!,
			{
				headers: {
					'User-Agent': 'Ban Members by Name / Avatar (https://github.com/vladfrangu/discord-ban-by-name-filters);',
				},
			},
			FetchResultTypes.Buffer,
		);

		const results = await returnAllCheckedAvatarResults(buffer);

		const finalText = results
			.map((entry) => `├── Matched avatar: **${entry.avatarName}**\n└── Match %: **${entry.matchPercentage}**`)
			.join('\n\n');

		return message.channel.send({
			embeds: [
				createInfoEmbed(this.container.client, finalText)
					.setTitle(`Avatar report for ${user.tag}`)
					.setThumbnail(user.displayAvatarURL()),
			],
		});
	}
}
