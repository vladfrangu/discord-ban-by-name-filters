import { container } from '@sapphire/framework';
import remove from 'confusables';
import { randomBytes } from 'crypto';
import { Collection, GuildMember, TextChannel, Util } from 'discord.js';
import { readJSON, writeJSON } from 'fs-extra';
import { join } from 'path';
import { logChannelId } from '../../config';
import { createInfoEmbed } from './createInfoEmbed';

export const jsonFilePath = join(__dirname, '..', '..', '..', 'data', 'patterns.json');

export const filters = new Collection<
	string,
	{
		regexp: RegExp;
		shouldBan: boolean;
	}
>();

export async function addFilter(pattern: string) {
	if (filters.some((item) => item.regexp.source === pattern)) return false;

	filters.set(randomBytes(16).toString('hex'), {
		regexp: new RegExp(`\\b${pattern}\\b`, 'i'),
		shouldBan: true,
	});

	filters.set(randomBytes(16).toString('hex'), {
		regexp: new RegExp(pattern, 'gi'),
		shouldBan: false,
	});

	await updateJSON();

	return true;
}

export async function removeFilter(pattern: string) {
	if (!filters.some((item) => item.regexp.source === pattern)) return false;

	const baddies = filters.filter((item) => item.regexp.source.includes(pattern));

	for (const id of baddies.keys()) {
		filters.delete(id);
	}

	await updateJSON();

	return true;
}

export async function checkIfMemberMatchesFilter(member: GuildMember) {
	const cleanUsername = remove(member.user.username);

	for (const patternData of filters.values()) {
		if (patternData.regexp.test(cleanUsername)) {
			if (patternData.shouldBan) {
				await member.ban({ reason: `Name filter matched: ${patternData.regexp.source}` });
				await logToChannel(member, patternData.regexp.source, true);
			} else {
				await logToChannel(member, patternData.regexp.source, false);
			}
			break;
		}
	}
}

export async function logToChannel(member: GuildMember, pattern: string, shouldBan: boolean) {
	const channel = container.client.channels.cache.get(logChannelId) as TextChannel;

	await channel.send({
		content: member.user.toString(),
		embeds: [
			createInfoEmbed(
				container.client,
				shouldBan
					? `I have banned member ${member.user.tag} (${member.user.id})`
					: `I think member ${member.user.tag} (${member.user.id}) might be bannable`,
			)
				.addField('Pattern matched', Util.escapeMarkdown(pattern))
				.addField('Joined at', member.joinedAt!.toISOString())
				.setColor(shouldBan ? 'RED' : 'YELLOW')
				.setThumbnail(member.displayAvatarURL()),
		],
		// TODO: add ban button to embeds
		components: shouldBan ? [] : [],
		allowedMentions: { parse: [] },
	});
}

export async function loadFilters() {
	const loaded: JSONData[] = await readJSON(jsonFilePath);

	for (const pattern of loaded) {
		filters.set(randomBytes(16).toString('hex'), {
			regexp: new RegExp(pattern.rawPattern, pattern.shouldBan ? 'i' : 'gi'),
			shouldBan: pattern.shouldBan,
		});
	}

	filters.sort((_, b) => (b.shouldBan ? 1 : -1));
}

export async function updateJSON() {
	await writeJSON(
		jsonFilePath,
		[...filters.values()].map((entry) => ({
			rawPattern: entry.regexp.source,
			shouldBan: entry.shouldBan,
		})),
	);
}

export interface JSONData {
	rawPattern: string;
	shouldBan: boolean;
}
