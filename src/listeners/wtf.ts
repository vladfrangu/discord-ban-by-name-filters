import { ApplyOptions } from '@sapphire/decorators';
import { Listener, ListenerOptions } from '@sapphire/framework';
import { red } from 'colorette';

@ApplyOptions<ListenerOptions>({ event: 'wtf' })
export default class WtfListener extends Listener {
	public run(message: Error | string) {
		this.container.logger.warn(red('Encountered unexpected error'), message);
	}
}
