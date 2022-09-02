import { Listener } from '@sapphire/framework';
import type { GuildTextBasedChannel, User } from 'discord.js';
import { guildId, userRenameChannelId } from '../config';
import { createInfoEmbed } from '../lib/utils/createInfoEmbed';
import { checkIfMemberMatchesFilter } from '../lib/utils/filters';

export default class PresenceUpdateListener extends Listener {
	public async run(oldUser: User, user: User) {
		// If the member is a bot, return
		if (user.bot) return;

		if (oldUser.username !== user.username) {
			const channel = this.container.client.channels.resolve(userRenameChannelId) as GuildTextBasedChannel | null;

			if (channel) {
				await channel.send({
					content: `User <@${user.id}>`,
					embeds: [
						createInfoEmbed(
							this.container.client,
							`User rename encountered for user ${user.tag} (\`${user.id}\`)`,
						).addFields([
							{ name: 'Old name', value: `${oldUser.username || '<UNKNOWN OLD USERNAME>'}`, inline: true },
							{ name: 'New name', value: `${user.username}`, inline: true },
						]),
					],
				});
			}
		}

		const guild = this.container.client.guilds.resolve(guildId)!;
		const member = await guild.members.fetch({ user: user.id });

		// If the member has roles, return
		if (member.roles.cache.size > 1) return;

		await checkIfMemberMatchesFilter(member);
	}
}
