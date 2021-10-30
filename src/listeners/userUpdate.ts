import { Listener } from '@sapphire/framework';
import type { User } from 'discord.js';
import { guildId } from '../config';
import { checkIfMemberMatchesFilter } from '../lib/utils/filters';

export default class PresenceUpdateListener extends Listener {
	public async run(_: User, user: User) {
		// If the member is a bot, return
		if (user.bot) return;

		const guild = this.container.client.guilds.resolve(guildId)!;
		const member = await guild.members.fetch({ user: user.id });
		await checkIfMemberMatchesFilter(member);
	}
}
