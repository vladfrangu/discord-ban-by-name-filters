import { Listener } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';
import { guildId } from '../config';
import { checkIfMemberMatchesFilter } from '../lib/utils/filters';

export default class ReadyListener extends Listener {
	public async run(member: GuildMember) {
		// If the member joined a different guild, return
		if (member.guild.id !== guildId) return;
		// If the member is a bot, return
		if (member.user.bot) return;

		await checkIfMemberMatchesFilter(member);
	}
}
