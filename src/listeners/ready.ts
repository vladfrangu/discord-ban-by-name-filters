import { ApplyOptions } from '@sapphire/decorators';
import { Listener, ListenerOptions } from '@sapphire/framework';
import { cyanBright, green, magenta } from 'colorette';
import { existsSync } from 'fs';
import { ensureFile, writeJSON } from 'fs-extra';
import { guildId } from '../config';
import { loadAvatars } from '../lib/utils/avatarProcessing';
import { jsonFilePath, loadFilters } from '../lib/utils/filters';

@ApplyOptions<ListenerOptions>({
	once: true,
	event: 'ready',
})
export default class ReadyEvent extends Listener {
	public async run() {
		const { client } = this.container;
		const { guilds, user, logger, fetchPrefix } = client;

		[
			`Logged in as ${cyanBright(user!.tag)} (${green(user!.id)})`,
			`  Prefix: ${cyanBright(fetchPrefix(null as any) as string)}`,
		].forEach((item) => {
			logger.info(magenta(item));
		});

		await guilds.cache.get(guildId)!.members.fetch();

		// If file don't exist, make it
		if (!existsSync(jsonFilePath)) {
			await ensureFile(jsonFilePath);
			await writeJSON(jsonFilePath, []);
		}

		await loadFilters();
		await loadAvatars();
	}
}
