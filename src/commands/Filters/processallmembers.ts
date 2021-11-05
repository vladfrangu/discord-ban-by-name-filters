import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptions } from '@sapphire/framework';
import { Constants, GuildMember, Message, MessageAttachment } from 'discord.js';
import { chunk } from '@sapphire/utilities';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import { createInfoEmbed } from '../../lib/utils/createInfoEmbed';
import { filters } from '../../lib/utils/filters';

@ApplyOptions<CommandOptions>({
	description: 'Processes all members that match the current filters',
	preconditions: ['AdminOnly'],
})
export default class extends Command {
	public async messageRun(message: Message) {
		await message.channel.sendTyping();
		const members = await message.guild!.members.fetch();

		const paginated = new PaginatedMessage({ template: createInfoEmbed(this.container.client, '') }).setActions([
			{
				customId: '@sapphire/paginated-messages.firstPage',
				style: 'PRIMARY',
				emoji: '⏪',
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler }) => (handler.index = 0),
			},
			{
				customId: '@sapphire/paginated-messages.previousPage',
				style: 'PRIMARY',
				emoji: '◀️',
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler }) => {
					if (handler.index === 0) {
						handler.index = handler.pages.length - 1;
					} else {
						--handler.index;
					}
				},
			},
			{
				customId: '@sapphire/paginated-messages.nextPage',
				style: 'PRIMARY',
				emoji: '▶️',
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler }) => {
					if (handler.index === handler.pages.length - 1) {
						handler.index = 0;
					} else {
						++handler.index;
					}
				},
			},
			{
				customId: '@sapphire/paginated-messages.goToLastPage',
				style: 'PRIMARY',
				emoji: '⏩',
				type: Constants.MessageComponentTypes.BUTTON,
				run: ({ handler }) => (handler.index = handler.pages.length - 1),
			},
			{
				customId: '@sapphire/paginated-messages.stop',
				style: 'DANGER',
				emoji: '⏹️',
				label: 'Cancel',
				type: Constants.MessageComponentTypes.BUTTON,
				run: async ({ collector, response }) => {
					collector.stop();
					await response.edit({ components: [] });
				},
			},
			{
				customId: 'banMembers',
				type: Constants.MessageComponentTypes.BUTTON,
				emoji: '🔨',
				label: 'Ban Members',
				style: 'SUCCESS',
				run: async ({ collector, response }) => {
					collector.stop();
					await response.edit({ components: [] });

					const bannedMembers = [];
					const ids = [];
					const failedToBan = [];

					for (const [member, regexp] of toBan) {
						try {
							bannedMembers.push(
								`JOINED AT: ${member.joinedAt!.toISOString()}; TAG: ${member.user.tag}; ID: ${member.user.id}`,
							);
							ids.push(member.user.id);
							await member.ban({ reason: `Name filter matched: ${regexp.source}` });
						} catch (err) {
							this.container.logger.warn('Failed to ban member', err);
							bannedMembers.pop();
							ids.pop();
							failedToBan.push(
								`FAILED TO BAN: ${member.user.tag}; ID: ${member.user.id}; ERROR: ${(err as Error).message}`,
							);
						}
					}

					await response.edit({
						embeds: [response.embeds[0].setDescription('All users have been banned').setTitle('')],
					});

					const finalText = [
						`BAN REPORT - ${new Date().toISOString()}`,
						'',
						'BANNED MEMBERS',
						...bannedMembers,
						'',
						'BANNED IDs',
						...ids,
						'',
						'FAILED TO BAN',
						...failedToBan,
					].join('\n');

					await response.channel.send({
						files: [new MessageAttachment(Buffer.from(finalText), 'ban-report.txt')],
					});
				},
			},
		]);

		const [bannables] = filters.partition((value) => value.shouldBan);

		const toBan: [GuildMember, RegExp][] = [];

		for (const member of members.values()) {
			// Skip any member with more than 1 role
			if (member.roles.cache.size > 1) continue;

			for (const { regexp } of bannables.values()) {
				if (regexp.test(member.user.username)) {
					toBan.push([member, regexp]);
					break;
				}
			}
		}

		const bannableChunks = chunk(
			toBan.map(([member, regex]) => `${member.user.tag} \`(${member.user.id})\`\n└── Pattern: ${regex.source}`),
			10,
		);

		for (const banChunk of bannableChunks) {
			paginated.addPageEmbed((embed) =>
				embed.setTitle('Users that have no roles and match filters').setDescription(`- ${banChunk.join('\n- ')}`),
			);
		}

		await paginated.run(message);
	}
}
