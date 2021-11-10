import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptions, isOk } from '@sapphire/framework';
import { Constants, GuildMember, Message, MessageActionRow, MessageAttachment, MessageButton, Util } from 'discord.js';
import { chunk } from '@sapphire/utilities';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import { fetch, FetchResultTypes } from '@sapphire/fetch';
import { createInfoEmbed } from '../../lib/utils/createInfoEmbed';
import { checkAvatar, loadedAvatars } from '../../lib/utils/avatarProcessing';
import { Time } from '@sapphire/time-utilities';
import { setTimeout } from 'timers/promises';

@ApplyOptions<CommandOptions>({
	description: 'Processes all members that match the current filters',
	preconditions: ['AdminOnly'],
})
export default class extends Command {
	public async messageRun(message: Message) {
		if (!loadedAvatars.size) {
			return message.channel.send({
				embeds: [createInfoEmbed(this.container.client, 'There are no registered avatars to check.')],
			});
		}

		const members = (await message.guild!.members.fetch()).sorted((a, b) => b.joinedTimestamp! - a.joinedTimestamp!);

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

					void (async () => {
						const signOffMessage = await response.channel.send({
							components: [
								new MessageActionRow().addComponents(
									new MessageButton().setCustomId('signOff-ban').setStyle('DANGER').setLabel('Sign Off ban'),
								),
							],
							embeds: [
								createInfoEmbed(
									this.container.client,
									'You need 2 more people to sign off this ban. They can click the button below to sign.',
								),
							],
						});

						const signedOffBy: string[] = [];

						const collector = signOffMessage.createMessageComponentCollector({
							componentType: 'BUTTON',
							filter: async (interaction) => {
								if (interaction.user.id === message.author.id || interaction.customId !== 'signOff-ban') {
									await interaction.reply({ ephemeral: true, content: "This maze wasn't meant for you." });
									return false;
								}

								const preconditionResult = await this.container.stores
									.get('preconditions')
									.get('AdminOnly')!
									.run(
										{
											guild: message.guild,
											author: interaction.user,
										} as unknown as Message,
										this,
										{},
									);

								return isOk(preconditionResult);
							},
							idle: 60_000,
						});

						collector.on('collect', async (button) => {
							if (signedOffBy.includes(button.user.tag)) {
								await button.reply({ content: 'You signed off this ban already', ephemeral: true });
								return;
							}

							signedOffBy.push(button.user.tag);
							await button.reply({ content: `${button.user.tag} signed off this ban` });
							if (signedOffBy.length !== 2) {
								return;
							}

							collector.stop('manual');

							// Remove components
							await signOffMessage.edit({
								components: [],
								content: 'Ban processing...',
								embeds: [],
							});

							const bannedMembers = [];
							const ids = [];
							const failedToBan = [];

							for (const [member, avatarName] of toBan) {
								await response.channel.sendTyping();
								try {
									bannedMembers.push(
										`JOINED AT: ${member.joinedAt!.toISOString()}; TAG: ${member.user.tag}; ID: ${member.user.id}`,
									);
									ids.push(member.user.id);
									await member.ban({ reason: `Avatar matched: ${avatarName}` });
								} catch (err) {
									this.container.logger.warn('Failed to ban member', err);
									bannedMembers.pop();
									ids.pop();
									failedToBan.push(
										`FAILED TO BAN: ${member.user.tag}; ID: ${member.user.id}; ERROR: ${(err as Error).message}`,
									);
								}
							}

							await response.channel.send({
								content: [
									'All users have been banned',
									'',
									`Signed Off by ${message.author.tag}, ${signedOffBy.join(', ')}`,
								].join('\n'),
								embeds: [],
							});

							const finalText = [
								`BAN REPORT - ${new Date().toISOString()}`,
								'',
								'BANNED MEMBERS',
								...bannedMembers,
								'',
								'BANNED IDS',
								...ids,
							];

							if (failedToBan.length) {
								finalText.push('', 'FAILED TO BAN', ...failedToBan);
							}

							await response.channel.send({
								files: [new MessageAttachment(Buffer.from(finalText.join('\n')), 'ban-report.txt')],
							});
						});

						collector.on('end', async (_, reason) => {
							if (reason !== 'manual') {
								await signOffMessage.edit({
									content: 'Ban request timed out',
									embeds: [],
									components: [],
								});
							}
						});
					})();
				},
			},
		]);

		let currentMember = 1;

		const progressStatus = await message.channel.send({
			embeds: [
				createInfoEmbed(
					this.container.client,
					`Processing member avatars, this might take a while...\n\nProgress: ${currentMember.toLocaleString()} / ${members.size.toLocaleString()}`,
				),
			],
		});

		const toBan: [member: GuildMember, avatarName: string, matchPercent: string][] = [];

		const sixHoursAgo = Date.now() - Time.Hour * 6;

		for (const member of members.values()) {
			currentMember++;

			// Skip any member with more than 1 role
			if (member.roles.cache.size > 1) continue;
			// If a member has no avatar, skip them
			if (!member.user.avatar) continue;
			// If the member didn't join in the past 6 hours, skip them
			if (member.joinedTimestamp! < sixHoursAgo) break;

			if (currentMember % 10 === 0) {
				await progressStatus.edit({
					embeds: [
						createInfoEmbed(
							this.container.client,
							`Processing member avatars, this might take a while...\n\nProgress: ${currentMember.toLocaleString()} / ${members.size.toLocaleString()}\n\nMatched members: **${toBan.length.toLocaleString()}**`,
						),
					],
				});
				await message.channel.sendTyping();
			}

			try {
				// Fetch the user's avatar
				const buffer = await fetch(
					member.user.avatarURL({ format: 'png', size: 128 })!,
					{
						headers: {
							'User-Agent': 'Ban Members by Name / Avatar (https://github.com/vladfrangu/discord-ban-by-name-filters);',
						},
					},
					FetchResultTypes.Buffer,
				);

				const checkResult = await checkAvatar(buffer);

				if (checkResult.matched) {
					toBan.push([member, checkResult.avatarName, checkResult.matchPercentage]);
				}

				// Discord senpai don't ratelimit us pls
				// eslint-disable-next-line @typescript-eslint/no-implied-eval
				await setTimeout(1500);
			} catch {
				// Failed to fetch avatar .w.
				continue;
			}
		}

		await progressStatus.delete();

		const bannableChunks = chunk(
			toBan.map(
				([member, avatarName, matchPercentage]) =>
					`${member.user.toString()} - ${Util.escapeMarkdown(member.user.tag)} \`(${
						member.user.id
					})\`\n├── Joined at: ${member.joinedAt!.toUTCString()}\n├── Matched avatar: ${avatarName}\n└── Match %: **${matchPercentage}**`,
			),
			10,
		);

		for (const banChunk of bannableChunks) {
			paginated.addPageContent(
				[
					'**Users that have no roles, joined in the last 6 hours and match avatars**',
					'',
					`- ${banChunk.join('\n- ')}`,
					'',
					`In total, **${toBan.length}** members will be banned`,
				].join('\n'),
			);
		}

		if (paginated.pages.length === 1) {
			paginated.addPageContent(
				[
					'**Users that have no roles, joined in the last 6 hours and match avatars**',
					'',
					`In total, **${toBan.length}** members will be banned`,
				].join('\n'),
			);
		}

		await paginated.run(message);

		return null;
	}
}
