import { Client, MessageEmbed } from 'discord.js';

export function createInfoEmbed(client: Client, message: string) {
	return new MessageEmbed()
		.setTitle(client.user!.username)
		.setDescription(message)
		.setTimestamp()
		.setColor(0x7671f0)
		.setFooter(client.user!.username, client.user!.displayAvatarURL({ size: 128 }));
}
