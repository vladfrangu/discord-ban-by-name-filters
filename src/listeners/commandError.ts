import { CommandDeniedPayload, Listener } from '@sapphire/framework';
import { UserError } from '../lib/extensions/UserError';
import { createInfoEmbed } from '../lib/utils/createInfoEmbed';

export default class extends Listener {
	public async run(error: Error | UserError, context: CommandDeniedPayload) {
		await context.message.channel.send({ embeds: [createInfoEmbed(this.container.client, error.message)] });
		if (!(error instanceof UserError)) this.container.logger.error(error.stack ?? (error.message || error));
	}
}
