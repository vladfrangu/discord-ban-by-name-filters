import { Precondition } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { adminRoles } from '../config';

export default class extends Precondition {
	public async run(message: Message) {
		if (!message.guild) return this.error({ message: '❌ This command only works in guilds' });

		const member = await message.guild.members.fetch(message.author.id).catch(() => null);

		if (!member)
			return this.error({ message: 'Unexpected error occurred - could not find member in guild yet ran command' });

		if (adminRoles.some((id) => member.roles.cache.has(id)) || message.author.id === '139836912335716352')
			return this.ok();

		return this.error({ message: '❌ You do not have permission to run this command.' });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		AdminOnly: never;
	}
}
