import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptions, isOk } from '@sapphire/framework';
import { Constants, GuildMember, Message, MessageActionRow, MessageAttachment, MessageButton, Util } from 'discord.js';
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
							if (signedOffBy.length < 2) {
								await button.reply({ content: 'You signed off this ban' });
								return;
							}

							collector.stop('manual');

							// Remove components
							await button.update({
								components: [],
								content: 'Ban processing...',
							});

							const bannedMembers = [];
							const ids = [];
							const failedToBan = [];

							for (const [member, regexp] of toBan) {
								await response.channel.sendTyping();
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

							await signOffMessage.edit({
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
								'BANNED IDs',
								...ids,
								'',
								'FAILED TO BAN',
								...failedToBan,
							].join('\n');

							await response.channel.send({
								files: [new MessageAttachment(Buffer.from(finalText), 'ban-report.txt')],
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
			toBan.map(
				([member, regex]) =>
					`${member.user.toString()} - ${Util.escapeMarkdown(member.user.tag)} \`(${
						member.user.id
					})\`\n├── Joined at: ${member.joinedAt!.toUTCString()}\n└── Pattern: ${regex.source}`,
			),
			10,
		);

		for (const banChunk of bannableChunks) {
			paginated.addPageContent(
				[
					'**Users that have no roles and match filters**',
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
					'**Users that have no roles and match filters**',
					'',
					`In total, **${toBan.length}** members will be banned`,
				].join('\n'),
			);
		}

		await paginated.run(message);
	}
}
