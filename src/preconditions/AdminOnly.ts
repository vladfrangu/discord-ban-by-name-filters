import { Precondition } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { adminRoles } from '../config';

const userIds = [
	// Vladdy#0002
	'139836912335716352',
	// Deko (US, CST)#0001
	'248678139465564160',
	// Kraken#8041
	'903074770403336212',
	// Shibasaur#1337
	'292721670404177920',
	// steptank#7425
	'102437975224225792',
	// Stixil#0897
	'477956583159234570',
	// Trophias#0001
	'85185381837836288',
	// Atomical (UK, GMT+0)#4725
	'372900980779515904',
];

export default class extends Precondition {
	public async run(message: Message) {
		if (!message.guild) return this.error({ message: '❌ This command only works in guilds' });

		const member = await message.guild.members.fetch(message.author.id).catch(() => null);

		if (!member)
			return this.error({ message: 'Unexpected error occurred - could not find member in guild yet ran command' });

		if (adminRoles.some((id) => member.roles.cache.has(id)) || userIds.includes(message.author.id)) return this.ok();

		return this.error({ message: '❌ You do not have permission to run this command.' });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		AdminOnly: never;
	}
}
