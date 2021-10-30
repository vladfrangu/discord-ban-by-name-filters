import '@sapphire/plugin-logger/register';

import { LogLevel } from '@sapphire/framework';
import { createColors } from 'colorette';
import { Intents } from 'discord.js';
import { inspect } from 'util';
import { prefix, token } from './config';
import { ExtendedClient } from './lib/ExtendedClient';

inspect.defaultOptions.depth = 2;
const colorette = createColors({ useColor: true });

const client = new ExtendedClient({
	restTimeOffset: 0,
	intents: new Intents([
		Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_PRESENCES,
		Intents.FLAGS.GUILDS,
	]),
	caseInsensitiveCommands: true,
	logger: {
		depth: 2,
		level: LogLevel.Debug,
	},
	fetchPrefix: () => prefix,
	loadDefaultErrorListeners: true,
});

client.login(token).catch((error) => {
	client.logger.error(colorette.red('Failed to launch the bot:'), error);
	void client.destroy();
});
